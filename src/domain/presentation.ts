import type { AgentConfig } from "./validation";

export function revisionLabel(number: number) {
  return `r${String(number).padStart(3, "0")}`;
}

export function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
}

export function timestampLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : `${dateLabel(value)} · ${date.toISOString().slice(11, 16)} UTC`;
}

function equivalent(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (
    left == null ||
    right == null ||
    typeof left !== "object" ||
    typeof right !== "object"
  )
    return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) => equivalent(item, right[index]))
    );
  }
  const a = left as Record<string, unknown>;
  const b = right as Record<string, unknown>;
  return (
    Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every(
      (key) => Object.hasOwn(b, key) && equivalent(a[key], b[key]),
    )
  );
}

export function sourceVersion(
  resource: AgentConfig["resources"]["packages"][number],
) {
  const npmPin = resource.source.startsWith("npm:")
    ? resource.source.slice(4).match(/[^/]@([^@]+)$/)?.[1]
    : undefined;
  return npmPin
    ? `Source version: ${npmPin}`
    : resource.version
      ? `Version metadata: ${resource.version}`
      : "No version declared";
}

export function revisionChanges(
  previous: AgentConfig,
  current: AgentConfig,
): string[] {
  const changes: string[] = [];
  if (previous.agent.description !== current.agent.description)
    changes.push("Description updated");
  for (const [key, label] of [
    ["runtime", "Runtime"],
    ["model", "Model"],
    ["permissions", "Permissions"],
    ["system_prompt", "System prompt"],
    ["secrets", "Secret names"],
    ["mcp", "MCP servers"],
  ] as const) {
    if (!equivalent(previous[key], current[key]))
      changes.push(`${label} changed`);
  }
  for (const kind of ["skills", "packages"] as const) {
    const before = new Map(
      previous.resources[kind].map((item) => [item.name, item]),
    );
    const after = new Map(
      current.resources[kind].map((item) => [item.name, item]),
    );
    for (const [name, item] of after) {
      if (!before.has(name))
        changes.push(
          `Added ${kind === "skills" ? "skill" : "package"}: ${name}`,
        );
      else if (!equivalent(before.get(name), item))
        changes.push(
          `Updated ${kind === "skills" ? "skill" : "package"}: ${name}`,
        );
    }
    for (const name of before.keys())
      if (!after.has(name))
        changes.push(
          `Removed ${kind === "skills" ? "skill" : "package"}: ${name}`,
        );
  }
  return changes.length
    ? changes
    : ["YAML text changed; configuration is equivalent"];
}
