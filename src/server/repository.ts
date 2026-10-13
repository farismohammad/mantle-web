import { createHash } from "node:crypto";
import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { validateAgentYaml, type AgentConfig } from "@/domain/validation";

const AGENT_NAME = /^[a-z0-9_][a-z0-9_-]*$/;
const REVISION_FILE = /^(\d{4,})\.yaml$/;
const globalState = globalThis as typeof globalThis & {
  __mantleMutationQueue?: Promise<void>;
};
globalState.__mantleMutationQueue ??= Promise.resolve();

export interface RevisionInfo {
  number: number;
  sha256: string;
  createdAt: string;
}

export interface StoredAgent {
  name: string;
  description: string;
  revision: RevisionInfo;
  yaml: string;
  config: AgentConfig;
}

export interface AgentSummary {
  name: string;
  description: string;
  revision: number;
  updatedAt: string;
  runtime: AgentConfig["runtime"];
  skillCount: number;
  packageCount: number;
}

export class RepositoryError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export function repositoryRoot(): string {
  return path.resolve(
    process.env.MANTLE_DATA_DIR ??
      path.join(process.cwd(), "data", "repository"),
  );
}

function checkedName(name: string): string {
  if (name.length > 64 || !AGENT_NAME.test(name))
    throw new RepositoryError(
      400,
      "INVALID_AGENT_NAME",
      "Use a lowercase agent name of up to 64 characters containing letters, numbers, hyphens, or underscores.",
    );
  return name;
}

function agentDirectory(name: string): string {
  return path.join(repositoryRoot(), checkedName(name));
}

async function revisionNumbers(name: string): Promise<number[]> {
  let entries;
  try {
    entries = await readdir(agentDirectory(name));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  return entries
    .flatMap((entry) => {
      const match = REVISION_FILE.exec(entry);
      return match ? [Number(match[1])] : [];
    })
    .sort((left, right) => left - right);
}

function revisionPath(name: string, number: number): string {
  return path.join(
    agentDirectory(name),
    `${String(number).padStart(4, "0")}.yaml`,
  );
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

async function revisionInfo(
  name: string,
  number: number,
  yaml: string,
): Promise<RevisionInfo> {
  const metadata = await stat(revisionPath(name, number));
  return {
    number,
    sha256: sha256(yaml),
    createdAt: metadata.mtime.toISOString(),
  };
}

export async function getRevision(
  name: string,
  number: number,
): Promise<StoredAgent> {
  checkedName(name);
  if (!Number.isSafeInteger(number) || number < 1)
    throw new RepositoryError(
      400,
      "INVALID_REVISION",
      "Revision must be a positive integer.",
    );
  let yaml;
  try {
    yaml = await readFile(revisionPath(name, number), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      throw new RepositoryError(
        404,
        "NOT_FOUND",
        `Agent “${name}” revision ${number} does not exist.`,
      );
    throw error;
  }
  const validation = validateAgentYaml(yaml, name);
  if (!validation.valid)
    throw new RepositoryError(
      500,
      "CORRUPT_REVISION",
      "A stored revision failed schema validation.",
      { issues: validation.issues },
    );
  return {
    name,
    description: validation.config.agent.description ?? "",
    revision: await revisionInfo(name, number, yaml),
    yaml,
    config: validation.config,
  };
}

export async function getLatest(name: string): Promise<StoredAgent> {
  const numbers = await revisionNumbers(name);
  const latest = numbers.at(-1);
  if (!latest)
    throw new RepositoryError(
      404,
      "NOT_FOUND",
      `Agent “${name}” does not exist.`,
    );
  return getRevision(name, latest);
}

export async function listRevisions(name: string): Promise<RevisionInfo[]> {
  const numbers = await revisionNumbers(name);
  if (!numbers.length)
    throw new RepositoryError(
      404,
      "NOT_FOUND",
      `Agent “${name}” does not exist.`,
    );
  return Promise.all(
    [...numbers].reverse().map(async (number) => {
      const yaml = await readFile(revisionPath(name, number), "utf8");
      return revisionInfo(name, number, yaml);
    }),
  );
}

export async function listAgents(): Promise<AgentSummary[]> {
  await mkdir(repositoryRoot(), { recursive: true });
  const entries = await readdir(repositoryRoot(), { withFileTypes: true });
  const agents = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && AGENT_NAME.test(entry.name))
      .map(async (entry) => {
        try {
          const latest = await getLatest(entry.name);
          return {
            name: latest.name,
            description: latest.description,
            revision: latest.revision.number,
            updatedAt: latest.revision.createdAt,
            runtime: latest.config.runtime,
            skillCount: latest.config.resources.skills.length,
            packageCount: latest.config.resources.packages.length,
          };
        } catch (error) {
          if (error instanceof RepositoryError && error.status === 404)
            return null;
          throw error;
        }
      }),
  );
  return agents
    .filter((agent): agent is AgentSummary => agent !== null)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function serialize<T>(mutation: () => Promise<T>): Promise<T> {
  const result = globalState.__mantleMutationQueue!.then(mutation, mutation);
  globalState.__mantleMutationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export async function saveAgent(
  name: string,
  yaml: string,
): Promise<{ created: boolean; revision: RevisionInfo }> {
  checkedName(name);
  if (Buffer.byteLength(yaml, "utf8") > 1_000_000)
    throw new RepositoryError(
      413,
      "CONFIG_TOO_LARGE",
      "agent.yaml must be 1 MB or smaller.",
    );
  const validation = validateAgentYaml(yaml, name);
  if (!validation.valid)
    throw new RepositoryError(
      422,
      "INVALID_AGENT_CONFIG",
      "The YAML does not satisfy the Mantle schema.",
      { issues: validation.issues },
    );
  return serialize(async () => {
    const numbers = await revisionNumbers(name);
    const latest = numbers.at(-1);
    if (latest) {
      const current = await readFile(revisionPath(name, latest), "utf8");
      if (current === yaml)
        return {
          created: false,
          revision: await revisionInfo(name, latest, current),
        };
    }
    const number = (latest ?? 0) + 1;
    const directory = agentDirectory(name);
    await mkdir(directory, { recursive: true });
    const destination = revisionPath(name, number);
    const temporary = path.join(
      directory,
      `.${String(number).padStart(4, "0")}.${process.pid}.tmp`,
    );
    await writeFile(temporary, yaml, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o644,
    });
    await rename(temporary, destination);
    return { created: true, revision: await revisionInfo(name, number, yaml) };
  });
}

export async function deleteAgent(name: string): Promise<void> {
  checkedName(name);
  await serialize(async () => {
    await getLatest(name);
    await rm(agentDirectory(name), { recursive: true, force: false });
  });
}
