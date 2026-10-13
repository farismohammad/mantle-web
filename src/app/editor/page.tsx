import { AgentRepository } from "@/components/agent-repository";
import { getLatest, listAgents, listRevisions } from "@/server/repository";

export const metadata = { title: "YAML editor" };
export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const agents = await listAgents();
  const initial = agents[0] ? await getLatest(agents[0].name) : null;
  const revisions = initial ? await listRevisions(initial.name) : [];
  return (
    <AgentRepository
      initialAgents={agents}
      initialAgent={initial}
      initialRevisions={revisions}
    />
  );
}
