import { dataResponse, handleRouteError } from "@/server/http";
import { listAgents } from "@/server/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return dataResponse(await listAgents());
  } catch (error) {
    return handleRouteError(error);
  }
}
