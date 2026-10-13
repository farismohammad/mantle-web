import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/agents/[name]/route";
import { GET as getAgents } from "@/app/api/agents/route";
import { GET as getHistory } from "@/app/api/agents/[name]/revisions/route";
import { GET as getRevision } from "@/app/api/agents/[name]/revisions/[revision]/route";
import { PUT as format, POST as validate } from "@/app/api/validate/route";
import { GET as health } from "@/app/v1/health/route";

let directory: string;
const context = { params: Promise.resolve({ name: "api-agent" }) };
const url = "http://localhost/api/agents/api-agent";
const yaml = "agent:\n  name: api-agent\n  description: First revision\n";
const request = (body = yaml) => new Request(url, { method: "PUT", body });
beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "mantle-api-"));
  process.env.MANTLE_DATA_DIR = directory;
});
afterEach(async () => {
  delete process.env.MANTLE_DATA_DIR;
  await rm(directory, { recursive: true, force: true });
});

describe("CLI API contract", () => {
  it("roundtrips exact YAML, normalized metadata, revisions and an unchanged push", async () => {
    expect(await (await PUT(request(), context)).json()).toMatchObject({
      data: { created: true, revision: { number: 1 } },
    });
    expect(await (await PUT(request(), context)).json()).toMatchObject({
      data: { created: false, revision: { number: 1 } },
    });
    const latest = await (await GET(new Request(url), context)).json();
    expect(latest.data.yaml).toBe(yaml);
    expect(latest.data.config).toMatchObject({
      runtime: { name: "pi", version: "latest" },
      resources: { skills: [], packages: [] },
    });
    expect(latest.data.revision.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(await (await getAgents()).json()).toMatchObject({
      data: [
        {
          name: "api-agent",
          runtime: { name: "pi" },
          skillCount: 0,
          packageCount: 0,
        },
      ],
    });
    const updated = yaml.replace("First revision", "Second revision");
    expect(await (await PUT(request(updated), context)).json()).toMatchObject({
      data: { created: true, revision: { number: 2 } },
    });
    const history = await (await getHistory(new Request(url), context)).json();
    expect(history.data.map((item: { number: number }) => item.number)).toEqual(
      [2, 1],
    );
    const first = await getRevision(new Request(url), {
      params: Promise.resolve({ name: "api-agent", revision: "1" }),
    });
    expect((await first.json()).data.yaml).toBe(yaml);
    expect(
      (await (await GET(new Request(url), context)).json()).data.yaml,
    ).toBe(updated);
    expect((await DELETE(new Request(url), context)).status).toBe(204);
    expect((await GET(new Request(url), context)).status).toBe(404);
  });
  it("returns actionable errors and does not store invalid data", async () => {
    const invalid = await PUT(request("agent: ["), context);
    expect(invalid.status).toBe(422);
    expect(await invalid.json()).toMatchObject({
      error: {
        code: "INVALID_AGENT_CONFIG",
        details: { issues: [{ code: "yaml" }] },
      },
    });
    expect(
      (await PUT(request(yaml.replace("api-agent", "other-agent")), context))
        .status,
    ).toBe(422);
    expect(await (await getAgents()).json()).toEqual({ data: [] });
  });
  it("applies the same size limit to writes, validation and formatting", async () => {
    const oversized = "#".repeat(1_000_001);
    for (const handler of [(r: Request) => PUT(r, context), format, validate]) {
      const response = await handler(request(oversized));
      expect(response.status).toBe(413);
      expect(await response.json()).toMatchObject({
        error: { code: "CONFIG_TOO_LARGE" },
      });
    }
  });
  it("health reports inaccessible storage", async () => {
    expect((await health()).status).toBe(200);
    process.env.MANTLE_DATA_DIR = "/dev/null/mantle";
    expect((await health()).status).toBe(503);
  });
});
