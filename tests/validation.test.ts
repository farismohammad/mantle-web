import { describe, expect, it } from "vitest";
import { formatAgentYaml, validateAgentYaml } from "@/domain/validation";

const valid = `mantle: "0.1"
agent:
  name: test-agent
  description: Test
runtime:
  name: pi
  version: latest
model:
  provider: openai
  name: gpt-5.6
resources:
  skills: []
  packages: []
permissions:
  filesystem: all
  shell: all
secrets:
  - OPENAI_API_KEY
`;

describe("shared agent schema validation", () => {
  it("accepts and formats a valid agent definition", () => {
    expect(validateAgentYaml(valid)).toMatchObject({ valid: true });
    expect(formatAgentYaml(valid)).toContain("name: test-agent");
  });

  it("reports malformed YAML with a location", () => {
    const result = validateAgentYaml("agent: [\n");
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.issues[0]).toMatchObject({ code: "yaml", line: 2 });
  });

  it("rejects schema errors and mismatched route names", () => {
    const invalid = validateAgentYaml(
      valid.replace("name: pi", "name: python"),
    );
    expect(invalid.valid).toBe(false);
    const mismatch = validateAgentYaml(valid, "another-agent");
    expect(mismatch.valid).toBe(false);
    if (!mismatch.valid) expect(mismatch.issues[0].path).toBe("agent.name");
  });
});

it("normalizes omitted CLI defaults without rewriting source YAML", () => {
  const result = validateAgentYaml(
    "agent: {name: minimal}\nruntime: {}\nresources: {}\n",
  );
  expect(result).toMatchObject({
    valid: true,
    config: {
      mantle: "0.1",
      agent: { description: "" },
      runtime: { name: "pi", version: "latest" },
      resources: { skills: [], packages: [] },
      permissions: { filesystem: "all", shell: "all" },
      secrets: [],
    },
  });
});

it("reports an unresolved alias as invalid YAML", () => {
  expect(validateAgentYaml("agent: *missing")).toMatchObject({
    valid: false,
    issues: [{ code: "yaml" }],
  });
});

it.each([
  [
    "resources: {skills: [{name: notes, source: local}, {name: notes, source: other}]}",
    "resources.skills.1.name",
  ],
  [
    'resources: {packages: [{name: one, source: "npm:lens@1"}, {name: two, source: "npm:lens@2"}]}',
    "resources.packages",
  ],
  [
    'resources: {skills: [{name: notes, source: " local "}]}',
    "resources.skills.0.source",
  ],
  ["secrets: [TOKEN, TOKEN]", "secrets"],
  ["mcp: {servers: {docs: {}}}", "mcp.servers.docs"],
  [
    'mcp: {servers: {docs: {url: "https://example.com", auth: bearer, bearer_token_env: TOKEN}}}',
    "mcp.servers.docs",
  ],
])("rejects configurations the CLI cannot use: %s", (fields, path) => {
  const result = validateAgentYaml(`agent: {name: test}\n${fields}`);
  expect(result.valid).toBe(false);
  if (!result.valid)
    expect(result.issues, JSON.stringify(result.issues)).toEqual(
      expect.arrayContaining([expect.objectContaining({ path })]),
    );
});

it("accepts a correctly declared MCP secret reference", () => {
  expect(
    validateAgentYaml(
      'agent: {name: test}\nsecrets: [TOKEN]\nmcp: {servers: {docs: {url: "https://example.com", auth: bearer, bearer_token_env: TOKEN}}}',
    ),
  ).toMatchObject({ valid: true });
});

