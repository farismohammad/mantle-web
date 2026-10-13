import { Explore } from "@/components/explore";
import { listAgents } from "@/server/repository";

export const metadata = { title: "Agents" };
export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const agents = await listAgents();
  return (
    <main className="page registry-page" id="workspace">
      <header className="registry-heading">
        <div>
          <p className="eyebrow">
            <span className="status-dot" /> Mantle registry
          </p>
          <h1>Mantle agents</h1>
          <p>
            Agents available on this instance. Inspect configuration,
            resources, raw YAML, and revision history.
          </p>
        </div>
        <dl className="registry-summary">
          <div>
            <dt>Agents</dt>
            <dd>{agents.length}</dd>
          </div>
          <div>
            <dt>Storage</dt>
            <dd>Filesystem</dd>
          </div>
        </dl>
      </header>
      <Explore agents={agents} />
    </main>
  );
}
