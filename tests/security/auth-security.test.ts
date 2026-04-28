import { scryptSync } from "crypto";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import assert from "node:assert/strict";
import test, { after } from "node:test";

let tempDir: string | null = null;

async function ensureTempDir() {
  if (!tempDir) {
    tempDir = await mkdtemp(path.join(tmpdir(), "devcandoit-security-"));
  }

  return tempDir;
}

async function configureSecurityEnv() {
  const dir = await ensureTempDir();
  process.env.NODE_ENV = "test";
  process.env.AUTH_STATE_DATABASE_URL = `file:${path.join(dir, "auth-state.db")}`;
  delete process.env.AUTH_STATE_DATABASE_AUTH_TOKEN;
  process.env.ADMIN_USERNAME = "admin";
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:7261";
  process.env.TRUSTED_MUTATION_ORIGINS = "http://localhost:7261,https://devcandoit.com";
  process.env.TILEOS_INTERNAL_URL = "https://tileos.internal";
  process.env.TILEOS_PROXY_SHARED_SECRET = "tileos-proxy-secret";
  process.env.TRADING_ALERTS_INTERNAL_URL = "https://trading-alerts.internal";
  process.env.TRADING_ALERTS_PROXY_SHARED_SECRET = "trading-alerts-proxy-secret";
  process.env.VENUS_GATE_USERNAME = "venus";
  process.env.VENUS_GATE_PASSWORD_SALT = "venus-salt";
  process.env.VENUS_GATE_PASSWORD_HASH = scryptSync("venus-password", "venus-salt", 64).toString("hex");
  delete process.env.VENUS_GATE_PASSWORD;
}

async function getModules() {
  await configureSecurityEnv();
  const authState = await import("../../src/lib/auth-state.ts");
  authState.__resetAuthStateForTests();

  const adminAuth = await import("../../src/lib/admin-auth.ts");
  const requestSecurity = await import("../../src/lib/request-security.ts");
  const fileValidation = await import("../../src/lib/file-validation.ts");
  const tileosProxy = await import("../../src/lib/tileos-public-proxy.ts");
  const tradingAlertsProxy = await import("../../src/lib/trading-alerts-proxy.ts");
  const venusAccess = await import("../../src/lib/venus-access.ts");
  const venusAuth = await import("../../src/lib/venus-auth.ts");

  return {
    adminAuth,
    authState,
    fileValidation,
    requestSecurity,
    tileosProxy,
    tradingAlertsProxy,
    venusAccess,
    venusAuth,
  };
}

function buildRequest(headers: HeadersInit = {}) {
  return {
    headers: new Headers(headers),
    nextUrl: new URL("http://localhost:7261/test"),
  } as never;
}

function buildAuthorizedRequest(args?: {
  authorization?: string;
  cookies?: Record<string, string>;
  headers?: HeadersInit;
}) {
  const cookieEntries = new Map(Object.entries(args?.cookies || {}));
  return {
    cookies: {
      get(name: string) {
        const value = cookieEntries.get(name);
        return value ? { value } : undefined;
      },
    },
    headers: new Headers({
      ...(args?.headers || {}),
      ...(args?.authorization ? { authorization: args.authorization } : {}),
    }),
    nextUrl: new URL("http://localhost:7261/test"),
  } as never;
}

test("admin sessions are revoked immediately on logout", async () => {
  const { adminAuth } = await getModules();

  const token = await adminAuth.issueAdminSessionToken("admin");
  assert.equal(await adminAuth.verifyAdminSessionToken(token), true);

  await adminAuth.revokeAdminSessionToken(token);
  assert.equal(await adminAuth.verifyAdminSessionToken(token), false);
});

test("expired sessions fail verification", async () => {
  const { authState } = await getModules();

  const session = await authState.createAuthSession({
    scope: "admin",
    subject: "admin",
    ttlMs: 1,
  });

  await new Promise((resolve) => setTimeout(resolve, 10));

  const verified = await authState.verifyAuthSessionToken(session.token, {
    scope: "admin",
    subject: "admin",
  });

  assert.equal(verified, null);
});

