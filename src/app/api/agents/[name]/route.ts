import { NextResponse } from "next/server";
import { dataResponse, handleRouteError, readYamlBody } from "@/server/http";
import { deleteAgent, getLatest, saveAgent } from "@/server/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ name: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    return dataResponse(await getLatest((await context.params).name));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    const name = (await context.params).name;
    const yaml = await readYamlBody(request);
    return dataResponse(await saveAgent(name, yaml));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    await deleteAgent((await context.params).name);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
