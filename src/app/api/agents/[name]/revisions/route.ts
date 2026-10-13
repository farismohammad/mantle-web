import { dataResponse, handleRouteError } from "@/server/http";
import { listRevisions } from "@/server/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    return dataResponse(await listRevisions((await params).name));
  } catch (error) {
    return handleRouteError(error);
  }
}