test("session verification fails closed when auth state storage is unavailable", async () => {
  await configureSecurityEnv();
  const authState = await import("../../src/lib/auth-state.ts");
  authState.__resetAuthStateForTests();

  const originalNodeEnv = process.env.NODE_ENV;
  const originalAuthDbUrl = process.env.AUTH_STATE_DATABASE_URL;

  process.env.NODE_ENV = "production";
  delete process.env.AUTH_STATE_DATABASE_URL;

  try {
    const verified = await authState.verifyAuthSessionToken("opaque-token", {
      scope: "admin",
      subject: "admin",
    });

    assert.equal(verified, null);
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
    if (typeof originalAuthDbUrl === "string") {
      process.env.AUTH_STATE_DATABASE_URL = originalAuthDbUrl;
    } else {
      delete process.env.AUTH_STATE_DATABASE_URL;
    }
    authState.__resetAuthStateForTests();
  }
});

test("persistent rate limits survive module resets", async () => {
  const { authState, requestSecurity } = await getModules();
  const request = buildRequest({
    origin: "http://localhost:7261",
    "x-forwarded-for": "203.0.113.5",
  });

  const first = await requestSecurity.assertRateLimit(request, "security-test", {
    limit: 1,
    windowMs: 60_000,
  });
  assert.equal(first.ok, true);

  authState.__resetAuthStateForTests();

  const reloadedRequestSecurity = await import("../../src/lib/request-security.ts");
  const second = await reloadedRequestSecurity.assertRateLimit(request, "security-test", {
    limit: 1,
    windowMs: 60_000,
  });
  assert.equal(second.ok, false);
});

test("origin enforcement uses exact origins only", async () => {
  const { requestSecurity } = await getModules();

  assert.equal(
    requestSecurity.assertAllowedOrigin(
      buildRequest({
        origin: "https://devcandoit.com",
      }),
    ),
    true,
  );

  assert.equal(
    requestSecurity.assertAllowedOrigin(
      buildRequest({
        origin: "https://sub.devcandoit.com",
      }),
    ),
    false,
  );
});

test("file validation rejects renamed text files and accepts valid pngs", async () => {
  const { fileValidation } = await getModules();
  const dir = await ensureTempDir();

  const fakeImagePath = path.join(dir, "fake.png");
  const fakeVideoPath = path.join(dir, "fake.mp4");
  const validPngPath = path.join(dir, "valid.png");

  await writeFile(fakeImagePath, "hello world");
  await writeFile(fakeVideoPath, "hello world");
  await writeFile(
    validPngPath,
    Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+Xb1cAAAAASUVORK5CYII=", "base64"),
  );

  await assert.rejects(
    () =>
      fileValidation.validateUploadedFilePath({
        contentType: "image/png",
        fileName: "fake.png",
        filePath: fakeImagePath,
        kind: "image",
      }),
    /does not match the expected file type/u,
  );

  await assert.rejects(
    () =>
      fileValidation.validateUploadedFilePath({
        contentType: "video/mp4",
        fileName: "fake.mp4",
        filePath: fakeVideoPath,
        kind: "video",
      }),
    /does not match the expected file type/u,
  );

  const validImage = await fileValidation.validateUploadedFilePath({
    contentType: "image/png",
    fileName: "valid.png",
    filePath: validPngPath,
    kind: "image",
  });
  assert.equal(validImage.contentType, "image/png");
});

test("venus private authorization accepts admin, venus web, and venus sync auth", async () => {
  const { adminAuth, venusAccess, venusAuth } = await getModules();

  const adminToken = await adminAuth.issueAdminSessionToken("admin");
  const venusWebToken = await venusAuth.issueVenusSessionToken("venus");
  const venusSyncToken = await venusAuth.issueVenusDesktopSyncToken("venus");

  assert.equal(await venusAccess.isVenusAuthorizedRequest(buildAuthorizedRequest()), false);
  assert.equal(
    await venusAccess.isVenusAuthorizedRequest(
      buildAuthorizedRequest({
        cookies: {
          [adminAuth.ADMIN_COOKIE_NAME]: adminToken,
        },
      }),
    ),
    true,
  );
  assert.equal(
    await venusAccess.isVenusAuthorizedRequest(
      buildAuthorizedRequest({
        cookies: {
          [venusAuth.VENUS_COOKIE_NAME]: venusWebToken,
        },
      }),
    ),
    true,
  );
  assert.equal(
    await venusAccess.isVenusAuthorizedRequest(
      buildAuthorizedRequest({
        authorization: `Bearer ${venusSyncToken}`,
      }),
    ),
    true,
  );
});

