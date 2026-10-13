import { NextResponse } from "next/server";
import { RepositoryError } from "@/server/repository";

export async function readYamlBody(request: Request): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1_000_000) {
        await reader.cancel();
        throw new RepositoryError(
          413,
          "CONFIG_TOO_LARGE",
          "agent.yaml must be 1 MB or smaller.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function dataResponse<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
) {
  return NextResponse.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status },
  );
}

export function handleRouteError(error: unknown) {
  if (error instanceof RepositoryError)
    return errorResponse(
      error.status,
      error.code,
      error.message,
      error.details,
    );
  console.error(error);
  return errorResponse(
    500,
    "INTERNAL_ERROR",
    "Mantle Cloud could not complete the request.",
  );
}
