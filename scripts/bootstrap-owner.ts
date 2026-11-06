import { loadEnvConfig } from "@next/env";
import { and, count, eq } from "drizzle-orm";
import type { PoolClient } from "pg";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/db";
import { member, organization, user } from "@/db/schema/auth";
import { createBootstrapOrganizationWithOwner } from "./lib/bootstrap-organization";

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());

  const email = process.env.CRM_OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.CRM_OWNER_PASSWORD;
  const name = process.env.CRM_OWNER_NAME?.trim();
  const organizationName = process.env.CRM_ORGANIZATION_NAME?.trim();
  const slug = process.env.CRM_ORGANIZATION_SLUG?.trim().toLowerCase();

  if (!email || !password || !name || !organizationName || !slug) {
    throw new Error("Defina CRM_OWNER_EMAIL, CRM_OWNER_PASSWORD, CRM_OWNER_NAME, CRM_ORGANIZATION_NAME e CRM_ORGANIZATION_SLUG apenas no ambiente local.");
  }
  if (password.length < 12 || password.length > 128) throw new Error("A senha do OWNER deve ter entre 12 e 128 caracteres.");

  const db = getDb();
  const lockKey = "7340219884107221";
  let lockClient: PoolClient | undefined;
  let phase = "preparação";
  let userCreated = false;
  let organizationCreated = false;

  try {
    const client = await db.$client.connect();
    lockClient = client;
    await client.query("SELECT pg_advisory_lock($1::bigint)", [lockKey]);

    phase = "verificação inicial";
    const [[users], [organizations], [members]] = await Promise.all([
      db.select({ total: count() }).from(user),
      db.select({ total: count() }).from(organization),
      db.select({ total: count() }).from(member),
    ]);
    if ([users, organizations, members].some((row) => Number(row.total) !== 0)) {
      throw new Error("public.user, public.organization e public.member precisam estar vazias.");
    }

    phase = "criação do usuário";
    const auth = getAuth({ bootstrap: true });
    const created = await auth.api.signUpEmail({ body: { name, email, password } });
    if (!created?.user?.id) throw new Error("Better Auth não retornou o usuário inicial.");
    userCreated = true;

    phase = "criação da organização";
    const createdOrganization = await createBootstrapOrganizationWithOwner({
      ownerUserId: created.user.id,
      name: organizationName,
      slug,
    });
    const organizationId = createdOrganization.organization.id;
    organizationCreated = true;

    phase = "verificação da associação OWNER";
    const [ownerMembership] = await db.select({ id: member.id })
      .from(member)
      .where(and(
        eq(member.userId, created.user.id),
        eq(member.organizationId, organizationId),
        eq(member.role, "owner"),
      ))
      .limit(1);
    if (!ownerMembership) throw new Error("Usuário foi criado, mas a associação OWNER não foi confirmada.");

    console.log("Workspace e usuário OWNER inicial criados. Remova as variáveis CRM_OWNER_* do ambiente.");
  } catch {
    console.error(`Bootstrap interrompido na etapa: ${phase}. O erro original foi omitido para evitar registrar dados ou segredos.`);
    console.error(`Estado parcial: usuário ${userCreated ? "criado" : "não confirmado"}; organização ${organizationCreated ? "criada" : "não confirmada"}. Nenhum registro foi removido.`);
    throw new Error("Bootstrap do OWNER interrompido.");
  } finally {
    try {
      if (lockClient) {
        try {
          await lockClient.query("SELECT pg_advisory_unlock($1::bigint)", [lockKey]);
        } finally {
          lockClient.release();
        }
      }
    } finally {
      await db.$client.end();
    }
  }
}

main().catch(() => {
  console.error("Bootstrap do OWNER não concluído. Verifique as variáveis locais e a disponibilidade do banco sem compartilhar segredos.");
  process.exitCode = 1;
});