it.each([
  ["strict strings", "agent: {name: 42}", "agent.name"],
  ["strict booleans", "agent: {name: test}\npermissions: {shell: yes}", "permissions.shell"],
  ["removed workspace permission", "agent: {name: test}\npermissions: {filesystem: workspace}", "permissions.filesystem"],
  ["ignored resource version", "agent: {name: test}\nresources: {packages: [{name: lens, source: npm:lens, version: '1.2.3'}]}", "resources.packages.0.version"],
  ["invalid npm syntax", "agent: {name: test}\nresources: {packages: [{name: lens, source: npm:Lens}]} ", "resources.packages.0.source"],
  ["local package source", "agent: {name: test}\nresources: {packages: [{name: lens, source: ./lens}]} ", "resources.packages.0.source"],
  ["credentialed package source", 'agent: {name: test}\nresources: {packages: [{name: lens, source: "https://user:pass@example.com/owner/repo"}]}', "resources.packages.0.source"],
  ["bare Git host shorthand", "agent: {name: test}\nresources: {packages: [{name: lens, source: example.test/owner/repo}]} ", "resources.packages.0.source"],
  ["percent-encoded Git path traversal", 'agent: {name: test}\nresources: {packages: [{name: lens, source: "https://example.test/owner/%2e%2e/repo"}]}', "resources.packages.0.source"],
  ["invalid Git percent escape", 'agent: {name: test}\nresources: {packages: [{name: lens, source: "https://example.test/owner/%ZZ"}]}', "resources.packages.0.source"],
  ["NUL Git percent escape", 'agent: {name: test}\nresources: {packages: [{name: lens, source: "https://example.test/owner/%00repo"}]}', "resources.packages.0.source"],
  ["invalid Git UTF-8 escape", 'agent: {name: test}\nresources: {packages: [{name: lens, source: "https://example.test/owner/%FFrepo"}]}', "resources.packages.0.source"],
  ["encoded duplicate Git identity", 'agent: {name: test}\nresources: {packages: [{name: one, source: "https://example.test/owner/repo@v1"}, {name: two, source: "https://example.test/owner/%72epo@v2"}]}', "resources.packages"],
  ["reserved secret name", "agent: {name: test}\nsecrets: [PI_PACKAGE_DIR]", "secrets"],
  ["duplicate Git package identity", "agent: {name: test}\nresources: {packages: [{name: one, source: github:owner/repo@v1}, {name: two, source: 'https://github.com/owner/repo.git@v2'}]}", "resources.packages"],
])("matches CLI validation for %s", (_label, fields, path) => {
  const result = validateAgentYaml(fields);
  expect(result.valid).toBe(false);
  if (!result.valid)
    expect(result.issues, `${_label}: ${JSON.stringify(result.issues)}`).toEqual(
      expect.arrayContaining([expect.objectContaining({ path })]),
    );
});

it("uses YAML 1.2 core scalars and rejects non-string mapping keys", () => {
  expect(validateAgentYaml("agent: {name: on}")).toMatchObject({ valid: true });
  const numericKey = validateAgentYaml("agent:\n  name: test\n5: ignored\n");
  expect(numericKey.valid).toBe(false);
  if (!numericKey.valid)
    expect(numericKey.issues.some((issue) => /mapping keys must be strings/.test(issue.message))).toBe(true);
  expect(validateAgentYaml("permissions: {shell: 2026-10-01}").valid).toBe(false);
});

it("accepts explicit git: host shorthand like the CLI", () => {
  expect(
    validateAgentYaml(
      "agent: {name: test}\nresources: {packages: [{name: lens, source: git:example.test/owner/repo}]}",
    ),
  ).toMatchObject({ valid: true });
});

it("bounds YAML input size, nesting, and expanded aliases", () => {
  expect(validateAgentYaml(`${valid}${"#".repeat(1_000_001)}`)).toMatchObject({
    valid: false,
    issues: [{ code: "yaml" }],
  });
  const nested = `agent:\n${Array.from({ length: 66 }, (_, index) => `${"  ".repeat(index + 1)}level${index}:\n`).join("")}${"  ".repeat(67)}null`;
  expect(validateAgentYaml(nested)).toMatchObject({
    valid: false,
    issues: [{ code: "yaml" }],
  });
  const aliases = `anchor: &a [x, x, x, x, x, x, x, x, x, x]\nvalues: [${Array(101).fill("*a").join(", ")}]`;
  expect(validateAgentYaml(aliases)).toMatchObject({
    valid: false,
    issues: [{ code: "yaml" }],
  });
});