test("TileOS public proxy strips browser headers and forwards only the shared secret", async () => {
  const { tileosProxy } = await getModules();
  const request = buildRequest({
    accept: "application/json",
    cookie: "session=abc123",
    origin: "https://devcandoit.com",
    referer: "https://devcandoit.com/tileos",
    "user-agent": "SecurityTest/1.0",
    "x-forwarded-for": "198.51.100.10",
  });

  const originalFetch = global.fetch;
  let capturedHeaders: Headers | null = null;

  global.fetch = (async (_input: URL | RequestInfo, init?: RequestInit) => {
    capturedHeaders = new Headers(init?.headers);
    return new Response(JSON.stringify({ ok: true }), {
      headers: {
        "Content-Type": "application/json",
      },
      status: 200,
    });
  }) as typeof fetch;

  try {
    const response = await tileosProxy.forwardTileOSPublicJson({
      body: { prompt: "Draw a launch screen" },
      method: "POST",
      request,
      upstreamPath: "/api/public/drafts",
    });
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(payload, { ok: true });
    assert.ok(capturedHeaders);
    assert.equal(capturedHeaders?.get("x-devcandoit-proxy-key"), "tileos-proxy-secret");
    assert.equal(capturedHeaders?.get("user-agent"), "SecurityTest/1.0");
    assert.equal(capturedHeaders?.get("cookie"), null);
    assert.equal(capturedHeaders?.get("origin"), null);
    assert.equal(capturedHeaders?.get("referer"), null);
    assert.equal(capturedHeaders?.get("x-forwarded-for"), null);
  } finally {
    global.fetch = originalFetch;
  }
});

test("Trading Alerts proxy preserves callback queries, strips browser headers, and rewrites local redirects", async () => {
  const { tradingAlertsProxy } = await getModules();
  const request = buildRequest({
    accept: "text/html",
    cookie: "session=abc123",
    origin: "https://devcandoit.com",
    referer: "https://devcandoit.com/tradingalerts/settings/calendar",
    "user-agent": "SecurityTest/1.0",
    "x-forwarded-for": "198.51.100.10",
  }) as {
    headers: Headers;
    method: string;
    nextUrl: URL;
  };
  request.method = "GET";
  request.nextUrl = new URL("https://devcandoit.com/tradingalerts/api/google/callback?code=abc&state=xyz");

  const originalFetch = global.fetch;
  let capturedUrl: string | null = null;
  let capturedHeaders: Headers | null = null;

  global.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedHeaders = new Headers(init?.headers);
    return new Response("", {
      headers: {
        Location: "/settings/calendar?connected=1",
      },
      status: 302,
    });
  }) as typeof fetch;

  try {
    const response = await tradingAlertsProxy.forwardTradingAlertsRequest({
      pathSegments: ["api", "google", "callback"],
      request: request as never,
    });

    assert.equal(response.status, 302);
    assert.equal(capturedUrl, "https://trading-alerts.internal/api/google/callback?code=abc&state=xyz");
    assert.ok(capturedHeaders);
    assert.equal(capturedHeaders?.get("x-devcandoit-proxy-key"), "trading-alerts-proxy-secret");
    assert.equal(capturedHeaders?.get("x-forwarded-prefix"), "/tradingalerts");
    assert.equal(capturedHeaders?.get("user-agent"), "SecurityTest/1.0");
    assert.equal(capturedHeaders?.get("cookie"), null);
    assert.equal(capturedHeaders?.get("origin"), null);
    assert.equal(capturedHeaders?.get("referer"), null);
    assert.equal(capturedHeaders?.get("x-forwarded-for"), null);
    assert.equal(response.headers.get("location"), "/tradingalerts/settings/calendar?connected=1");
  } finally {
    global.fetch = originalFetch;
  }
});

after(async () => {
  if (tempDir) {
    await rm(tempDir, { force: true, recursive: true });
  }
});
