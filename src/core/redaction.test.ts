import assert from "node:assert/strict";
import { test } from "node:test";
import { redactSensitiveText } from "./redaction.js";

test("redaction removes assignments, bearer credentials, and known token formats", () => {
  const input = [
    "+API_KEY=super-secret-value",
    '"password": "hunter2",',
    "Authorization: Bearer abcdefghijklmnop",
    "token sk-abcdefghijklmnopqrstuvwxyz",
    "ordinary diagnostic text"
  ].join("\n");
  const output = redactSensitiveText(input);
  assert.doesNotMatch(output, /super-secret-value|hunter2|abcdefghijklmnop|sk-abcdefghijklmnopqrstuvwxyz/);
  assert.match(output, /API_KEY=\[REDACTED\]/);
  assert.match(output, /ordinary diagnostic text/);
});

test("redaction removes multiline private keys", () => {
  const output = redactSensitiveText("before\n-----BEGIN PRIVATE KEY-----\nsecret-data\n-----END PRIVATE KEY-----\nafter");
  assert.equal(output, "before\n[REDACTED PRIVATE KEY]\nafter");
});
