import { dataResponse, handleRouteError } from "@/server/http";
import { getRevision } from "@/server/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string; revision: string }> },
) {
  try {
    const { name, revision } = await params;
    return dataResponse(await getRevision(name, Number(revision)));
  } catch (error) {
    return handleRouteError(error);
  }
}
