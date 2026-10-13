import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  deleteAgent,
  getLatest,
  getRevision,
  listAgents,
  listRevisions,
  saveAgent,
} from "@/server/repository";

let repository: string;

function yaml(description: string) {
  return `mantle: "0.1"
agent:
  name: test-agent
  description: ${description}
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
secrets: []
`;
}

beforeEach(async () => {
  repository = await mkdtemp(path.join(tmpdir(), "mantle-cloud-test-"));
  process.env.MANTLE_DATA_DIR = repository;
});

afterEach(async () => {
  delete process.env.MANTLE_DATA_DIR;
  await rm(repository, { recursive: true, force: true });
});

describe("filesystem revision repository", () => {
  it("creates immutable revisions and deduplicates identical YAML", async () => {
    const first = await saveAgent("test-agent", yaml("One"));
    const duplicate = await saveAgent("test-agent", yaml("One"));
    const second = await saveAgent("test-agent", yaml("Two"));
    expect(first).toMatchObject({ created: true, revision: { number: 1 } });
    expect(duplicate).toMatchObject({
      created: false,
      revision: { number: 1 },
    });
    expect(second).toMatchObject({ created: true, revision: { number: 2 } });
    expect(
      (await listRevisions("test-agent")).map((item) => item.number),
    ).toEqual([2, 1]);
    expect((await getRevision("test-agent", 1)).description).toBe("One");
    expect((await getLatest("test-agent")).description).toBe("Two");
    expect(await readdir(path.join(repository, "test-agent"))).toEqual([
      "0001.yaml",
      "0002.yaml",
    ]);
  });

  it("stores only YAML revision files and deletes an agent", async () => {
    await saveAgent("test-agent", yaml("No secrets"));
    await writeFile(path.join(repository, "unrelated.env"), "SECRET=value");
    expect(
      await readFile(path.join(repository, "test-agent", "0001.yaml"), "utf8"),
    ).not.toContain("SECRET=value");
    expect(await listAgents()).toHaveLength(1);
    await deleteAgent("test-agent");
    expect(await listAgents()).toEqual([]);
  });

  it("rejects invalid YAML before writing a revision", async () => {
    await expect(saveAgent("test-agent", "agent: [\n")).rejects.toMatchObject({
      status: 422,
    });
    expect(await readdir(repository)).toEqual([]);
  });
});

it("serializes concurrent changed and unchanged pushes", async () => {
  const results = await Promise.all(
    Array.from({ length: 12 }, () => saveAgent("test-agent", yaml("Same"))),
  );
  expect(results.filter((item) => item.created)).toHaveLength(1);
  await Promise.all([
    saveAgent("test-agent", yaml("Two")),
    saveAgent("test-agent", yaml("Three")),
  ]);
  expect(
    (await listRevisions("test-agent")).map((item) => item.number),
  ).toEqual([3, 2, 1]);
  expect((await getRevision("test-agent", 1)).yaml).toBe(yaml("Same"));
});

it("orders a concurrent push after a delete instead of deleting the new revision", async () => {
  await saveAgent("test-agent", yaml("Before"));
  const deleting = deleteAgent("test-agent");
  const pushing = saveAgent("test-agent", yaml("After"));
  await Promise.all([deleting, pushing]);
  expect((await getLatest("test-agent")).description).toBe("After");
});

it("does not silently show an empty registry when storage is corrupt", async () => {
  await saveAgent("test-agent", yaml("One"));
  await writeFile(path.join(repository, "test-agent", "0001.yaml"), "agent: [");
  await expect(listAgents()).rejects.toMatchObject({
    code: "CORRUPT_REVISION",
  });
});
