import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { member, organization, user } from "@/db/schema/auth";

type BootstrapOrganizationInput = {
  name: string;
  slug: string;
  ownerUserId: string;
};

/**
 * Internal CLI service. This module is intentionally kept under scripts/ and
 * is not exposed through a route or Server Action.
 *
 * The optional ID factory is an internal test seam for deterministic database
 * failures; production callers should omit it.
 */
export async function createBootstrapOrganizationWithOwner(
  input: BootstrapOrganizationInput,
  createId: () => string = randomUUID,
) {
  if (!input.name.trim() || !input.slug.trim() || !input.ownerUserId.trim()) {
    throw new Error("Nome, slug e usuário OWNER são obrigatórios para o bootstrap.");
  }

  return getDb().transaction(async (tx) => {
    // Keep the user row stable until the membership FK has been written.
    const [owner] = await tx.select({ id: user.id }).from(user)
      .where(eq(user.id, input.ownerUserId))
      .for("key share")
      .limit(1);
    if (!owner) throw new Error("O usuário OWNER do bootstrap não existe.");

    const [createdOrganization] = await tx.insert(organization).values({
      id: createId(),
      name: input.name,
      slug: input.slug,
      createdAt: new Date(),
    }).returning();
    if (!createdOrganization) throw new Error("Não foi possível criar a organização do bootstrap.");

    const [createdMembership] = await tx.insert(member).values({
      id: createId(),
      organizationId: createdOrganization.id,
      userId: owner.id,
      role: "owner",
      createdAt: new Date(),
    }).returning();
    if (!createdMembership) throw new Error("Não foi possível criar a membership OWNER do bootstrap.");

    return { organization: createdOrganization, membership: createdMembership };
  });
}
