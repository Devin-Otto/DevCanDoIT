const TELEMIDI_BASE_PATH = "/telemidi-connect";
const TELEMIDI_SESSION_API_BASE = "/api/telemidi/session";
const RUNTIME_ASSIGNMENT_PATTERN = /window\.__TELEMIDI_RUNTIME__\s*=\s*\{[\s\S]*?\};/u;

type TelemidiFirebaseWebConfig = {
  apiKey: string;
  appId: string;
  authDomain: string;
  measurementId?: string;
  messagingSenderId: string;
  projectId: string;
  storageBucket?: string;
};

type TelemidiRuntime = {
  basePath: string;
  features: {
    manualFirebaseSetup: boolean;
  };
  firebaseConfig: TelemidiFirebaseWebConfig | null;
  sessionApiBase: string;
};

let warnedInvalidTelemidiWebConfig = false;

function serializeRuntimeJson(value: unknown) {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/gu, (match) => {
    switch (match) {
      case "<":
        return "\\u003c";
      case ">":
        return "\\u003e";
      case "&":
        return "\\u0026";
      case "\u2028":
        return "\\u2028";
      case "\u2029":
        return "\\u2029";
      default:
        return match;
    }
  });
}

function normalizeStringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function logInvalidTelemidiWebConfig(error: unknown) {
  if (warnedInvalidTelemidiWebConfig) {
    return;
  }

  warnedInvalidTelemidiWebConfig = true;
  console.error("[telemidi] TELEMIDI_FIREBASE_WEB_CONFIG_JSON is invalid; falling back to manual setup.", error);
}

export function parseTelemidiFirebaseWebConfig(raw: string): TelemidiFirebaseWebConfig {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("TELEMIDI_FIREBASE_WEB_CONFIG_JSON must be valid JSON.");
  }

  const config: TelemidiFirebaseWebConfig = {
    apiKey: normalizeStringField(parsed.apiKey),
    appId: normalizeStringField(parsed.appId),
    authDomain: normalizeStringField(parsed.authDomain),
    measurementId: normalizeStringField(parsed.measurementId) || undefined,
    messagingSenderId: normalizeStringField(parsed.messagingSenderId),
    projectId: normalizeStringField(parsed.projectId),
    storageBucket: normalizeStringField(parsed.storageBucket) || undefined,
  };

  if (!config.apiKey || !config.appId || !config.authDomain || !config.messagingSenderId || !config.projectId) {
    throw new Error(
      "TELEMIDI_FIREBASE_WEB_CONFIG_JSON must include apiKey, authDomain, projectId, messagingSenderId, and appId.",
    );
  }

  return config;
}

export function readTelemidiFirebaseWebConfig(raw = process.env.TELEMIDI_FIREBASE_WEB_CONFIG_JSON?.trim()) {
  if (!raw) {
    return null;
  }

  return parseTelemidiFirebaseWebConfig(raw);
}

export function buildTelemidiRuntime(options?: { rawFirebaseConfig?: string | null | undefined }): TelemidiRuntime {
  let firebaseConfig: TelemidiFirebaseWebConfig | null = null;

  try {
    firebaseConfig = readTelemidiFirebaseWebConfig(options?.rawFirebaseConfig ?? undefined);
  } catch (error) {
    logInvalidTelemidiWebConfig(error);
    firebaseConfig = null;
  }

  return {
    basePath: TELEMIDI_BASE_PATH,
    features: {
      manualFirebaseSetup: firebaseConfig === null,
    },
    firebaseConfig,
    sessionApiBase: TELEMIDI_SESSION_API_BASE,
  };
}

export function buildStaticTelemidiFallbackRuntime(): TelemidiRuntime {
  return {
    basePath: TELEMIDI_BASE_PATH,
    features: {
      manualFirebaseSetup: true,
    },
    firebaseConfig: null,
    sessionApiBase: TELEMIDI_SESSION_API_BASE,
  };
}

export function serializeTelemidiRuntimeAssignment(runtime: TelemidiRuntime) {
  return `window.__TELEMIDI_RUNTIME__ = ${serializeRuntimeJson(runtime)};`;
}

export function injectTelemidiRuntime(html: string, runtime = buildTelemidiRuntime()) {
  const runtimeAssignment = serializeTelemidiRuntimeAssignment(runtime);

  if (RUNTIME_ASSIGNMENT_PATTERN.test(html)) {
    return html.replace(RUNTIME_ASSIGNMENT_PATTERN, runtimeAssignment);
  }

  const runtimeScript = `<script>\n${runtimeAssignment}\n</script>`;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${runtimeScript}\n</body>`);
  }

  return `${html}\n${runtimeScript}`;
}

export function scrubCommittedTelemidiRuntime(html: string) {
  return injectTelemidiRuntime(html, buildStaticTelemidiFallbackRuntime());
}

export function __resetTelemidiRuntimeForTests() {
  warnedInvalidTelemidiWebConfig = false;
}
