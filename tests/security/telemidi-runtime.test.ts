import assert from "node:assert/strict";
import test from "node:test";

import {
  __resetTelemidiRuntimeForTests,
  buildStaticTelemidiFallbackRuntime,
  buildTelemidiRuntime,
  injectTelemidiRuntime,
  parseTelemidiFirebaseWebConfig,
  serializeTelemidiRuntimeAssignment,
} from "../../src/lib/telemidi-runtime.ts";

test("TeleMIDI runtime falls back to manual setup when no env config is provided", () => {
  __resetTelemidiRuntimeForTests();

  const runtime = buildTelemidiRuntime({ rawFirebaseConfig: "" });

  assert.equal(runtime.firebaseConfig, null);
  assert.equal(runtime.features.manualFirebaseSetup, true);
});

test("TeleMIDI runtime parses valid Firebase web config from env JSON", () => {
  const config = parseTelemidiFirebaseWebConfig(
    JSON.stringify({
      apiKey: "AIzaSyExample",
      appId: "1:123:web:abc",
      authDomain: "demo.firebaseapp.com",
      measurementId: "G-123456",
      messagingSenderId: "123",
      projectId: "demo-project",
      storageBucket: "demo.appspot.com",
    }),
  );

  assert.equal(config.apiKey, "AIzaSyExample");
  assert.equal(config.projectId, "demo-project");
  assert.equal(config.measurementId, "G-123456");
});

test("TeleMIDI runtime script escapes HTML-sensitive characters", () => {
  const assignment = serializeTelemidiRuntimeAssignment({
    basePath: "/telemidi-connect",
    features: {
      manualFirebaseSetup: false,
    },
    firebaseConfig: {
      apiKey: "<unsafe>",
      appId: "1:123:web:abc",
      authDomain: "demo.firebaseapp.com",
      messagingSenderId: "123",
      projectId: "demo-project",
    },
    sessionApiBase: "/api/telemidi/session",
  });

  assert.match(assignment, /\\u003cunsafe\\u003e/u);
  assert.doesNotMatch(assignment, /<unsafe>/u);
});

test("TeleMIDI runtime injection replaces committed runtime with the env-backed version", () => {
  const html = `<!doctype html><html><body><script>window.__TELEMIDI_RUNTIME__ = {"firebaseConfig":null,"features":{"manualFirebaseSetup":true}};</script></body></html>`;
  const injected = injectTelemidiRuntime(html, buildTelemidiRuntime({
    rawFirebaseConfig: JSON.stringify({
      apiKey: "AIzaSyInjected",
      appId: "1:123:web:abc",
      authDomain: "demo.firebaseapp.com",
      messagingSenderId: "123",
      projectId: "demo-project",
    }),
  }));

  assert.match(injected, /AIzaSyInjected/u);
  assert.match(injected, /"manualFirebaseSetup":false/u);
});

test("Static TeleMIDI fallback runtime stays scrubbed for committed HTML", () => {
  const runtime = buildStaticTelemidiFallbackRuntime();

  assert.equal(runtime.firebaseConfig, null);
  assert.equal(runtime.features.manualFirebaseSetup, true);
});
