"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { member, organization } from "@/db/schema/auth";
import { getAuth } from "@/lib/auth";

export async function selectWorkspace(formData: FormData): Promise<void> {
  
  const rawOrganizationId = formData.get("organizationId");
  const organizationId = typeof rawOrganizationId === "string" ? rawOrganizationId.trim() : "";

  if (!organizationId) redirect("/workspace/select?reason=invalid-selection");

  const requestHeaders = await headers();
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) redirect("/login?reason=session");

  // The submitted ID is only a request. Confirm current membership before asking
  // Better Auth to persist it; Better Auth validates membership again itself.
  const [authorizedMembership] = await getDb().select({ organizationId: member.organizationId })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(and(eq(member.userId, session.user.id), eq(member.organizationId, organizationId)))
    .limit(1);
  
  if (!authorizedMembership) redirect("/workspace/select?reason=invalid-selection");

  let selectedOrganizationId: string | undefined;

  try {

    const selected = await auth.api.setActiveOrganization({
      headers: requestHeaders,
      body: { organizationId: authorizedMembership.organizationId },
    });

    selectedOrganizationId = selected?.id;

  } catch {

    selectedOrganizationId = undefined;

  }

  if (selectedOrganizationId !== organizationId) {

    redirect("/workspace/select?reason=selection-failed");

  }

  redirect("/dashboard");

}
