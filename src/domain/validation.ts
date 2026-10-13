import Ajv, { type ErrorObject } from "ajv";
import { parseDocument } from "yaml";
import agentSchema from "@/schema/agent.schema.json";

const ajv = new Ajv({ allErrors: true, strict: false });
const validateSchema = ajv.compile(agentSchema);

export interface AgentConfig {
  mantle: "0.1";
  agent: { name: string; description?: string };
  runtime: { name: "pi"; version: string };
  model: { provider: string; name: string };
  system_prompt?: string | null;
  resources: {
    skills: Array<{ name: string; source: string; version?: null }>;
    packages: Array<{ name: string; source: string; version?: null }>;
  };
  mcp?: { servers?: Record<string, unknown> };
  permissions: {
    filesystem: "all" | "read" | "none";
    shell: "all" | "none";
  };
  secrets: string[];
}

export interface ValidationIssue {
  code: "yaml" | "schema";
  message: string;
  path?: string;
  line?: number;
  column?: number;
}

export type ValidationResult =
  | { valid: true; config: AgentConfig; issues: [] }
  | { valid: false; config?: undefined; issues: ValidationIssue[] };

function schemaIssue(error: ErrorObject): ValidationIssue {
  const missing =
    error.keyword === "required"
      ? String(error.params.missingProperty ?? "")
      : "";
  const path = `${error.instancePath.replaceAll("/", ".").replace(/^\./, "")}${missing ? `${error.instancePath ? "." : ""}${missing}` : ""}`;
  return {
    code: "schema",
    path: path || "configuration",
    message: error.message ?? "does not satisfy the Mantle schema",
  };
}

