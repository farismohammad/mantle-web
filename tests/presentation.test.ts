import { describe, expect, it } from "vitest";
import { revisionChanges, dateLabel } from "@/domain/presentation";
import { validateAgentYaml } from "@/domain/validation";
function config(yaml: string) {
  const result = validateAgentYaml(yaml);
  if (!result.valid) throw new Error("Invalid fixture");
  return result.config;
}
describe("revision inspection", () => {
  it("summarizes resource additions, removals, updates and config changes", () => {
    const a = config(
      'agent: {name: test, description: Before}\nresources:\n  skills: [{name: review, source: "https://example.com/review"}]\n  packages: [{name: lens, source: "npm:pi-lens@4.2.0"}]',
    );
    const b = config(
      'agent: {name: test, description: After}\nresources:\n  skills: [{name: docs, source: "https://example.com/docs"}]\n  packages: [{name: lens, source: "npm:pi-lens@4.2.1"}]',
    );
    expect(revisionChanges(a, b)).toEqual([
      "Description updated",
      "Added skill: docs",
      "Removed skill: review",
      "Updated package: lens",
    ]);
  });
  it("distinguishes text-only revisions and handles absent optional fields", () => {
    expect(
      revisionChanges(
        config("agent: {name: test}"),
        config("# comment\nagent: {name: test}"),
      ),
    ).toEqual(["YAML text changed; configuration is equivalent"]);
    expect(dateLabel("not a date")).toBe("Date unavailable");
  });
});

it("does not report a config change for reordered mapping keys", () => {
  const a = config(
    'agent: {name: test}\nresources:\n  packages: [{name: lens, source: "npm:pi-lens@4.2.1"}]',
  );
  const b = config(
    'agent: {name: test}\nresources:\n  packages: [{source: "npm:pi-lens@4.2.1", name: lens}]',
  );
  expect(revisionChanges(a, b)).toEqual([
    "YAML text changed; configuration is equivalent",
  ]);
});
