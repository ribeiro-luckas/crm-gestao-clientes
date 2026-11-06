import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeLogger } from "@/lib/safe-logger";
import { asc, eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/db";
import { member, organization } from "@/db/schema/auth";

export type WorkspaceRole = "owner" | "admin" | "member";
export type WorkspaceMembership = { organizationId: string; organizationName: string; role: string };
export type WorkspaceSelectionReason = "required" | "invalid" | "selection-failed";

type WorkspaceSelection =
  | { kind: "selected"; membership: WorkspaceMembership }
  | { kind: "unambiguous"; membership: WorkspaceMembership }
  | { kind: "choose"; reason: "required" | "invalid" }
  | { kind: "empty" };

export class WorkspaceAuthenticationError extends Error {
  
  constructor() { super("Autenticação necessária."); this.name = "WorkspaceAuthenticationError"; }

}

export class WorkspaceAuthorizationError extends Error {

  constructor() { super("Você não tem permissão para realizar esta ação."); this.name = "WorkspaceAuthorizationError"; }

}

export class WorkspaceSelectionRequiredError extends Error {

  readonly code = "WORKSPACE_SELECTION_REQUIRED";
  readonly selectionUrl = "/workspace/select";

  constructor(readonly reason: WorkspaceSelectionReason = "required") {

    super("Selecione novamente o workspace antes de continuar.");

    this.name = "WorkspaceSelectionRequiredError";

  }
}

const privateNoStore = { "Cache-Control": "private, no-store" };

/** A present active ID must match a current membership; only absence may use the sole membership. */
export function resolveWorkspaceSelection(
  activeOrganizationId: string | null | undefined,
  memberships: WorkspaceMembership[],
): WorkspaceSelection {

  if (memberships.length === 0) return { kind: "empty" };

  if (activeOrganizationId !== null && activeOrganizationId !== undefined) {

    const selected = memberships.find((item) => item.organizationId === activeOrganizationId);

    return selected ? { kind: "selected", membership: selected } : { kind: "choose", reason: "invalid" };
  }

  if (memberships.length === 1) return { kind: "unambiguous", membership: memberships[0] };

  return { kind: "choose", reason: "required" };
}

async function getMemberships(userId: string): Promise<WorkspaceMembership[]> {

  return getDb().select({
    organizationId: organization.id,
    organizationName: organization.name,
    role: member.role,
  }).from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(eq(member.userId, userId))
    .orderBy(asc(member.createdAt));
}

async function activateUnambiguousMembership(organizationId: string): Promise<boolean> {

  try {

    const active = await getAuth().api.setActiveOrganization({
      headers: await headers(),
      body: { organizationId },
    });

    return active?.id === organizationId;
  } catch {

    return false;
  }
}

function validRole(role: string): role is WorkspaceRole {

  return role === "owner" || role === "admin" || role === "member";
}

function contextFor(session: { user: { id: string; name: string; email: string } }, membership: WorkspaceMembership) {

  const role = membership.role.toLowerCase();

  if (!validRole(role)) return null;

  return {
    user: { id: session.user.id, name: session.user.name, email: session.user.email },
    organization: { id: membership.organizationId, name: membership.organizationName },
    role,
  };
}

/** Contexto para handlers HTTP: devolve erros tipados em vez de redirects de página. */
export async function requireApiWorkspaceRole(allowed: WorkspaceRole[]) {

  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) throw new WorkspaceAuthenticationError();

  const memberships = await getMemberships(session.user.id);
  const selection = resolveWorkspaceSelection(session.session.activeOrganizationId, memberships);

  let membership: WorkspaceMembership;

  switch (selection.kind) {

    case "selected":

      membership = selection.membership;

      break;

    case "unambiguous":

      if (!await activateUnambiguousMembership(selection.membership.organizationId)) {

        throw new WorkspaceSelectionRequiredError("selection-failed");

      }

      membership = selection.membership;

      break;

    case "choose":

      throw new WorkspaceSelectionRequiredError(selection.reason);

    case "empty":

      throw new WorkspaceAuthorizationError();

  }

  const context = contextFor(session, membership);

  if (!context || !allowed.includes(context.role)) throw new WorkspaceAuthorizationError();

  return context;
}

export function workspaceApiErrorResponse(error: unknown) {

  if (error instanceof WorkspaceAuthenticationError) {

    return Response.json({ message: "Autenticação necessária." }, { status: 401, headers: privateNoStore });
  }

  if (error instanceof WorkspaceSelectionRequiredError) {

    return Response.json({ code: error.code, message: error.message, selectionUrl: error.selectionUrl }, { status: 409, headers: privateNoStore });
  }

  if (error instanceof WorkspaceAuthorizationError) {

    return Response.json({ message: "Você não tem permissão para realizar esta ação." }, { status: 403, headers: privateNoStore });
  }

  safeLogger.error({ category: "internal-error", operation: "workspace.request", error });

  return Response.json({ message: "Erro interno." }, { status: 500, headers: privateNoStore });
}

export const getWorkspaceContext = cache(async () => {

  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) redirect("/login?reason=session");

  const memberships = await getMemberships(session.user.id);
  const selection = resolveWorkspaceSelection(session.session.activeOrganizationId, memberships);

  let membership: WorkspaceMembership;

  switch (selection.kind) {

    case "selected":

      membership = selection.membership;

      break;

    case "unambiguous":

      if (!await activateUnambiguousMembership(selection.membership.organizationId)) {

        redirect("/workspace/select?reason=selection-failed");

      }

      membership = selection.membership;

      break;

    case "choose":

      redirect(`/workspace/select?reason=${selection.reason}`);

    case "empty":

      redirect("/workspace/select?reason=no-workspaces");

  }

  const context = contextFor(session, membership);

  if (!context) redirect("/workspace/select?reason=invalid-role");

  return context;
});

export async function requireWorkspaceRole(allowed: WorkspaceRole[]) {
  
  const context = await getWorkspaceContext();

  if (!allowed.includes(context.role)) throw new Error("Você não tem permissão para realizar esta ação.");

  return context;
}
