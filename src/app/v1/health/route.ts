import { access, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import { dataResponse, errorResponse } from "@/server/http";
import { repositoryRoot } from "@/server/repository";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  try {
    const root = repositoryRoot();
    await mkdir(root, { recursive: true });
    await access(root, constants.R_OK | constants.W_OK);
    return dataResponse({
      status: "ok",
      service: "mantle-cloud",
      mode: "agent-repository",
    });
  } catch {
    return errorResponse(
      503,
      "STORAGE_UNAVAILABLE",
      "The repository volume is not accessible.",
    );
  }
}
