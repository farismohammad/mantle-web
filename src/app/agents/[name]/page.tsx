import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Box,
  FileCode2,
  History,
  Layers,
} from "lucide-react";
import {
  getLatest,
  getRevision,
  listRevisions,
  RepositoryError,
} from "@/server/repository";
import {
  timestampLabel,
  sourceVersion,
  revisionChanges,
  revisionLabel,
} from "@/domain/presentation";
import { Command } from "@/components/copy-command";
import { YamlView } from "@/components/yaml-view";
import type { AgentConfig } from "@/domain/validation";

export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ revision?: string }>;
};
export async function generateMetadata({ params }: Props) {
  return { title: (await params).name };
}

function Resources({
  title,
  resources,
}: {
  title: "Skills" | "Packages";
  resources: AgentConfig["resources"]["skills"];
}) {
  return (
    <section className="resource-section">
      <h2>
        {title === "Skills" ? <Layers size={18} /> : <Box size={18} />}
        {title}
        <span className="count">{resources.length}</span>
      </h2>
      {resources.length ? (
        <ul className="resource-list">
          {resources.map((resource) => (
            <li key={resource.name}>
              <div>
                <strong>{resource.name}</strong>
                <span className="resource-version">
                  {sourceVersion(resource)}
                </span>
              </div>
              {/^https?:\/\//.test(resource.source) ? (
                <a href={resource.source} target="_blank" rel="noreferrer">
                  {resource.source}
                  <ArrowUpRight size={13} />
                </a>
              ) : (
                <code>{resource.source}</code>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">
          No {title.toLowerCase()} declared in this revision.
        </p>
      )}
    </section>
  );
}

export default async function AgentPage({ params, searchParams }: Props) {
  const { name } = await params;
  const { revision } = await searchParams;
  try {
    const [latest, history] = await Promise.all([
      getLatest(name),
      listRevisions(name),
    ]);
    if (
      revision &&
      (!/^\d+$/.test(revision) ||
        !history.some((item) => item.number === Number(revision)))
    )
      notFound();
    const selected = revision
      ? await getRevision(name, Number(revision))
      : latest;
    const previousNumber = history.find(
      (item) => item.number < selected.revision.number,
    )?.number;
    const previous = previousNumber
      ? await getRevision(name, previousNumber)
      : null;
    const historical = selected.revision.number !== latest.revision.number;
    const config = selected.config;
    return (
      <main id="workspace" className="page detail-page">
        <Link className="back-link" href="/">
          <ArrowLeft size={15} /> All agents
        </Link>
        <header className="detail-heading">
          <div>
            <p className="eyebrow">
              Mantle agent <span>/</span>{" "}
              {revisionLabel(selected.revision.number)}
            </p>
            <h1>{selected.name}</h1>
            <p>
              {selected.description ||
                "No description provided. Inspect the configuration below to learn what this agent contains."}
            </p>
            <div className="detail-meta" aria-label="Agent metadata">
              <span>{revisionLabel(selected.revision.number)}</span>
              <span>
                Updated {timestampLabel(selected.revision.createdAt)}
              </span>
              <span>{history.length} {history.length === 1 ? "revision" : "revisions"}</span>
            </div>
          </div>
          <span className="runtime-badge">
            <span className="status-dot" />
            {config.runtime.name} <code>{config.runtime.version}</code>
          </span>
        </header>
        {historical ? (
          <div className="history-banner">
            <History size={18} />
            <span>
              You’re inspecting {revisionLabel(selected.revision.number)}. CLI
              pull and update always retrieve the latest revision.
            </span>
            <Link href={`/agents/${name}`}>Return to latest →</Link>
          </div>
        ) : null}
        <div className="detail-grid">
          <div className="detail-main">
            <div className="section-heading">
              <h2>
                <FileCode2 size={18} /> Configuration overview
              </h2>
              <span className="text-label">selected revision</span>
            </div>
            <div className="config-facts">
              <div>
                <span>Runtime</span>
                <strong>
                  {config.runtime.name} <code>{config.runtime.version}</code>
                </strong>
              </div>
              <div>
                <span>Model</span>
                <strong>
                  {config.model.provider} / {config.model.name}
                </strong>
              </div>
              <div>
                <span>Filesystem</span>
                <strong>{config.permissions.filesystem}</strong>
              </div>
              <div>
                <span>Shell</span>
                <strong>{config.permissions.shell}</strong>
              </div>
            </div>
            <section id="configuration" className="configuration">
              <div className="section-heading">
                <h2>Raw YAML</h2>
                <span className="text-label">exact stored configuration</span>
              </div>
              <YamlView
                text={selected.yaml}
                revision={revisionLabel(selected.revision.number)}
              />
            </section>
            <Resources title="Skills" resources={config.resources.skills} />
            <Resources title="Packages" resources={config.resources.packages} />
            {config.resources.skills.length ||
            config.resources.packages.length ? (
              <p className="resource-note">
                Sources are installed by the CLI. Version pins belong in the
                source reference; separate version fields are unsupported. Review
                sources before installing.
              </p>
            ) : null}
            {config.mcp?.servers && Object.keys(config.mcp.servers).length ? (
              <section className="resource-section">
                <h2>
                  MCP servers{" "}
                  <span className="count">
                    {Object.keys(config.mcp.servers).length}
                  </span>
                </h2>
                <p className="muted">
                  {Object.keys(config.mcp.servers).join(", ")}. Transport and
                  tool settings are in the YAML below.
                </p>
              </section>
            ) : null}
            {config.secrets.length ? (
              <section className="resource-section">
                <h2>Local environment</h2>
                <p className="muted">
                  Provide these values in your local Mantle .env file. The
                  registry stores the names only.
                </p>
                <div className="secret-names">
                  {config.secrets.map((secret) => (
                    <code key={secret}>{secret}</code>
                  ))}
                </div>
              </section>
            ) : null}
            <section className="changes">
              <h2>
                {previous
                  ? `Changes from ${revisionLabel(previous.revision.number)}`
                  : "The first revision"}
              </h2>
              {previous ? (
                <ul>
                  {revisionChanges(previous.config, config).map((change) => (
                    <li key={change}>{change}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted">
                  This is the first stored configuration for this agent.
                </p>
              )}
            </section>
          </div>
          <aside className="detail-sidebar">
            <section className="install-panel">
              <p className="eyebrow">CLI commands</p>
              <h2>Pull or update</h2>
              <p>
                The CLI retrieves the latest configuration and installs its
                declared resources.
              </p>
              <Command>{`mantle cloud pull ${name}`}</Command>
              <p className="small">Already on this machine? Get the latest:</p>
              <Command>{`mantle cloud update ${name}`}</Command>
            </section>
            <section className="history-panel">
              <div className="section-heading">
                <h2>
                  <History size={17} /> Revisions
                </h2>
                <span className="count">{history.length}</span>
              </div>
              <p className="small muted">
                Changed YAML creates a new immutable revision. Previous
                versions remain available for inspection.
              </p>
              <ol>
                {history.map((item) => (
                  <li key={item.number}>
                    <Link
                      href={
                        item.number === latest.revision.number
                          ? `/agents/${name}`
                          : `/agents/${name}?revision=${item.number}`
                      }
                      aria-current={
                        selected.revision.number === item.number
                          ? "page"
                          : undefined
                      }
                    >
                      <span className="revision-marker" />
                      <span>
                        <strong>
                          {revisionLabel(item.number)}{" "}
                          {item.number === latest.revision.number ? (
                            <em>latest</em>
                          ) : null}
                        </strong>
                        <time dateTime={item.createdAt} title={item.createdAt}>
                          {timestampLabel(item.createdAt)}
                        </time>
                        <code>{item.sha256.slice(0, 12)}</code>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
              <dl className="timestamps">
                <dt>Created</dt>
                <dd>
                  <time dateTime={history.at(-1)!.createdAt}>
                    {timestampLabel(history.at(-1)!.createdAt)}
                  </time>
                </dd>
                <dt>Updated</dt>
                <dd>
                  <time dateTime={latest.revision.createdAt}>
                    {timestampLabel(latest.revision.createdAt)}
                  </time>
                </dd>
              </dl>
            </section>
          </aside>
        </div>
      </main>
    );
  } catch (error) {
    if (error instanceof RepositoryError && [400, 404].includes(error.status))
      notFound();
    throw error;
  }
}
