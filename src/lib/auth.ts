import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { organization as organizationPlugin } from "better-auth/plugins";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { and, asc, count, eq } from "drizzle-orm";
import { authSchema } from "@/db/schema/auth";
import { getDb } from "@/db";
import { member } from "@/db/schema/auth";
import { clients, deals, tasks } from "@/db/schema/crm";
import { organizationAccessControl, organizationRoles } from "@/lib/organization-access";
import { MemberRoleChangeError, updateMemberRoleWithAudit } from "@/modules/team/member-role-service";
import { createBetterAuthLogAdapter } from "@/lib/safe-logger";

type AuthInstance = ReturnType<typeof createAuth>;
let standardAuth: AuthInstance | undefined;

export function getAuth(options: { bootstrap?: boolean } = {}) {

  if (options.bootstrap) {

    return createAuth(true);

  }

  standardAuth ??= createAuth(false);

  return standardAuth;
}

function createAuth(bootstrap: boolean) {

  const secret = process.env.BETTER_AUTH_SECRET;

  if (!secret || secret.length < 32) {

    throw new Error("BETTER_AUTH_SECRET ausente ou curto. Gere um segredo aleatório de pelo menos 32 caracteres em .env.local.");

  }

  async function getAssignmentCounts(organizationId: string, userId: string) {
    
    const db = getDb();
    const [clientRows, dealRows, taskRows] = await Promise.all([
      db.select({ total: count() }).from(clients).where(and(
        eq(clients.organizationId, organizationId),
        eq(clients.ownerUserId, userId),
      )),
      db.select({ total: count() }).from(deals).where(and(
        eq(deals.organizationId, organizationId),
        eq(deals.ownerUserId, userId),
      )),
      db.select({ total: count() }).from(tasks).where(and(
        eq(tasks.organizationId, organizationId),
        eq(tasks.assigneeUserId, userId),
      )),
    ]);

    return {
      clients: clientRows[0]?.total ?? 0,
      deals: dealRows[0]?.total ?? 0,
      tasks: taskRows[0]?.total ?? 0,
    };
  }

  return betterAuth({
    appName: "Rota CRM",
    logger: createBetterAuthLogAdapter(),
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    secret,
    trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
    database: drizzleAdapter(getDb(), { provider: "pg", schema: authSchema }),

    // Better Call logs non-API errors to console after an observational hook returns.
    // Propagate them to the Next route boundary, where details are redacted.
    onAPIError: { throw: true },
    emailAndPassword: {
      enabled: true,
      disableSignUp: !bootstrap,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      autoSignIn: false,
      revokeSessionsOnPasswordReset: true,
    },
    plugins: [organizationPlugin({
      allowUserToCreateOrganization: false,
      disableOrganizationDeletion: true,
      creatorRole: "owner",
      ac: organizationAccessControl,
      roles: organizationRoles,
      requireEmailVerificationOnInvitation: true,
      sendInvitationEmail: async () => {

        throw new Error("Convites dependem da configuração de um serviço de e-mail.");

      },
      organizationHooks: {
        beforeRemoveMember: async ({ member: targetMembership, user: targetUser, organization: targetOrganization }) => {

          // Esses valores vêm do fluxo Better Auth após a validação da organização
          // e da membership alvo. Falha fechada se o contexto for inconsistente.
          if (targetMembership.organizationId !== targetOrganization.id || targetMembership.userId !== targetUser.id) {

            throw APIError.from("INTERNAL_SERVER_ERROR", {
              code: "MEMBER_REMOVAL_CONTEXT_INVALID",
              message: "Não foi possível validar a remoção do membro.",
            });

          }

          const assignments = await getAssignmentCounts(targetOrganization.id, targetMembership.userId);

          if (assignments.clients + assignments.deals + assignments.tasks > 0) {

            throw APIError.from("CONFLICT", {
              code: "MEMBER_HAS_ASSIGNMENTS",
              message: `Este membro ainda possui responsabilidades atribuídas (clientes: ${assignments.clients}, oportunidades: ${assignments.deals}, tarefas: ${assignments.tasks}, incluindo registros arquivados). Transfira ou remova essas atribuições antes de retirá-lo da equipe.`,
            });

          }
        },
        beforeUpdateMemberRole: async ({ member: target, newRole }) => {

          if (target.role.toLowerCase().split(",").includes("owner") || newRole.toLowerCase().split(",").includes("owner")) {

            throw APIError.from("FORBIDDEN", {
              code: "OWNER_ROLE_PROTECTED",
              message: "O papel do proprietário está protegido.",
            });

          }
        },
      },
    })],
    hooks: {
      before: createAuthMiddleware(async (requestContext) => {

        if (requestContext.path === "/organization/update-member-role" && requestContext.method === "POST") {

          const body: unknown = requestContext.body;

          if (!body || typeof body !== "object") {

            throw APIError.from("BAD_REQUEST", { code: "INVALID_MEMBER_ROLE_CHANGE", message: "Informe um membro e papel válidos." });

          }

          const { organizationId, memberId: targetMemberId, role } = body as Record<string, unknown>;

          if (typeof organizationId !== "string" || typeof targetMemberId !== "string" || typeof role !== "string") {

            throw APIError.from("BAD_REQUEST", { code: "INVALID_MEMBER_ROLE_CHANGE", message: "Informe um membro e papel válidos." });

          }

          const requestHeaders = new Headers(requestContext.headers ?? requestContext.request?.headers);
          const session = await getAuth().api.getSession({ headers: requestHeaders });

          if (!session) throw APIError.from("UNAUTHORIZED", { code: "UNAUTHORIZED", message: "Autenticação necessária." });

          if (session.session.activeOrganizationId !== organizationId) {

            throw APIError.from("FORBIDDEN", { code: "ROLE_CHANGE_FORBIDDEN", message: "Você não tem permissão para alterar papéis neste workspace." });

          }

          try {

            const updatedMember = await updateMemberRoleWithAudit({
              organizationId,
              actorUserId: session.user.id,
              memberId: targetMemberId,
              role,
            });

            return { response: Response.json(updatedMember) };
          } catch (error) {

            if (error instanceof MemberRoleChangeError) {

              throw APIError.from(error.apiStatus, { code: error.code, message: error.message });

            }

            throw error;
          }
        }

        // Better Auth 1.7.14 não chama organizationHooks.beforeRemoveMember em
        // /organization/leave. O hook global roda antes do sessionMiddleware,
        // então a sessão é resolvida pela API pública usando os headers reais.
        if (requestContext.path !== "/organization/leave" || requestContext.method !== "POST") return;

        const body = requestContext.body;

        if (!body || typeof body !== "object") return;

        const organizationId = (body as Record<string, unknown>).organizationId;

        if (typeof organizationId !== "string" || organizationId.length === 0) return;

        const requestHeaders = new Headers(requestContext.headers ?? requestContext.request?.headers);
        const session = await getAuth().api.getSession({ headers: requestHeaders });

        if (!session) return; // O sessionMiddleware do endpoint rejeitará a chamada.

        // /organization/leave exige organizationId no body. Só consultamos
        // atribuições depois de confirmar que o solicitante pertence a ela.
        const [membership] = await getDb().select({ userId: member.userId }).from(member)
          .where(and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)))
          .limit(1);

        if (!membership) return; // O handler Better Auth responderá MEMBER_NOT_FOUND.

        const assignments = await getAssignmentCounts(organizationId, membership.userId);

        if (assignments.clients + assignments.deals + assignments.tasks > 0) {

          throw APIError.from("CONFLICT", {
            code: "MEMBER_HAS_ASSIGNMENTS",
            message: `Você ainda possui responsabilidades atribuídas nesta organização (clientes: ${assignments.clients}, oportunidades: ${assignments.deals}, tarefas: ${assignments.tasks}, incluindo registros arquivados). Solicite a transferência dessas responsabilidades antes de sair da equipe.`,
          });

        }
      }),
    },
    databaseHooks: {
      session: {
        create: {
          before: async (newSession) => {

            const memberships = await getDb()
              .select({ organizationId: member.organizationId })
              .from(member)
              .where(eq(member.userId, newSession.userId))
              .orderBy(asc(member.createdAt));
            const requestedMembership = memberships.find((item) => item.organizationId === newSession.activeOrganizationId);
            const activeOrganizationId = requestedMembership?.organizationId ?? (
              newSession.activeOrganizationId == null && memberships.length === 1
                ? memberships[0].organizationId
                : undefined
            );

            if (activeOrganizationId === newSession.activeOrganizationId) return undefined;

            return { data: { ...newSession, activeOrganizationId } };
          },
        },
      },
    },
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
    },
  });
}
