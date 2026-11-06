import { toNextJsHandler } from "better-auth/next-js";
import { and, eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/db";
import { member } from "@/db/schema/auth";
import { handleAuthRequestWithMappedErrors } from "@/lib/auth-http-error-context";
import { safeLogger } from "@/lib/safe-logger";

const handlers = toNextJsHandler(getAuth());

function handleAuthRoute(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try {
      const response = await handler(request);
      if (response.status >= 500) {
        safeLogger.error({ category: "authentication-error", operation: "auth.api", code: "INTERNAL_SERVER_ERROR" });
      }
      return response;
    } catch (error) {
      safeLogger.error({ category: "authentication-error", operation: "auth.api", code: "INTERNAL_SERVER_ERROR", error });
      return new Response(null, { status: 500, statusText: "Internal Server Error" });
    }
  };
}

export const GET = handleAuthRoute(handlers.GET);

export async function POST(request: Request) {
  const endpoint = new URL(request.url).pathname.replace(/\/$/, "");
  if (endpoint === "/api/auth/organization/leave" || endpoint === "/api/auth/organization/remove-member") {
    return handleAuthRoute(() => handleAuthRequestWithMappedErrors(endpoint, () => handlers.POST(request)))(request);
  }
  if (endpoint !== "/api/auth/organization/update-member-role") return handleAuthRoute(handlers.POST)(request);

  try {
    const body: unknown = await request.clone().json();
    if (!body || typeof body !== "object") return denied();
    const { organizationId, memberId, role } = body as Record<string, unknown>;
    if (typeof organizationId !== "string" || typeof memberId !== "string" || typeof role !== "string") return denied();

    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session || session.session.activeOrganizationId !== organizationId) return denied();

    const db = getDb();
    const [actor] = await db.select({ role: member.role }).from(member)
      .where(and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id))).limit(1);
    const [target] = await db.select({ userId: member.userId, role: member.role }).from(member)
      .where(and(eq(member.organizationId, organizationId), eq(member.id, memberId))).limit(1);

    if (actor?.role.toLowerCase() !== "owner" || !target || target.userId === session.user.id ||
      target.role.toLowerCase().split(",").includes("owner") || role.toLowerCase().split(",").includes("owner")) {
      return denied();
    }
  } catch (error) {
    safeLogger.warn({ category: "authorization-check", operation: "member.role.authorization", error });
    return denied();
  }

  return handleAuthRoute(handlers.POST)(request);
}

function denied() {
  return Response.json({ message: "Você não tem permissão para alterar este papel." }, { status: 403 });
}
