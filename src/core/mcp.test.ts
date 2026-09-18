import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { handleMcpRequest } from "./mcp.js";

test("MCP initializes and lists read-only tools", async () => {
  const initialized = await handleMcpRequest({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } });
  assert.equal((initialized?.result as Record<string, unknown>).protocolVersion, "2025-06-18");
  const listed = await handleMcpRequest({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  const result = listed?.result as { tools: Array<{ name: string; annotations: { readOnlyHint: boolean } }> };
  assert.deepEqual(result.tools.map((tool) => tool.name), ["plan_task", "project_summary", "skills_list", "skill_audit"]);
  assert.equal(result.tools.every((tool) => tool.annotations.readOnlyHint), true);
});

test("MCP plan_task returns deterministic plan content", async () => {
  const response = await handleMcpRequest({
    jsonrpc: "2.0",
    id: "plan",
    method: "tools/call",
    params: { name: "plan_task", arguments: { task: "fix the failing auth test" } },
  });
  const result = response?.result as { content: Array<{ text: string }>; isError?: boolean };
  assert.equal(result.isError, undefined);
  assert.match(result.content[0]?.text ?? "", /fix the failing auth test/);
});

test("MCP project_summary stays inside the server working directory", async () => {
  const root = await mkdtemp(join(tmpdir(), "codex-butler-mcp-"));
  try {
    await writeFile(join(root, "package.json"), JSON.stringify({ scripts: { test: "node --test" } }), "utf8");
    const accepted = await handleMcpRequest({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "project_summary", arguments: {} } }, root);
    assert.equal((accepted?.result as { isError?: boolean }).isError, undefined);
    const rejected = await handleMcpRequest({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "project_summary", arguments: { path: "../" } } }, root);
    assert.equal((rejected?.result as { isError?: boolean }).isError, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("MCP returns protocol errors for invalid requests and unknown methods", async () => {
  const invalid = await handleMcpRequest({ id: 1, method: "ping" });
  assert.equal((invalid?.error as { code: number }).code, -32600);
  const unknown = await handleMcpRequest({ jsonrpc: "2.0", id: 2, method: "unknown" });
  assert.equal((unknown?.error as { code: number }).code, -32601);
});
