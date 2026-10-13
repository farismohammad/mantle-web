import {
  dataResponse,
  errorResponse,
  handleRouteError,
  readYamlBody,
} from "@/server/http";
import { formatAgentYaml, validateAgentYaml } from "@/domain/validation";

export const runtime = "nodejs";
async function validate(request: Request, format: boolean) {
  try {
    const yaml = await readYamlBody(request);
    const result = validateAgentYaml(yaml);
    if (!result.valid)
      return errorResponse(
        422,
        "INVALID_AGENT_CONFIG",
        "The YAML does not satisfy the Mantle schema.",
        { issues: result.issues },
      );
    return dataResponse(
      format ? { yaml: formatAgentYaml(yaml) } : { valid: true },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
export async function POST(request: Request) {
  return validate(request, false);
}
export async function PUT(request: Request) {
  return validate(request, true);
}