const NPM_SOURCE = /^npm:(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*(?:@[^\s/@\\]+)?$/;

function packageSourceError(source: string): string | undefined {
  if (source.startsWith("npm:"))
    return NPM_SOURCE.test(source)
      ? undefined
      : "Invalid npm package source. Use npm:package@version or npm:@scope/package@version.";

  let value = source.startsWith("git:") ? source.slice(4) : source;
  const aliases: Record<string, string> = {
    "github:": "https://github.com/",
    "gitlab:": "https://gitlab.com/",
    "bitbucket:": "https://bitbucket.org/",
  };
  for (const [prefix, replacement] of Object.entries(aliases)) {
    if (value.startsWith(prefix)) {
      value = replacement + value.slice(prefix.length);
      break;
    }
  }
  if (value.startsWith("git@"))
    value = `ssh://${value.slice(4).replace(":", "/")}`;
  if (
    value.includes("/") &&
    value.split("/", 1)[0].includes(".") &&
    !value.startsWith(".") &&
    !value.startsWith("/") &&
    !value.startsWith("~")
  ) {
    if (!source.startsWith("git:"))
      return "Package source must include a Git URL scheme (or git: prefix), such as https://github.com/owner/repo.";
    value = `https://${value}`;
  }
  if (!/^(https?|ssh|git):\/\//.test(value))
    return "Package source must be an npm: package or a Git URL. Local package references are not supported because Mantle keeps installed resources inside the agent.";
  try {
    const pathStart = value.indexOf("/", value.indexOf("://") + 3);
    const rawPath = pathStart < 0 ? "" : value.slice(pathStart).split(/[?#]/, 1)[0];
    const decodedPath = decodeURIComponent(rawPath);
    if (
      decodedPath.includes("\\") ||
      decodedPath.includes("\u0000") ||
      decodedPath.split("/").includes("..")
    )
      return "Git package source must include a host and repository path, such as https://github.com/owner/repo.";
    const url = new URL(value);
    const path = url.pathname
      .replace(/^\//, "")
      .split("@", 1)[0]
      .replace(/\.git$/, "");
    const parts = path.split("/").filter(Boolean);
    if (
      !url.hostname ||
      parts.length < 2 ||
      parts.includes("..") ||
      path.includes("\\") ||
      url.search ||
      url.hash ||
      /\s/.test(value)
    )
      return "Git package source must include a host and repository path, such as https://github.com/owner/repo.";
    if (
      url.password ||
      (url.username && (url.protocol === "http:" || url.protocol === "https:"))
    )
      return "Git package URLs must not contain credentials. Use your local Git credential helper.";
  } catch {
    return "Git package source must include a host and repository path, such as https://github.com/owner/repo.";
  }
  return undefined;
}

function packageSourceIdentity(source: string): string {
  if (source.startsWith("npm:"))
    return source.slice(5).includes("@")
      ? `npm:${source.slice(5, source.lastIndexOf("@"))}`
      : source;
  let value = source.startsWith("git:") ? source.slice(4) : source;
  const aliases: Record<string, string> = {
    "github:": "https://github.com/",
    "gitlab:": "https://gitlab.com/",
    "bitbucket:": "https://bitbucket.org/",
  };
  for (const [prefix, replacement] of Object.entries(aliases)) {
    if (value.startsWith(prefix)) {
      value = replacement + value.slice(prefix.length);
      break;
    }
  }
  if (value.startsWith("git@"))
    value = `ssh://${value.slice(4).replace(":", "/")}`;
  if (
    value.includes("/") &&
    value.split("/", 1)[0].includes(".") &&
    !value.startsWith(".") &&
    !value.startsWith("/") &&
    !value.startsWith("~")
  )
    value = `https://${value}`;
  const url = new URL(value);
  const path = decodeURIComponent(url.pathname)
    .replace(/^\//, "")
    .split("@", 1)[0]
    .replace(/\.git$/, "");
  return `git:${url.hostname}/${path}`;
}

function boundedYamlValue(value: unknown): unknown {
  const stack = new WeakSet<object>();
  let count = 0;
  function convert(item: unknown, depth: number): unknown {
    count += 1;
    if (count > 10_000)
      throw new Error("expanded configuration exceeds 10000 values");
    if (depth > 64) throw new Error("nesting exceeds the 64-level configuration limit");
    if (
      item === null ||
      typeof item === "string" ||
      typeof item === "boolean" ||
      typeof item === "number"
    )
      return item;
    if (typeof item !== "object") throw new Error("configuration values must use YAML core types");
    if (stack.has(item)) throw new Error("recursive aliases are not supported");
    stack.add(item);
    try {
      if (Array.isArray(item))
        return item.map((child) => convert(child, depth + 1));
      if (item instanceof Map) {
        const pairs: Array<[string, unknown]> = [];
        for (const [key, child] of item.entries()) {
          if (typeof key !== "string")
            throw new Error("mapping keys must be strings");
          pairs.push([key, convert(child, depth + 1)]);
        }
        return Object.fromEntries(pairs);
      }
      throw new Error("configuration values must use YAML core types");
    } finally {
      stack.delete(item);
    }
  }
  return convert(value, 0);
}

function parseConfigYaml(text: string):
  | { valid: true; document: ReturnType<typeof parseDocument>; value: unknown }
  | { valid: false; issues: ValidationIssue[] } {
  if (Buffer.byteLength(text, "utf8") > 1_000_000)
    return {
      valid: false,
      issues: [{ code: "yaml", message: "agent.yaml must be 1 MB or smaller." }],
    };
  try {
    const document = parseDocument(text, {
      prettyErrors: false,
      uniqueKeys: true,
      version: "1.2",
      schema: "core",
      merge: false,
    });
    if (document.errors.length) {
      return {
        valid: false,
        issues: document.errors.map((error) => {
          const offset = error.pos?.[0] ?? 0;
          const preceding = text.slice(0, offset).split("\n");
          return {
            code: "yaml" as const,
            message: error.message,
            line: error.linePos?.[0]?.line ?? preceding.length,
            column:
              error.linePos?.[0]?.col ?? (preceding.at(-1)?.length ?? 0) + 1,
          };
        }),
      };
    }
    const value = boundedYamlValue(document.toJS({
      mapAsMap: true,
      maxAliasCount: 100,
    }));
    return { valid: true, document, value };
  } catch (error) {
    return {
      valid: false,
      issues: [
        {
          code: "yaml",
          message:
            error instanceof Error
              ? `Invalid YAML: ${error.message}`
              : "Invalid YAML: configuration could not be parsed.",
        },
      ],
    };
  }
}

export function validateAgentYaml(
  text: string,
  expectedName?: string,
): ValidationResult {
  const parsed = parseConfigYaml(text);
  if (!parsed.valid) return parsed;
  const { value } = parsed;
  if (!(value instanceof Object) || Array.isArray(value) || value instanceof Map)
    return {
      valid: false,
      issues: [{ code: "yaml", message: "The document root must be a mapping." }],
    };
  if (!validateSchema(value)) {
    return {
      valid: false,
      issues: (validateSchema.errors ?? []).map(schemaIssue),
    };
  }
  const raw = value as Partial<AgentConfig> & Pick<AgentConfig, "agent">;
  // Pydantic's default factories are not represented as JSON Schema defaults.
  // Normalize the API view without altering the exact YAML stored for the CLI.
  const config: AgentConfig = {
    ...raw,
    mantle: raw.mantle ?? "0.1",
    agent: { description: "", ...raw.agent },
    runtime: { name: "pi", version: "latest", ...raw.runtime },
    model: { provider: "openai", name: "gpt-5.6", ...raw.model },
    resources: { skills: [], packages: [], ...raw.resources },
    permissions: { filesystem: "all", shell: "all", ...raw.permissions },
    secrets: raw.secrets ?? [],
  };
  if (expectedName && config.agent.name !== expectedName) {
    return {
      valid: false,
      issues: [
        {
          code: "schema",
          path: "agent.name",
          message: `declares “${config.agent.name}”, but the requested agent is “${expectedName}”`,
        },
      ],
    };
  }
  // Pydantic cross-field validators are not emitted by JSON Schema.
  const issues: ValidationIssue[] = [];
  const issue = (path: string, message: string) =>
    issues.push({ code: "schema", path, message });
  const hasControl = (text: string) =>
    [...text].some((character) => character.charCodeAt(0) < 32);
  for (const kind of ["skills", "packages"] as const) {
    const names = new Set<string>();
    for (const [index, resource] of config.resources[kind].entries()) {
      const location = `resources.${kind}.${index}`;
      if (names.has(resource.name))
        issue(`${location}.name`, "resource names must be unique");
      names.add(resource.name);
      if (kind === "skills" && resource.name.includes("/"))
        issue(`${location}.name`, "skill names must be single directory names");
      for (const key of ["name", "source"] as const) {
        const value = resource[key];
        if (
          value != null &&
          (!value.trim() || value !== value.trim() || hasControl(value))
        )
          issue(
            `${location}.${key}`,
            "must not be blank, have surrounding whitespace, or contain control characters",
          );
      }
      if (kind === "packages") {
        const message = packageSourceError(resource.source);
        if (message) issue(`${location}.source`, message);
      }
    }
  }
  const packageSources = config.resources.packages.map(({ source }) =>
    packageSourceError(source)
      ? `invalid:${source}`
      : packageSourceIdentity(source),
  );
  if (new Set(packageSources).size !== packageSources.length)
    issue("resources.packages", "package sources must be unique");
  if (new Set(config.secrets).size !== config.secrets.length)
    issue("secrets", "secret names must be unique");
  if (config.secrets.some((name) => name.startsWith("PI_")))
    issue("secrets", "secret names beginning with PI_ are reserved for Mantle isolation");
  const servers = config.mcp?.servers ?? {};
  if (
    Object.keys(servers).length &&
    config.resources.packages.some((item) => item.name === "pi-mcp-adapter")
  )
    issue(
      "resources.packages",
      "pi-mcp-adapter is managed automatically when MCP servers are declared",
    );
  for (const [name, value] of Object.entries(servers)) {
    const server = value as Record<string, unknown>;
    const location = `mcp.servers.${name}`;
    if ((server.command == null) === (server.url == null))
      issue(location, "exactly one of command or url must be set");
    if (typeof server.url === "string" && !/^https?:\/\//.test(server.url))
      issue(`${location}.url`, "must use http or https");
    if (
      server.command == null &&
      ((server.args as unknown[] | undefined)?.length ||
        Object.keys(server.env ?? {}).length ||
        server.cwd != null)
    )
      issue(location, "args, env, and cwd require command transport");
    if (
      server.url == null &&
      (Object.keys(server.headers ?? {}).length ||
        server.auth != null ||
        server.bearer_token_env != null)
    )
      issue(location, "headers and authentication require URL transport");
    if (server.bearer_token_env != null) {
      if (server.auth !== "bearer")
        issue(location, "bearer_token_env requires auth: bearer");
      if (!config.secrets.includes(server.bearer_token_env as string))
        issue(location, "bearer_token_env must also be declared in secrets");
    }
    for (const key of [
      "command",
      "cwd",
      "url",
      "args",
      "env",
      "headers",
      "include_tools",
      "exclude_tools",
    ]) {
      const field = server[key];
      const values =
        typeof field === "string"
          ? [field]
          : field && typeof field === "object"
            ? (Object.values(field) as string[])
            : [];
      if (values.some(hasControl))
        issue(`${location}.${key}`, "must not contain control characters");
    }
  }
  return issues.length
    ? { valid: false, issues }
    : { valid: true, config, issues: [] };
}

export function formatAgentYaml(text: string): string {
  const document = parseDocument(text, {
    prettyErrors: false,
    uniqueKeys: true,
  });
  if (document.errors.length) throw new Error(document.errors[0].message);
  return document.toString({ lineWidth: 100 });
}
