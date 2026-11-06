# Variáveis da aplicação, scripts e configuração

Inventário de variáveis obtido do AST e dos tipos resolvidos pelo TypeScript. Valores literais de inicialização não são publicados. “Origem” registra a forma da expressão inicializadora, não seu valor. Parâmetros constam junto às assinaturas da referência de funções; propriedades de interfaces/classes são catalogadas em seção própria.

## drizzle.migrate.config.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 3 | `migrationUrl` | module | `string \| undefined` | sim | propriedade DATABASE_URL_MIGRATIONS |

## drizzle.test.config.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 3 | `rawUrl` | module | `string \| undefined` | sim | propriedade TEST_DATABASE_URL |
| 11 | `testUrl` | module | `URL` | não | sem inicializador |
| 19 | `databaseName` | module | `string` | sim | chamada decodeURIComponent |
| 23 | `username` | module | `string` | sim | chamada decodeURIComponent |
| 24 | `port` | module | `string` | sim | expressão \|\| |
| 40 | `crmRawUrl` | module | `string \| undefined` | sim | propriedade DATABASE_URL |
| 43 | `crmUrl` | module | `URL` | não | sem inicializador |
| 53 | `crmDatabase` | module | `string` | sim | chamada decodeURIComponent |
| 57 | `crmPort` | module | `string` | sim | expressão \|\| |

## next.config.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 3 | `nextConfig` | module | `NextConfig` | sim | objeto/configuração |

## playwright.config.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 5 | `testUrl` | module | `{ testUrl: string; }` | sim | chamada validateTestDatabaseIsolation |
| 9 | `e2eBaseUrl` | module | `"http://127.0.0.1:3100"` | sim | literal string (valor omitido) |

## scripts/bootstrap-owner.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 12 | `email` | main | `string \| undefined` | sim | chamada process.env.CRM_OWNER_EMAIL?.trim().toLowerCase |
| 13 | `password` | main | `string \| undefined` | sim | propriedade CRM_OWNER_PASSWORD |
| 14 | `name` | main | `string \| undefined` | sim | chamada process.env.CRM_OWNER_NAME?.trim |
| 15 | `organizationName` | main | `string \| undefined` | sim | chamada process.env.CRM_ORGANIZATION_NAME?.trim |
| 16 | `slug` | main | `string \| undefined` | sim | chamada process.env.CRM_ORGANIZATION_SLUG?.trim().toLowerCase |
| 23 | `db` | main | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 24 | `lockKey` | main | `"7340219884107221"` | sim | literal string (valor omitido) |
| 25 | `lockClient` | main | `PoolClient \| undefined` | não | sem inicializador |
| 26 | `phase` | main | `string` | sim | literal string (valor omitido) |
| 27 | `userCreated` | main | `boolean` | sim | literal escalar (valor omitido) |
| 28 | `organizationCreated` | main | `boolean` | sim | literal escalar (valor omitido) |
| 31 | `client` | main | `PoolClient` | sim | chamada db.$client.connect |
| 36 | `users` | main | `[{ total: number; }[], { total: number; }[], { total: number; }[]]` | sim | chamada Promise.all |
| 36 | `organizations` | main | `[{ total: number; }[], { total: number; }[], { total: number; }[]]` | sim | chamada Promise.all |
| 36 | `members` | main | `[{ total: number; }[], { total: number; }[], { total: number; }[]]` | sim | chamada Promise.all |
| 46 | `auth` | main | `Auth<{ appName: string; logger: { level: "warn"; disableColors: boolean; log(level: BetterAuthLogLevel, mes…` | sim | chamada getAuth |
| 47 | `created` | main | `{ token: null; user: { id: string; createdAt: Date; updatedAt: Date; email: string; emailVerified: boolean;…` | sim | chamada auth.api.signUpEmail |
| 52 | `createdOrganization` | main | `{ organization: { id: string; name: string; createdAt: Date; slug: string; logo: string \| null; metadata: …` | sim | chamada createBootstrapOrganizationWithOwner |
| 57 | `organizationId` | main | `string` | sim | propriedade id |
| 61 | `ownerMembership` | main | `{ id: string; }[]` | sim | chamada db.select({ id: member.id }) .from(member) .where(and( eq(member.userI |

## scripts/lib/bootstrap-organization.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 29 | `owner` | createBootstrapOrganizationWithOwner | `{ id: string; }[]` | sim | chamada tx.select({ id: user.id }).from(user) .where(eq(user.id, input.ownerUs |
| 35 | `createdOrganization` | createBootstrapOrganizationWithOwner | `{ id: string; name: string; createdAt: Date; slug: string; logo: string \| null; metadata: string \| null; }[]` | sim | chamada tx.insert(organization).values({ id: createId(), name: input.name, slu |
| 43 | `createdMembership` | createBootstrapOrganizationWithOwner | `{ id: string; createdAt: Date; userId: string; organizationId: string; role: string; }[]` | sim | chamada tx.insert(member).values({ id: createId(), organizationId: createdOrga |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 7 | `name` | `string` | module |
| 8 | `slug` | `string` | module |
| 9 | `ownerUserId` | `string` | module |

## src/proxy.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 5 | `LOOPBACK_HOSTS` | module | `Set<string>` | sim | instância Set |
| 15 | `nonce` | proxy | `string` | sim | chamada randomBytes(18).toString |
| 16 | `isDevelopment` | proxy | `boolean` | sim | expressão \|\| |
| 17 | `websocketOrigin` | proxy | `string \| undefined` | sim | condição derivada |
| 20 | `policy` | proxy | `string` | sim | chamada buildContentSecurityPolicy |
| 25 | `requestHeaders` | proxy | `Headers` | sim | instância Headers |
| 31 | `response` | proxy | `NextResponse<unknown>` | sim | chamada NextResponse.next |
| 44 | `config` | module | `{ matcher: { source: string; missing: ({ type: string; key: string; value?: undefined; } \| { type: string;…` | sim | objeto/configuração |

## src/app/api/auth/[...all]/route.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 9 | `handlers` | module | `{ GET: (request: Request) => Promise<Response>; POST: (request: Request) => Promise<Response>; PATCH: (requ…` | sim | chamada toNextJsHandler |
| 14 | `response` | handleAuthRoute | `Response` | sim | chamada handler |
| 19 | `error` | handleAuthRoute | `unknown` | não | sem inicializador |
| 26 | `GET` | module | `(request: Request) => Promise<Response>` | sim | chamada handleAuthRoute |
| 29 | `endpoint` | POST | `string` | sim | chamada new URL(request.url).pathname.replace |
| 36 | `body` | POST | `unknown` | sim | chamada request.clone().json |
| 38 | `organizationId` | POST | `Record<string, unknown>` | sim | alias body |
| 38 | `memberId` | POST | `Record<string, unknown>` | sim | alias body |
| 38 | `role` | POST | `Record<string, unknown>` | sim | alias body |
| 41 | `auth` | POST | `Auth<{ appName: string; logger: { level: "warn"; disableColors: boolean; log(level: BetterAuthLogLevel, mes…` | sim | chamada getAuth |
| 42 | `session` | POST | `{ session: { id: string; createdAt: Date; updatedAt: Date; userId: string; expiresAt: Date; token: string; …` | sim | chamada auth.api.getSession |
| 45 | `db` | POST | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 46 | `actor` | POST | `{ role: string; }[]` | sim | chamada db.select({ role: member.role }).from(member) .where(and(eq(member.org |
| 48 | `target` | POST | `{ userId: string; role: string; }[]` | sim | chamada db.select({ userId: member.userId, role: member.role }).from(member) . |
| 55 | `error` | POST | `unknown` | não | sem inicializador |

## src/app/api/export/clients.csv/route.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 9 | `context` | GET | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: Wo…` | sim | chamada requireApiWorkspaceRole |
| 10 | `params` | GET | `URLSearchParams` | sim | propriedade searchParams |
| 11 | `q` | GET | `string` | sim | expressão ?? |
| 12 | `status` | GET | `string` | sim | expressão ?? |
| 13 | `filters` | GET | `SQL<unknown>[]` | sim | lista |
| 19 | `db` | GET | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 20 | `rows` | GET | `{ id: string; organizationId: string; kind: "person" \| "company"; name: string; email: string \| null; pho…` | sim | chamada db.select().from(clients).where(and(...filters)).orderBy(clients.name) |
| 24 | `content` | GET | `string` | sim | chamada csvDocument |
| 26 | `error` | GET | `unknown` | não | sem inicializador |

## src/app/api/export/deals.csv/route.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 7 | `stages` | module | `readonly ["new_lead", "qualification", "proposal", "negotiation", "won", "lost"]` | sim | lista |
| 11 | `context` | GET | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: Wo…` | sim | chamada requireApiWorkspaceRole |
| 12 | `params` | GET | `URLSearchParams` | sim | propriedade searchParams |
| 13 | `q` | GET | `string` | sim | expressão ?? |
| 14 | `stage` | GET | `string` | sim | expressão ?? |
| 15 | `conditions` | GET | `SQL<unknown>[]` | sim | lista |
| 21 | `rows` | GET | `{ deal: { id: string; organizationId: string; clientId: string; title: string; stage: "new_lead" \| "qualif…` | sim | chamada getDb().select({ deal: deals, clientName: clients.name }).from(deals). |
| 23 | `db` | GET | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 27 | `content` | GET | `string` | sim | chamada csvDocument |
| 30 | `error` | GET | `unknown` | não | sem inicializador |

## src/components/team/assignment-transfer-utils.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 9 | `sourceExists` | isValidAssignmentTransfer | `boolean` | sim | chamada members.some |
| 10 | `destinationExists` | isValidAssignmentTransfer | `boolean` | sim | expressão \|\| |

## src/db/index.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 6 | `globalForDb` | module | `{ crmPool?: Pool; crmDb?: ReturnType<typeof createDatabase>; }` | sim | alias globalThis |
| 9 | `url` | getPool | `string \| undefined` | sim | condição derivada |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 6 | `crmPool` | `Pool \| undefined` | module |
| 6 | `crmDb` | `(NodePgDatabase<typeof schema> & { $client: Pool; }) \| undefined` | module |

## src/db/test-url.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 3 | `url` | getIsolatedTestDatabaseUrl | `URL` | não | sem inicializador |
| 9 | `database` | getIsolatedTestDatabaseUrl | `string` | sim | chamada decodeURIComponent |
| 10 | `username` | getIsolatedTestDatabaseUrl | `string` | sim | chamada decodeURIComponent |

## src/db/schema/auth.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 4 | `instant` | module | `(name: string) => PgTimestampBuilderInitial<string>` | sim | função/callback |
| 6 | `user` | module | `PgTableWithColumns<{ name: "user"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "use…` | sim | chamada pgTable |
| 16 | `session` | module | `PgTableWithColumns<{ name: "session"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "…` | sim | chamada pgTable |
| 28 | `account` | module | `PgTableWithColumns<{ name: "account"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "…` | sim | chamada pgTable |
| 44 | `verification` | module | `PgTableWithColumns<{ name: "verification"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableNa…` | sim | chamada pgTable |
| 53 | `organization` | module | `PgTableWithColumns<{ name: "organization"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableNa…` | sim | chamada pgTable |
| 62 | `member` | module | `PgTableWithColumns<{ name: "member"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "m…` | sim | chamada pgTable |
| 73 | `organizationOwnerGuard` | module | `PgTableWithColumns<{ name: "organization_owner_guard"; schema: undefined; columns: { organizationId: PgColu…` | sim | chamada pgTable |
| 78 | `invitation` | module | `PgTableWithColumns<{ name: "invitation"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName…` | sim | chamada pgTable |
| 91 | `authSchema` | module | `{ user: PgTableWithColumns<{ name: "user"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableNa…` | sim | objeto/configuração |

## src/db/schema/crm.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 5 | `instant` | module | `(name: string) => PgTimestampBuilderInitial<string>` | sim | função/callback |
| 7 | `clientKind` | module | `PgEnum<["person", "company"]>` | sim | chamada pgEnum |
| 8 | `clientStatus` | module | `PgEnum<["active", "prospect", "inactive"]>` | sim | chamada pgEnum |
| 9 | `dealStage` | module | `PgEnum<["new_lead", "qualification", "proposal", "negotiation", "won", "lost"]>` | sim | chamada pgEnum |
| 10 | `taskPriority` | module | `PgEnum<["low", "normal", "high", "urgent"]>` | sim | chamada pgEnum |
| 11 | `taskStatus` | module | `PgEnum<["todo", "in_progress", "done", "canceled"]>` | sim | chamada pgEnum |
| 12 | `activityType` | module | `PgEnum<["call", "meeting", "email", "note", "follow_up"]>` | sim | chamada pgEnum |
| 14 | `clients` | module | `PgTableWithColumns<{ name: "clients"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "…` | sim | chamada pgTable |
| 36 | `contacts` | module | `PgTableWithColumns<{ name: "contacts"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: …` | sim | chamada pgTable |
| 54 | `deals` | module | `PgTableWithColumns<{ name: "deals"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "de…` | sim | chamada pgTable |
| 84 | `tasks` | module | `PgTableWithColumns<{ name: "tasks"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName: "ta…` | sim | chamada pgTable |
| 110 | `activities` | module | `PgTableWithColumns<{ name: "activities"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName…` | sim | chamada pgTable |
| 131 | `auditLogs` | module | `PgTableWithColumns<{ name: "audit_logs"; schema: undefined; columns: { id: PgColumn<{ name: "id"; tableName…` | sim | chamada pgTable |

## src/lib/auth-client.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 7 | `authClient` | module | `ReactAuthClient<{ plugins: { id: "organization"; version: string; $InferServerPlugin: OrganizationPlugin<{ …` | sim | chamada createAuthClient |

## src/lib/auth-http-error-context.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 11 | `requestContext` | module | `AsyncLocalStorage<AuthRequestErrorContext>` | sim | instância AsyncLocalStorage |
| 12 | `protectedMembershipEndpoints` | module | `Set<string>` | sim | instância Set |
| 19 | `context` | recordOrganizationOwnerInvariantError | `AuthRequestErrorContext \| undefined` | sim | chamada requestContext.getStore |
| 21 | `mappedError` | recordOrganizationOwnerInvariantError | `OrganizationOwnerConflict \| undefined` | sim | chamada mapOrganizationRequiresOwnerError |
| 29 | `context` | recordMemberAssignmentIntegrityError | `AuthRequestErrorContext \| undefined` | sim | chamada requestContext.getStore |
| 31 | `mappedError` | recordMemberAssignmentIntegrityError | `MemberAssignmentConflict \| undefined` | sim | chamada mapMemberAssignmentIntegrityError |
| 43 | `headers` | getOrganizationOwnerConflictResponse | `Headers` | sim | instância Headers |
| 57 | `headers` | getMemberAssignmentConflictResponse | `Headers` | sim | instância Headers |
| 69 | `context` | handleAuthRequestWithMappedErrors | `AuthRequestErrorContext` | sim | objeto/configuração |
| 71 | `response` | handleAuthRequestWithMappedErrors | `Response` | não | sem inicializador |
| 74 | `error` | handleAuthRequestWithMappedErrors | `unknown` | não | sem inicializador |
| 83 | `ownerResponse` | handleAuthRequestWithMappedErrors | `Response` | sim | chamada getOrganizationOwnerConflictResponse |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 6 | `pathname` | `string` | module |
| 7 | `organizationOwnerConflict` | `OrganizationOwnerConflict \| undefined` | module |
| 8 | `memberAssignmentConflict` | `MemberAssignmentConflict \| undefined` | module |

## src/lib/auth.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 15 | `standardAuth` | module | `Auth<{ appName: string; logger: { level: "warn"; disableColors: boolean; log(level: BetterAuthLogLevel, mes…` | não | sem inicializador |
| 32 | `secret` | createAuth | `string \| undefined` | sim | propriedade BETTER_AUTH_SECRET |
| 41 | `db` | getAssignmentCounts | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 42 | `clientRows` | getAssignmentCounts | `[{ total: number; }[], { total: number; }[], { total: number; }[]]` | sim | chamada Promise.all |
| 42 | `dealRows` | getAssignmentCounts | `[{ total: number; }[], { total: number; }[], { total: number; }[]]` | sim | chamada Promise.all |
| 42 | `taskRows` | getAssignmentCounts | `[{ total: number; }[], { total: number; }[], { total: number; }[]]` | sim | chamada Promise.all |
| 103 | `assignments` | createAuth | `{ clients: number; deals: number; tasks: number; }` | sim | chamada getAssignmentCounts |
| 124 | `body` | createAuth | `unknown` | sim | propriedade body |
| 129 | `organizationId` | createAuth | `Record<string, unknown>` | sim | alias body |
| 129 | `targetMemberId` | createAuth | `Record<string, unknown>` | sim | alias body |
| 129 | `role` | createAuth | `Record<string, unknown>` | sim | alias body |
| 134 | `requestHeaders` | createAuth | `Headers` | sim | instância Headers |
| 135 | `session` | createAuth | `{ session: { id: string; createdAt: Date; updatedAt: Date; userId: string; expiresAt: Date; token: string; …` | sim | chamada getAuth().api.getSession |
| 142 | `updatedMember` | createAuth | `{ id: string; userId: string; organizationId: string; role: string; }` | sim | chamada updateMemberRoleWithAudit |
| 149 | `error` | createAuth | `unknown` | não | sem inicializador |
| 162 | `body` | createAuth | `any` | sim | propriedade body |
| 164 | `organizationId` | createAuth | `unknown` | sim | propriedade organizationId |
| 167 | `requestHeaders` | createAuth | `Headers` | sim | instância Headers |
| 168 | `session` | createAuth | `{ session: { id: string; createdAt: Date; updatedAt: Date; userId: string; expiresAt: Date; token: string; …` | sim | chamada getAuth().api.getSession |
| 173 | `membership` | createAuth | `{ userId: string; }[]` | sim | chamada getDb().select({ userId: member.userId }).from(member) .where(and(eq(m |
| 178 | `assignments` | createAuth | `{ clients: number; deals: number; tasks: number; }` | sim | chamada getAssignmentCounts |
| 191 | `memberships` | createAuth | `{ organizationId: string; }[]` | sim | chamada getDb() .select({ organizationId: member.organizationId }) .from(membe |
| 196 | `requestedMembership` | createAuth | `{ organizationId: string; } \| undefined` | sim | chamada memberships.find |
| 197 | `activeOrganizationId` | createAuth | `string \| undefined` | sim | expressão ?? |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 17 | `bootstrap` | `boolean \| undefined` | getAuth |

## src/lib/content-security-policy.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 9 | `directives` | buildContentSecurityPolicy | `string[]` | sim | lista |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 7 | `development` | `boolean` | buildContentSecurityPolicy |
| 7 | `websocketOrigin` | `string \| undefined` | buildContentSecurityPolicy |

## src/lib/csv.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 3 | `text` | csvCell | `string` | sim | condição derivada |

## src/lib/deal-linked-tasks-error.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 1 | `DEAL_LINKED_TASKS_SQLSTATE` | module | `"23001"` | sim | literal string (valor omitido) |
| 2 | `DEAL_LINKED_TASKS_CONSTRAINT` | module | `"tasks_deal_client_consistency_fk"` | sim | literal string (valor omitido) |
| 12 | `visited` | mapDealLinkedTasksError | `Set<object>` | sim | instância Set |
| 13 | `current` | mapDealLinkedTasksError | `unknown` | sim | alias error |
| 17 | `candidate` | mapDealLinkedTasksError | `{ code?: unknown; constraint?: unknown; cause?: unknown; }` | sim | alias current |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 5 | `ok` | `false` | module |
| 6 | `code` | `"DEAL_HAS_LINKED_TASKS"` | module |
| 7 | `message` | `string` | module |
| 17 | `code` | `unknown` | mapDealLinkedTasksError |
| 17 | `constraint` | `unknown` | mapDealLinkedTasksError |
| 17 | `cause` | `unknown` | mapDealLinkedTasksError |

## src/lib/member-assignment-integrity-error.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 1 | `MEMBER_ASSIGNMENT_CODE` | module | `"23001"` | sim | literal string (valor omitido) |
| 2 | `MEMBER_ASSIGNMENT_CONSTRAINTS` | module | `Set<string>` | sim | instância Set |
| 15 | `visited` | mapMemberAssignmentIntegrityError | `Set<object>` | sim | instância Set |
| 16 | `current` | mapMemberAssignmentIntegrityError | `unknown` | sim | alias error |
| 20 | `candidate` | mapMemberAssignmentIntegrityError | `{ code?: unknown; constraint?: unknown; cause?: unknown; }` | sim | alias current |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 9 | `code` | `"MEMBER_HAS_ASSIGNMENTS"` | module |
| 10 | `message` | `string` | module |
| 20 | `code` | `unknown` | mapMemberAssignmentIntegrityError |
| 20 | `constraint` | `unknown` | mapMemberAssignmentIntegrityError |
| 20 | `cause` | `unknown` | mapMemberAssignmentIntegrityError |

## src/lib/organization-access.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 7 | `organizationAccessControl` | module | `AccessControl` | sim | alias defaultAc |
| 8 | `organizationRoles` | module | `Record<string, Role>` | sim | alias defaultRoles |

## src/lib/organization-owner-invariant-error.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 1 | `OWNER_INVARIANT_CODE` | module | `"23514"` | sim | literal string (valor omitido) |
| 2 | `OWNER_INVARIANT_CONSTRAINT` | module | `"organization_requires_owner"` | sim | literal string (valor omitido) |
| 11 | `visited` | mapOrganizationRequiresOwnerError | `Set<object>` | sim | instância Set |
| 12 | `current` | mapOrganizationRequiresOwnerError | `unknown` | sim | alias error |
| 16 | `candidate` | mapOrganizationRequiresOwnerError | `{ code?: unknown; constraint?: unknown; cause?: unknown; }` | sim | alias current |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 5 | `code` | `"ORGANIZATION_REQUIRES_OWNER"` | module |
| 6 | `message` | `string` | module |
| 16 | `code` | `unknown` | mapOrganizationRequiresOwnerError |
| 16 | `constraint` | `unknown` | mapOrganizationRequiresOwnerError |
| 16 | `cause` | `unknown` | mapOrganizationRequiresOwnerError |

## src/lib/safe-logger.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 16 | `categories` | module | `Set<LogCategory>` | sim | instância Set |
| 17 | `operations` | module | `Set<LogOperation>` | sim | instância Set |
| 24 | `sensitiveTerms` | module | `RegExp` | sim | RegularExpressionLiteral |
| 25 | `knownErrorCodes` | module | `Set<string>` | sim | instância Set |
| 36 | `sqlStatePattern` | module | `RegExp` | sim | RegularExpressionLiteral |
| 37 | `errorNames` | module | `Set<string>` | sim | instância Set |
| 49 | `uuidPattern` | module | `RegExp` | sim | RegularExpressionLiteral |
| 61 | `summary` | errorSummary | `Record<string, string>` | sim | objeto/configuração |
| 62 | `candidateName` | errorSummary | `string` | sim | propriedade name |
| 63 | `name` | errorSummary | `string \| undefined` | sim | condição derivada |
| 64 | `code` | errorSummary | `string \| undefined` | sim | chamada safeCode |
| 74 | `write` | createSafeLogger | `(level: LogLevel, input: SafeLogInput) => void` | sim | função/callback |
| 76 | `inputCategory` | write | `LogCategory` | sim | propriedade category |
| 77 | `inputOperation` | write | `LogOperation` | sim | propriedade operation |
| 78 | `inputCode` | write | `string \| undefined` | sim | propriedade code |
| 79 | `inputCorrelationId` | write | `string \| undefined` | sim | propriedade correlationId |
| 80 | `inputError` | write | `unknown` | sim | propriedade error |
| 81 | `event` | write | `Record<string, unknown>` | sim | objeto/configuração |
| 87 | `code` | write | `string \| undefined` | sim | chamada safeCode |
| 92 | `error` | write | `Record<string, string> \| undefined` | sim | chamada errorSummary |
| 108 | `safeLogger` | module | `{ error: (input: SafeLogInput) => void; warn: (input: SafeLogInput) => void; info: (input: SafeLogInput) =>…` | sim | chamada createSafeLogger |
| 116 | `error` | log | `Error \| undefined` | não | sem inicializador |
| 124 | `safeLevel` | log | `LogLevel` | sim | condição derivada |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 6 | `category` | `LogCategory` | module |
| 7 | `operation` | `LogOperation` | module |
| 8 | `code` | `string \| undefined` | module |
| 9 | `correlationId` | `string \| undefined` | module |
| 10 | `error` | `unknown` | module |
| 64 | `code` | `unknown` | errorSummary |

## src/lib/utils.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 12 | `numeric` | formatCurrency | `number` | sim | condição derivada |
| 20 | `date` | formatDate | `Date` | sim | condição derivada |
| 40 | `match` | recifeDateTimeToIso | `RegExpExecArray \| null` | sim | chamada /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec |
| 44 | `year` | recifeDateTimeToIso | `RegExpExecArray` | sim | alias match |
| 44 | `month` | recifeDateTimeToIso | `RegExpExecArray` | sim | alias match |
| 44 | `day` | recifeDateTimeToIso | `RegExpExecArray` | sim | alias match |
| 44 | `hour` | recifeDateTimeToIso | `RegExpExecArray` | sim | alias match |
| 44 | `minute` | recifeDateTimeToIso | `RegExpExecArray` | sim | alias match |
| 45 | `wallClockAsUtc` | recifeDateTimeToIso | `number` | sim | chamada Date.UTC |
| 46 | `parts` | recifeDateTimeToIso | `Intl.DateTimeFormatPart[]` | sim | chamada new Intl.DateTimeFormat("en-US", { timeZone: "America/Recife", year: " |
| 47 | `part` | recifeDateTimeToIso | `{ [k: string]: string; }` | sim | chamada Object.fromEntries |
| 48 | `renderedAsUtc` | recifeDateTimeToIso | `number` | sim | chamada Date.UTC |
| 49 | `timezoneOffset` | recifeDateTimeToIso | `number` | sim | expressão - |

## src/lib/workspace.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 38 | `privateNoStore` | module | `{ "Cache-Control": string; }` | sim | objeto/configuração |
| 48 | `selected` | resolveWorkspaceSelection | `WorkspaceMembership \| undefined` | sim | chamada memberships.find |
| 69 | `active` | activateUnambiguousMembership | `({ members: { id: string; organizationId: string; role: string; createdAt: Date; userId: string; user: { id…` | sim | chamada getAuth().api.setActiveOrganization |
| 84 | `role` | contextFor | `string` | sim | chamada membership.role.toLowerCase |
| 95 | `auth` | requireApiWorkspaceRole | `Auth<{ appName: string; logger: { level: "warn"; disableColors: boolean; log(level: BetterAuthLogLevel, mes…` | sim | chamada getAuth |
| 96 | `session` | requireApiWorkspaceRole | `{ session: { id: string; createdAt: Date; updatedAt: Date; userId: string; expiresAt: Date; token: string; …` | sim | chamada auth.api.getSession |
| 99 | `memberships` | requireApiWorkspaceRole | `WorkspaceMembership[]` | sim | chamada getMemberships |
| 100 | `selection` | requireApiWorkspaceRole | `WorkspaceSelection` | sim | chamada resolveWorkspaceSelection |
| 101 | `membership` | requireApiWorkspaceRole | `WorkspaceMembership` | não | sem inicializador |
| 119 | `context` | requireApiWorkspaceRole | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: Wo…` | sim | chamada contextFor |
| 138 | `getWorkspaceContext` | module | `() => Promise<{ user: { id: string; name: string; email: string; }; organization: { id: string; name: strin…` | sim | chamada cache |
| 139 | `auth` | module | `Auth<{ appName: string; logger: { level: "warn"; disableColors: boolean; log(level: BetterAuthLogLevel, mes…` | sim | chamada getAuth |
| 140 | `session` | module | `{ session: { id: string; createdAt: Date; updatedAt: Date; userId: string; expiresAt: Date; token: string; …` | sim | chamada auth.api.getSession |
| 143 | `memberships` | module | `WorkspaceMembership[]` | sim | chamada getMemberships |
| 144 | `selection` | module | `WorkspaceSelection` | sim | chamada resolveWorkspaceSelection |
| 145 | `membership` | module | `WorkspaceMembership` | não | sem inicializador |
| 163 | `context` | module | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: Wo…` | sim | chamada contextFor |
| 169 | `context` | requireWorkspaceRole | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: Wo…` | sim | chamada getWorkspaceContext |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 11 | `organizationId` | `string` | module |
| 11 | `organizationName` | `string` | module |
| 11 | `role` | `string` | module |
| 15 | `kind` | `"selected"` | module |
| 15 | `membership` | `WorkspaceMembership` | module |
| 16 | `kind` | `"unambiguous"` | module |
| 16 | `membership` | `WorkspaceMembership` | module |
| 17 | `kind` | `"choose"` | module |
| 17 | `reason` | `"required" \| "invalid"` | module |
| 18 | `kind` | `"empty"` | module |
| 29 | `code` | `"WORKSPACE_SELECTION_REQUIRED"` | module |
| 30 | `selectionUrl` | `"/workspace/select"` | module |
| 83 | `user` | `{ id: string; name: string; email: string; }` | contextFor |
| 83 | `id` | `string` | contextFor |
| 83 | `name` | `string` | contextFor |
| 83 | `email` | `string` | contextFor |

## src/modules/activities/actions.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 10 | `activitySchema` | module | `z.ZodObject<{ clientId: z.ZodOptional<z.ZodUnion<readonly [z.ZodUUID, z.ZodLiteral<"">]>>; dealId: z.ZodOpt…` | sim | chamada z.object({ clientId: z.union([z.uuid(), z.literal("")]).optional(), de |
| 23 | `parsed` | createActivity | `z.ZodSafeParseResult<{ type: "email" \| "call" \| "meeting" \| "note" \| "follow_up"; subject: string; clie…` | sim | chamada activitySchema.safeParse |
| 29 | `context` | createActivity | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: Wo…` | sim | chamada requireWorkspaceRole |
| 30 | `db` | createActivity | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 31 | `clientId` | createActivity | `string \| null` | sim | expressão \|\| |
| 32 | `dealId` | createActivity | `string \| null` | sim | expressão \|\| |
| 34 | `result` | createActivity | `{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }` | sim | chamada db.transaction |
| 35 | `dealClientId` | createActivity | `string \| null` | sim | null |
| 37 | `deal` | createActivity | `{ id: string; clientId: string; }[]` | sim | chamada tx.select({ id: deals.id, clientId: deals.clientId }).from(deals) .whe |
| 53 | `involvedIds` | createActivity | `string[]` | sim | chamada [...new Set([clientId, dealClientId].filter((value): value is string = |
| 55 | `activeClients` | createActivity | `{ id: string; }[]` | sim | chamada tx.select({ id: clients.id }).from(clients) .where(and(eq(clients.orga |
| 65 | `row` | createActivity | `{ id: string; }[]` | sim | chamada tx.insert(activities).values({ organizationId: context.organization.id |

## src/modules/clients/actions.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 17 | `parsed` | createClient | `z.ZodSafeParseResult<{ kind: "person" \| "company"; name: string; status: "active" \| "prospect" \| "inacti…` | sim | chamada clientSchema.safeParse |
| 21 | `fields` | createClient | `{ [k: string]: string; }` | sim | chamada Object.fromEntries |
| 26 | `context` | createClient | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: Wo…` | sim | chamada requireWorkspaceRole |
| 27 | `db` | createClient | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 28 | `data` | createClient | `{ kind: "person" \| "company"; name: string; status: "active" \| "prospect" \| "inactive"; email?: string \…` | sim | propriedade data |
| 29 | `created` | createClient | `[{ id: string; }]` | sim | chamada db.transaction |
| 30 | `row` | createClient | `{ id: string; }[]` | sim | chamada tx.insert(clients).values({ organizationId: context.organization.id, k |
| 60 | `parsedId` | updateClient | `z.ZodSafeParseResult<string>` | sim | chamada z.uuid().safeParse |
| 61 | `parsed` | updateClient | `z.ZodSafeParseResult<{ kind: "person" \| "company"; name: string; status: "active" \| "prospect" \| "inacti…` | sim | chamada clientSchema.safeParse |
| 65 | `context` | updateClient | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: Wo…` | sim | chamada requireWorkspaceRole |
| 66 | `db` | updateClient | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 67 | `data` | updateClient | `{ kind: "person" \| "company"; name: string; status: "active" \| "prospect" \| "inactive"; email?: string \…` | sim | propriedade data |
| 68 | `result` | updateClient | `{ ok: false; message: string; } \| { ok: true; message?: undefined; }` | sim | chamada db.transaction |
| 69 | `existing` | updateClient | `{ id: string; kind: "person" \| "company"; }[]` | sim | chamada tx.select({ id: clients.id, kind: clients.kind }) .from(clients) .wher |
| 75 | `updated` | updateClient | `{ id: string; }[]` | sim | chamada tx.update(clients).set({ kind: data.kind, name: data.name, email: data |
| 99 | `parsed` | reassignClientOwner | `z.ZodSafeParseResult<{ clientId: string; newUserId: string \| null; }>` | sim | chamada z.object({ clientId: z.uuid(), newUserId: z.string().min(1).nullable() |
| 102 | `context` | reassignClientOwner | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: Wo…` | sim | chamada requireWorkspaceRole |
| 103 | `db` | reassignClientOwner | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 104 | `result` | reassignClientOwner | `{ ok: false; message: string; changed?: undefined; } \| { ok: true; changed: boolean; message?: undefined; }` | sim | chamada db.transaction |
| 105 | `client` | reassignClientOwner | `{ id: string; ownerUserId: string \| null; }[]` | sim | chamada tx.select({ id: clients.id, ownerUserId: clients.ownerUserId }) .from( |
| 113 | `membership` | reassignClientOwner | `{ userId: string; }[]` | sim | chamada tx.select({ userId: member.userId }).from(member) .where(and(eq(member |
| 119 | `updated` | reassignClientOwner | `{ id: string; }[]` | sim | chamada tx.update(clients).set({ ownerUserId: parsed.data.newUserId, updatedAt |
| 144 | `context` | archiveClient | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: Wo…` | sim | chamada requireWorkspaceRole |
| 145 | `parsedId` | archiveClient | `z.ZodSafeParseResult<string>` | sim | chamada z.uuid().safeParse |
| 147 | `db` | archiveClient | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 148 | `result` | archiveClient | `{ ok: false; message: string; } \| { ok: true; message?: undefined; }` | sim | chamada db.transaction |
| 149 | `client` | archiveClient | `{ id: string; kind: "person" \| "company"; }[]` | sim | chamada tx.select({ id: clients.id, kind: clients.kind }) .from(clients) .wher |
| 155 | `contactCount` | archiveClient | `{ value: number; }[]` | sim | chamada tx.select({ value: sql<number>`count(*)::int` }).from(contacts).where |
| 158 | `dealCount` | archiveClient | `{ value: number; }[]` | sim | chamada tx.select({ value: sql<number>`count(*)::int` }).from(deals).where |
| 161 | `taskCount` | archiveClient | `{ value: number; }[]` | sim | chamada tx.select({ value: countDistinct(tasks.id) }).from(tasks) .leftJoin(de |
| 166 | `eligibility` | archiveClient | `{ canArchive: boolean; reason?: string; }` | sim | chamada evaluateClientArchivalEligibility |
| 169 | `archived` | archiveClient | `{ id: string; }[]` | sim | chamada tx.update(clients).set({ deletedAt: new Date(), updatedAt: new Date() |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 13 | `ok` | `true` | module |
| 13 | `id` | `string \| undefined` | module |
| 13 | `ok` | `false` | module |
| 13 | `message` | `string` | module |
| 13 | `fields` | `Record<string, string> \| undefined` | module |

## src/modules/clients/archive-rules.ts


**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 2 | `activeContacts` | `number` | module |
| 3 | `openDeals` | `number` | module |
| 4 | `pendingTasks` | `number` | module |
| 9 | `canArchive` | `boolean` | evaluateClientArchivalEligibility |
| 9 | `reason` | `string \| undefined` | evaluateClientArchivalEligibility |

## src/modules/clients/contact-actions.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 10 | `contactSchema` | module | `z.ZodObject<{ companyClientId: z.ZodUUID; name: z.ZodString; title: z.ZodOptional<z.ZodString>; email: z.Zo…` | sim | chamada z.object |
| 19 | `parsed` | createContact | `z.ZodSafeParseResult<{ companyClientId: string; name: string; title?: string \| undefined; email?: string \…` | sim | chamada contactSchema.safeParse |
| 21 | `context` | createContact | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: Wo…` | sim | chamada requireWorkspaceRole |
| 22 | `db` | createContact | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 23 | `companyId` | createContact | `string` | sim | propriedade companyClientId |
| 24 | `result` | createContact | `{ ok: false; message: string; id?: undefined; clientId?: undefined; } \| { ok: true; id: string; clientId: …` | sim | chamada db.transaction |
| 25 | `company` | createContact | `{ id: string; }[]` | sim | chamada tx.select({ id: clients.id }).from(clients).where(and( eq(clients.id, |
| 29 | `row` | createContact | `{ id: string; }[]` | sim | chamada tx.insert(contacts).values({ organizationId: context.organization.id, |

## src/modules/clients/schema.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 3 | `optionalEmail` | module | `z.ZodOptional<z.ZodUnion<readonly [z.ZodEmail, z.ZodLiteral<"">]>>` | sim | chamada z.union([z.email("Informe um e-mail válido.").max(254), z.literal("")] |
| 5 | `clientSchema` | module | `z.ZodObject<{ kind: z.ZodEnum<{ person: "person"; company: "company"; }>; name: z.ZodString; email: z.ZodOp…` | sim | chamada z.object |

## src/modules/deals/actions.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 12 | `dealSchema` | module | `z.ZodObject<{ clientId: z.ZodUUID; title: z.ZodString; amount: z.ZodString; expectedCloseAt: z.ZodOptional<…` | sim | chamada z.object |
| 21 | `parsed` | createDeal | `z.ZodSafeParseResult<{ clientId: string; title: string; amount: string; expectedCloseAt?: string \| undefin…` | sim | chamada dealSchema.safeParse |
| 25 | `context` | createDeal | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: Wo…` | sim | chamada requireWorkspaceRole |
| 26 | `db` | createDeal | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 27 | `amount` | createDeal | `string` | sim | condição derivada |
| 28 | `result` | createDeal | `{ ok: false; message: string; id?: undefined; clientId?: undefined; } \| { ok: true; id: string; clientId: …` | sim | chamada db.transaction |
| 29 | `client` | createDeal | `{ id: string; }[]` | sim | chamada tx.select({ id: clients.id }).from(clients).where(and(eq(clients.id, p |
| 31 | `row` | createDeal | `{ id: string; }[]` | sim | chamada tx.insert(deals).values({ organizationId: context.organization.id, cli |
| 46 | `parsedId` | updateDeal | `z.ZodSafeParseResult<string>` | sim | chamada z.uuid().safeParse |
| 47 | `parsed` | updateDeal | `z.ZodSafeParseResult<{ clientId: string; title: string; amount: string; expectedCloseAt?: string \| undefin…` | sim | chamada dealSchema.safeParse |
| 51 | `context` | updateDeal | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: Wo…` | sim | chamada requireWorkspaceRole |
| 52 | `db` | updateDeal | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 53 | `amount` | updateDeal | `string` | sim | condição derivada |
| 54 | `result` | updateDeal | `any` | não | sem inicializador |
| 57 | `existing` | updateDeal | `{ id: string; clientId: string; }[]` | sim | chamada tx.select({ id: deals.id, clientId: deals.clientId }) .from(deals) .wh |
| 62 | `involvedIds` | updateDeal | `string[]` | sim | chamada [...new Set([existing.clientId, parsed.data.clientId])].sort |
| 63 | `lockedClients` | updateDeal | `{ id: string; }[]` | sim | chamada tx.select({ id: clients.id }) .from(clients) .where(and(eq(clients.org |
| 68 | `updated` | updateDeal | `{ id: string; }[]` | sim | chamada tx.update(deals).set({ clientId: parsed.data.clientId, title: parsed.d |
| 80 | `error` | updateDeal | `unknown` | não | sem inicializador |
| 81 | `conflict` | updateDeal | `DealLinkedTasksConflict \| undefined` | sim | chamada mapDealLinkedTasksError |
| 96 | `stageSchema` | module | `z.ZodObject<{ dealId: z.ZodUUID; stage: z.ZodEnum<{ new_lead: "new_lead"; qualification: "qualification"; p…` | sim | chamada z.object |
| 100 | `parsed` | updateDealStage | `z.ZodSafeParseResult<{ dealId: string; stage: "new_lead" \| "qualification" \| "proposal" \| "negotiation" …` | sim | chamada stageSchema.safeParse |
| 105 | `context` | updateDealStage | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: Wo…` | sim | chamada requireWorkspaceRole |
| 106 | `db` | updateDealStage | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 107 | `closed` | updateDealStage | `boolean` | sim | expressão \|\| |
| 108 | `result` | updateDealStage | `{ ok: false; message: string; dealId?: undefined; clientId?: undefined; } \| { ok: true; dealId: string; cl…` | sim | chamada db.transaction |
| 109 | `existing` | updateDealStage | `{ id: string; stage: "new_lead" \| "qualification" \| "proposal" \| "negotiation" \| "won" \| "lost"; clien…` | sim | chamada tx.select({ id: deals.id, stage: deals.stage, clientId: deals.clientId |
| 113 | `client` | updateDealStage | `{ id: string; }[]` | sim | chamada tx.select({ id: clients.id }).from(clients).where(and(eq(clients.id, e |
| 115 | `updated` | updateDealStage | `{ id: string; }[]` | sim | chamada tx.update(deals).set({ stage: parsed.data.stage, lossReason: parsed.da |
| 131 | `parsed` | reassignDealOwner | `z.ZodSafeParseResult<{ dealId: string; newUserId: string \| null; }>` | sim | chamada z.object({ dealId: z.uuid(), newUserId: z.string().min(1).nullable() } |
| 134 | `context` | reassignDealOwner | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: Wo…` | sim | chamada requireWorkspaceRole |
| 135 | `db` | reassignDealOwner | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 136 | `result` | reassignDealOwner | `{ ok: false; message: string; changed?: undefined; } \| { ok: true; changed: boolean; message?: undefined; }` | sim | chamada db.transaction |
| 137 | `deal` | reassignDealOwner | `{ id: string; ownerUserId: string \| null; }[]` | sim | chamada tx.select({ id: deals.id, ownerUserId: deals.ownerUserId }) .from(deal |
| 145 | `membership` | reassignDealOwner | `{ userId: string; }[]` | sim | chamada tx.select({ userId: member.userId }).from(member) .where(and(eq(member |
| 151 | `updated` | reassignDealOwner | `{ id: string; }[]` | sim | chamada tx.update(deals).set({ ownerUserId: parsed.data.newUserId, updatedAt: |

## src/modules/tasks/actions.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 11 | `taskSchema` | module | `z.ZodObject<{ title: z.ZodString; description: z.ZodOptional<z.ZodString>; priority: z.ZodEnum<{ low: "low"…` | sim | chamada z.object |
| 22 | `parsed` | createTask | `z.ZodSafeParseResult<{ title: string; priority: "low" \| "normal" \| "high" \| "urgent"; dueAt: string; des…` | sim | chamada taskSchema.safeParse |
| 26 | `context` | createTask | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: Wo…` | sim | chamada requireWorkspaceRole |
| 27 | `db` | createTask | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 28 | `clientId` | createTask | `string \| null` | sim | expressão \|\| |
| 29 | `dealId` | createTask | `string \| null` | sim | expressão \|\| |
| 31 | `result` | createTask | `{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }` | sim | chamada db.transaction |
| 32 | `dealClientId` | createTask | `string \| null` | sim | null |
| 34 | `deal` | createTask | `{ id: string; clientId: string; }[]` | sim | chamada tx.select({ id: deals.id, clientId: deals.clientId }).from(deals) .whe |
| 40 | `involvedIds` | createTask | `string[]` | sim | chamada [...new Set([clientId, dealClientId].filter((value): value is string = |
| 42 | `lockedClients` | createTask | `{ id: string; }[]` | sim | chamada tx.select({ id: clients.id }).from(clients) .where(and(eq(clients.orga |
| 47 | `created` | createTask | `{ id: string; }[]` | sim | chamada tx.insert(tasks).values({ organizationId: context.organization.id, tit |
| 62 | `parsed` | setTaskStatus | `z.ZodSafeParseResult<{ taskId: string; status: "todo" \| "in_progress" \| "done" \| "canceled"; }>` | sim | chamada z.object({ taskId: z.uuid(), status: z.enum(["todo", "in_progress", "d |
| 66 | `context` | setTaskStatus | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: Wo…` | sim | chamada requireWorkspaceRole |
| 67 | `db` | setTaskStatus | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 68 | `result` | setTaskStatus | `{ ok: false; message: string; clientId?: undefined; } \| { ok: true; clientId: string \| null; message?: un…` | sim | chamada db.transaction |
| 69 | `snapshot` | setTaskStatus | `{ id: string; dealId: string \| null; }[]` | sim | chamada tx.select({ id: tasks.id, dealId: tasks.dealId }).from(tasks) .where(a |
| 76 | `deal` | setTaskStatus | `{ id: string; clientId: string; } \| undefined` | não | sem inicializador |
| 84 | `task` | setTaskStatus | `{ id: string; status: "todo" \| "in_progress" \| "done" \| "canceled"; clientId: string \| null; dealId: st…` | sim | chamada tx.select({ id: tasks.id, status: tasks.status, clientId: tasks.client |
| 90 | `dealClientId` | setTaskStatus | `string \| null` | sim | expressão ?? |
| 94 | `involvedIds` | setTaskStatus | `string[]` | sim | chamada [...new Set([task.clientId, dealClientId].filter((value): value is str |
| 95 | `pendingStatus` | setTaskStatus | `boolean` | sim | expressão \|\| |
| 97 | `activeClients` | setTaskStatus | `{ id: string; }[]` | sim | chamada tx.select({ id: clients.id }).from(clients) .where(and(eq(clients.orga |
| 102 | `updated` | setTaskStatus | `{ id: string; }[]` | sim | chamada tx.update(tasks).set({ status: parsed.data.status, updatedAt: new Date |
| 118 | `parsed` | reassignTaskAssignee | `z.ZodSafeParseResult<{ taskId: string; newUserId: string \| null; }>` | sim | chamada z.object({ taskId: z.uuid(), newUserId: z.string().min(1).nullable() } |
| 121 | `context` | reassignTaskAssignee | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: Wo…` | sim | chamada requireWorkspaceRole |
| 122 | `db` | reassignTaskAssignee | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 123 | `result` | reassignTaskAssignee | `{ ok: false; message: string; changed?: undefined; clientId?: undefined; dealId?: undefined; } \| { ok: tru…` | sim | chamada db.transaction |
| 124 | `task` | reassignTaskAssignee | `{ id: string; assigneeUserId: string \| null; clientId: string \| null; dealId: string \| null; }[]` | sim | chamada tx.select({ id: tasks.id, assigneeUserId: tasks.assigneeUserId, client |
| 136 | `membership` | reassignTaskAssignee | `{ userId: string; }[]` | sim | chamada tx.select({ userId: member.userId }).from(member) .where(and(eq(member |
| 142 | `updated` | reassignTaskAssignee | `{ id: string; }[]` | sim | chamada tx.update(tasks).set({ assigneeUserId: parsed.data.newUserId, updatedA |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 76 | `id` | `string` | setTaskStatus |
| 76 | `clientId` | `string` | setTaskStatus |

## src/modules/team/actions.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 42 | `context` | getMemberAssignmentSummary | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: Wo…` | sim | chamada requireWorkspaceRole |
| 43 | `db` | getMemberAssignmentSummary | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 48 | `authorizedMember` | getMemberAssignmentSummary | `{ role: string; }[]` | sim | chamada tx.select({ role: member.role }).from(member) .where(and(eq(member.org |
| 55 | `members` | getMemberAssignmentSummary | `{ memberId: string; userId: string; name: string; email: string; role: string; }[]` | sim | chamada tx.select({ memberId: member.id, userId: user.id, name: user.name, ema |
| 66 | `clientCounts` | getMemberAssignmentSummary | `{ userId: string \| null; active: number; archived: number; }[]` | sim | chamada tx.select({ userId: clients.ownerUserId, active: sql<number>`count(*) |
| 74 | `dealCounts` | getMemberAssignmentSummary | `{ userId: string \| null; active: number; archived: number; }[]` | sim | chamada tx.select({ userId: deals.ownerUserId, active: sql<number>`count(*) fi |
| 82 | `taskCounts` | getMemberAssignmentSummary | `{ userId: string \| null; active: number; archived: number; }[]` | sim | chamada tx.select({ userId: tasks.assigneeUserId, active: sql<number>`count(*) |
| 90 | `clientsByUser` | getMemberAssignmentSummary | `Map<string \| null, { active: number; archived: number; }>` | sim | instância Map |
| 91 | `dealsByUser` | getMemberAssignmentSummary | `Map<string \| null, { active: number; archived: number; }>` | sim | instância Map |
| 92 | `tasksByUser` | getMemberAssignmentSummary | `Map<string \| null, { active: number; archived: number; }>` | sim | instância Map |
| 95 | `personClients` | getMemberAssignmentSummary | `{ active: number; archived: number; }` | sim | expressão ?? |
| 96 | `personDeals` | getMemberAssignmentSummary | `{ active: number; archived: number; }` | sim | expressão ?? |
| 97 | `personTasks` | getMemberAssignmentSummary | `{ active: number; archived: number; }` | sim | expressão ?? |
| 98 | `active` | getMemberAssignmentSummary | `number` | sim | expressão + |
| 99 | `archived` | getMemberAssignmentSummary | `number` | sim | expressão + |
| 114 | `context` | updateMemberRole | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: Wo…` | sim | chamada requireWorkspaceRole |
| 115 | `db` | updateMemberRole | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 116 | `target` | updateMemberRole | `{ id: string; role: string; userId: string; }[]` | sim | chamada db.select({ id: member.id, role: member.role, userId: member.userId }) |
| 131 | `error` | updateMemberRole | `unknown` | não | sem inicializador |
| 140 | `parsed` | transferMemberAssignments | `z.ZodSafeParseResult<{ fromUserId: string; toUserId: string \| null; }>` | sim | chamada z.object({ fromUserId: z.string().min(1), toUserId: z.string().min(1). |
| 146 | `context` | transferMemberAssignments | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: Wo…` | sim | chamada requireWorkspaceRole |
| 151 | `db` | transferMemberAssignments | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 152 | `result` | transferMemberAssignments | `AssignmentTransferResult` | não | sem inicializador |
| 158 | `lockedTasks` | transferMemberAssignments | `{ id: string; }[]` | sim | chamada tx.select({ id: tasks.id }).from(tasks) .where(and(eq(tasks.organizati |
| 161 | `lockedDeals` | transferMemberAssignments | `{ id: string; }[]` | sim | chamada tx.select({ id: deals.id }).from(deals) .where(and(eq(deals.organizati |
| 164 | `lockedClients` | transferMemberAssignments | `{ id: string; }[]` | sim | chamada tx.select({ id: clients.id }).from(clients) .where(and(eq(clients.orga |
| 168 | `membershipUserIds` | transferMemberAssignments | `string[]` | sim | chamada [parsed.data.fromUserId, ...(parsed.data.toUserId ? [parsed.data.toUse |
| 169 | `memberships` | transferMemberAssignments | `{ userId: string; }[]` | sim | chamada tx.select({ userId: member.userId }).from(member) .where(and(eq(member |
| 176 | `auditEntries` | transferMemberAssignments | `{ organizationId: string; actorUserId: string; action: string; entityType: string; entityId: string; id?: s…` | sim | lista |
| 177 | `nextUserId` | transferMemberAssignments | `string \| null` | sim | propriedade toUserId |
| 178 | `action` | transferMemberAssignments | `"unassign" \| "reassign"` | sim | condição derivada |
| 180 | `updatedTaskIds` | transferMemberAssignments | `string[]` | sim | lista |
| 181 | `offset` | transferMemberAssignments | `number` | sim | literal escalar (valor omitido) |
| 182 | `ids` | transferMemberAssignments | `string[]` | sim | chamada lockedTasks.slice(offset, offset + 500).map |
| 183 | `rows` | transferMemberAssignments | `{ id: string; }[]` | sim | chamada tx.update(tasks).set({ assigneeUserId: nextUserId, updatedAt: new Date |
| 188 | `id` | transferMemberAssignments | `string` | não | sem inicializador |
| 193 | `updatedDealIds` | transferMemberAssignments | `string[]` | sim | lista |
| 194 | `offset` | transferMemberAssignments | `number` | sim | literal escalar (valor omitido) |
| 195 | `ids` | transferMemberAssignments | `string[]` | sim | chamada lockedDeals.slice(offset, offset + 500).map |
| 196 | `rows` | transferMemberAssignments | `{ id: string; }[]` | sim | chamada tx.update(deals).set({ ownerUserId: nextUserId, updatedAt: new Date() |
| 201 | `id` | transferMemberAssignments | `string` | não | sem inicializador |
| 206 | `updatedClientIds` | transferMemberAssignments | `string[]` | sim | lista |
| 207 | `offset` | transferMemberAssignments | `number` | sim | literal escalar (valor omitido) |
| 208 | `ids` | transferMemberAssignments | `string[]` | sim | chamada lockedClients.slice(offset, offset + 500).map |
| 209 | `rows` | transferMemberAssignments | `{ id: string; }[]` | sim | chamada tx.update(clients).set({ ownerUserId: nextUserId, updatedAt: new Date( |
| 214 | `id` | transferMemberAssignments | `string` | não | sem inicializador |
| 219 | `offset` | transferMemberAssignments | `number` | sim | literal escalar (valor omitido) |
| 225 | `archivedClients` | transferMemberAssignments | `{ value: number; }[]` | sim | chamada tx.select({ value: count() }).from(clients).where |
| 228 | `archivedDeals` | transferMemberAssignments | `{ value: number; }[]` | sim | chamada tx.select({ value: count() }).from(deals).where |
| 231 | `archivedTasks` | transferMemberAssignments | `{ value: number; }[]` | sim | chamada tx.select({ value: count() }).from(tasks).where |
| 234 | `archivedReferencesPending` | transferMemberAssignments | `{ clients: number; deals: number; tasks: number; total: number; }` | sim | objeto/configuração |
| 241 | `remainingClients` | transferMemberAssignments | `{ value: number; }[]` | sim | chamada tx.select({ value: count() }).from(clients).where |
| 244 | `remainingDeals` | transferMemberAssignments | `{ value: number; }[]` | sim | chamada tx.select({ value: count() }).from(deals).where |
| 247 | `remainingTasks` | transferMemberAssignments | `{ value: number; }[]` | sim | chamada tx.select({ value: count() }).from(tasks).where |
| 263 | `error` | transferMemberAssignments | `unknown` | não | sem inicializador |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 21 | `ok` | `false` | module |
| 21 | `message` | `string` | module |
| 23 | `ok` | `true` | module |
| 24 | `counts` | `{ clients: number; deals: number; tasks: number; total: number; }` | module |
| 24 | `clients` | `number` | module |
| 24 | `deals` | `number` | module |
| 24 | `tasks` | `number` | module |
| 24 | `total` | `number` | module |
| 25 | `archivedReferencesPending` | `{ clients: number; deals: number; tasks: number; total: number; }` | module |
| 25 | `clients` | `number` | module |
| 25 | `deals` | `number` | module |
| 25 | `tasks` | `number` | module |
| 25 | `total` | `number` | module |
| 29 | `memberId` | `string` | module |
| 30 | `userId` | `string` | module |
| 31 | `name` | `string` | module |
| 32 | `email` | `string` | module |
| 33 | `role` | `string` | module |
| 34 | `clients` | `{ active: number; archived: number; }` | module |
| 34 | `active` | `number` | module |
| 34 | `archived` | `number` | module |
| 35 | `deals` | `{ active: number; archived: number; }` | module |
| 35 | `active` | `number` | module |
| 35 | `archived` | `number` | module |
| 36 | `tasks` | `{ active: number; archived: number; }` | module |
| 36 | `active` | `number` | module |
| 36 | `archived` | `number` | module |
| 37 | `total` | `{ active: number; archived: number; all: number; }` | module |
| 37 | `active` | `number` | module |
| 37 | `archived` | `number` | module |
| 37 | `all` | `number` | module |

## src/modules/team/member-role-service.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 27 | `organizationId` | updateMemberRoleWithAudit | `string` | sim | chamada input.organizationId.trim |
| 28 | `actorUserId` | updateMemberRoleWithAudit | `string` | sim | chamada input.actorUserId.trim |
| 29 | `memberId` | updateMemberRoleWithAudit | `string` | sim | chamada input.memberId.trim |
| 30 | `role` | updateMemberRoleWithAudit | `string` | sim | chamada input.role.trim().toLowerCase |
| 36 | `db` | updateMemberRoleWithAudit | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 40 | `lockedMemberships` | updateMemberRoleWithAudit | `{ id: string; organizationId: string; userId: string; role: string; }[]` | sim | chamada tx.select({ id: member.id, organizationId: member.organizationId, user |
| 53 | `actor` | updateMemberRoleWithAudit | `{ id: string; organizationId: string; userId: string; role: string; } \| undefined` | sim | chamada lockedMemberships.find |
| 58 | `target` | updateMemberRoleWithAudit | `{ id: string; organizationId: string; userId: string; role: string; } \| undefined` | sim | chamada lockedMemberships.find |
| 69 | `updated` | updateMemberRoleWithAudit | `{ id: string; userId: string; organizationId: string; role: string; }[]` | sim | chamada tx.update(member).set({ role }).where(and( eq(member.id, target.id), e |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 22 | `organizationId` | `string` | updateMemberRoleWithAudit |
| 23 | `actorUserId` | `string` | updateMemberRoleWithAudit |
| 24 | `memberId` | `string` | updateMemberRoleWithAudit |
| 25 | `role` | `string` | updateMemberRoleWithAudit |

## src/modules/workspaces/actions.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 11 | `rawOrganizationId` | selectWorkspace | `FormDataEntryValue \| null` | sim | chamada formData.get |
| 12 | `organizationId` | selectWorkspace | `string` | sim | condição derivada |
| 15 | `requestHeaders` | selectWorkspace | `ReadonlyHeaders` | sim | chamada headers |
| 16 | `auth` | selectWorkspace | `Auth<{ appName: string; logger: { level: "warn"; disableColors: boolean; log(level: BetterAuthLogLevel, mes…` | sim | chamada getAuth |
| 17 | `session` | selectWorkspace | `{ session: { id: string; createdAt: Date; updatedAt: Date; userId: string; expiresAt: Date; token: string; …` | sim | chamada auth.api.getSession |
| 22 | `authorizedMembership` | selectWorkspace | `{ organizationId: string; }[]` | sim | chamada getDb().select({ organizationId: member.organizationId }) .from(member |
| 29 | `selectedOrganizationId` | selectWorkspace | `string \| undefined` | não | sem inicializador |
| 31 | `selected` | selectWorkspace | `({ members: { id: string; organizationId: string; role: string; createdAt: Date; userId: string; user: { id…` | sim | chamada auth.api.setActiveOrganization |

## src/app/layout.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 9 | `metadata` | module | `Metadata` | sim | objeto/configuração |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 14 | `children` | `ReactNode` | RootLayout |

## src/app/(app)/layout.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 4 | `dynamic` | module | `"force-dynamic"` | sim | literal string (valor omitido) |
| 7 | `context` | AuthenticatedLayout | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: Wo…` | sim | chamada getWorkspaceContext |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 6 | `children` | `ReactNode` | AuthenticatedLayout |

## src/app/(app)/activities/page.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 10 | `activityNames` | module | `Record<string, string>` | sim | objeto/configuração |
| 14 | `q` | ActivitiesPage | `[{ q?: string; }, { user: { id: string; name: string; email: string; }; organization: { id: string; name: s…` | sim | chamada Promise.all |
| 14 | `context` | ActivitiesPage | `[{ q?: string; }, { user: { id: string; name: string; email: string; }; organization: { id: string; name: s…` | sim | chamada Promise.all |
| 15 | `conditions` | ActivitiesPage | `SQL<unknown>[]` | sim | lista |
| 19 | `rows` | ActivitiesPage | `{ activity: { id: string; organizationId: string; type: "email" \| "call" \| "meeting" \| "note" \| "follow…` | sim | chamada getDb().select({ activity: activities, clientName: clients.name, clien |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 12 | `searchParams` | `Promise<{ q?: string; }>` | ActivitiesPage |
| 12 | `q` | `string \| undefined` | ActivitiesPage |

## src/app/(app)/clients/page.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 13 | `PAGE_SIZE` | module | `20` | sim | literal escalar (valor omitido) |
| 16 | `q` | ClientsPage | `[{ q?: string; page?: string; status?: string; }, { user: { id: string; name: string; email: string; }; org…` | sim | chamada Promise.all |
| 16 | `pageString` | ClientsPage | `[{ q?: string; page?: string; status?: string; }, { user: { id: string; name: string; email: string; }; org…` | sim | chamada Promise.all |
| 16 | `status` | ClientsPage | `[{ q?: string; page?: string; status?: string; }, { user: { id: string; name: string; email: string; }; org…` | sim | chamada Promise.all |
| 16 | `context` | ClientsPage | `[{ q?: string; page?: string; status?: string; }, { user: { id: string; name: string; email: string; }; org…` | sim | chamada Promise.all |
| 17 | `page` | ClientsPage | `number` | sim | chamada Math.max |
| 18 | `filters` | ClientsPage | `SQL<unknown>[]` | sim | lista |
| 21 | `where` | ClientsPage | `SQL<unknown> \| undefined` | sim | chamada and |
| 22 | `db` | ClientsPage | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 23 | `rows` | ClientsPage | `[{ id: string; organizationId: string; kind: "person" \| "company"; name: string; email: string \| null; ph…` | sim | chamada Promise.all |
| 23 | `totalResult` | ClientsPage | `[{ id: string; organizationId: string; kind: "person" \| "company"; name: string; email: string \| null; ph…` | sim | chamada Promise.all |
| 27 | `total` | ClientsPage | `number` | sim | chamada Number |
| 28 | `pages` | ClientsPage | `number` | sim | chamada Math.max |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 15 | `searchParams` | `Promise<{ q?: string; page?: string; status?: string; }>` | ClientsPage |
| 15 | `q` | `string \| undefined` | ClientsPage |
| 15 | `page` | `string \| undefined` | ClientsPage |
| 15 | `status` | `string \| undefined` | ClientsPage |

## src/app/(app)/clients/[id]/page.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 15 | `id` | ClientDetailPage | `[{ id: string; }, { user: { id: string; name: string; email: string; }; organization: { id: string; name: s…` | sim | chamada Promise.all |
| 15 | `context` | ClientDetailPage | `[{ id: string; }, { user: { id: string; name: string; email: string; }; organization: { id: string; name: s…` | sim | chamada Promise.all |
| 16 | `db` | ClientDetailPage | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 17 | `where` | ClientDetailPage | `SQL<unknown> \| undefined` | sim | chamada and |
| 18 | `client` | ClientDetailPage | `{ id: string; organizationId: string; kind: "person" \| "company"; name: string; email: string \| null; pho…` | sim | chamada db.select().from(clients).where(where).limit |
| 20 | `contactRows` | ClientDetailPage | `[{ id: string; organizationId: string; companyClientId: string; name: string; title: string \| null; email:…` | sim | chamada Promise.all |
| 20 | `dealRows` | ClientDetailPage | `[{ id: string; organizationId: string; companyClientId: string; name: string; title: string \| null; email:…` | sim | chamada Promise.all |
| 20 | `activityRows` | ClientDetailPage | `[{ id: string; organizationId: string; companyClientId: string; name: string; title: string \| null; email:…` | sim | chamada Promise.all |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 14 | `params` | `Promise<{ id: string; }>` | ClientDetailPage |
| 14 | `id` | `string` | ClientDetailPage |

## src/app/(app)/clients/[id]/edit/page.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 11 | `id` | EditClientPage | `[{ id: string; }, { user: { id: string; name: string; email: string; }; organization: { id: string; name: s…` | sim | chamada Promise.all |
| 11 | `context` | EditClientPage | `[{ id: string; }, { user: { id: string; name: string; email: string; }; organization: { id: string; name: s…` | sim | chamada Promise.all |
| 12 | `client` | EditClientPage | `{ id: string; kind: "person" \| "company"; name: string; email: string \| null; phone: string \| null; stat…` | sim | chamada getDb().select({ id: clients.id, kind: clients.kind, name: clients.nam |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 9 | `params` | `Promise<{ id: string; }>` | EditClientPage |
| 9 | `id` | `string` | EditClientPage |

## src/app/(app)/dashboard/page.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 11 | `openStages` | module | `readonly ["new_lead", "qualification", "proposal", "negotiation"]` | sim | lista |
| 12 | `stageLabels` | module | `Record<string, string>` | sim | objeto/configuração |
| 16 | `context` | DashboardPage | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: Wo…` | sim | chamada getWorkspaceContext |
| 17 | `db` | DashboardPage | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 18 | `now` | DashboardPage | `Date` | sim | instância Date |
| 19 | `periodStart` | DashboardPage | `Date` | sim | instância Date |
| 20 | `tenant` | DashboardPage | `SQL<unknown>` | sim | chamada eq |
| 21 | `activeClientRows` | DashboardPage | `[{ total: number; }[], { total: number; }[], { total: number; value: string; }[], { stage: "new_lead" \| "q…` | sim | chamada Promise.all |
| 21 | `leadRows` | DashboardPage | `[{ total: number; }[], { total: number; }[], { total: number; value: string; }[], { stage: "new_lead" \| "q…` | sim | chamada Promise.all |
| 21 | `pipelineRows` | DashboardPage | `[{ total: number; }[], { total: number; }[], { total: number; value: string; }[], { stage: "new_lead" \| "q…` | sim | chamada Promise.all |
| 21 | `stageRows` | DashboardPage | `[{ total: number; }[], { total: number; }[], { total: number; value: string; }[], { stage: "new_lead" \| "q…` | sim | chamada Promise.all |
| 21 | `wonRows` | DashboardPage | `[{ total: number; }[], { total: number; }[], { total: number; value: string; }[], { stage: "new_lead" \| "q…` | sim | chamada Promise.all |
| 21 | `lostRows` | DashboardPage | `[{ total: number; }[], { total: number; }[], { total: number; value: string; }[], { stage: "new_lead" \| "q…` | sim | chamada Promise.all |
| 21 | `overdueRows` | DashboardPage | `[{ total: number; }[], { total: number; }[], { total: number; value: string; }[], { stage: "new_lead" \| "q…` | sim | chamada Promise.all |
| 21 | `recentDeals` | DashboardPage | `[{ total: number; }[], { total: number; }[], { total: number; value: string; }[], { stage: "new_lead" \| "q…` | sim | chamada Promise.all |
| 21 | `upcomingTasks` | DashboardPage | `[{ total: number; }[], { total: number; }[], { total: number; value: string; }[], { stage: "new_lead" \| "q…` | sim | chamada Promise.all |
| 21 | `upcomingMeetings` | DashboardPage | `[{ total: number; }[], { total: number; }[], { total: number; value: string; }[], { stage: "new_lead" \| "q…` | sim | chamada Promise.all |
| 34 | `activeClients` | DashboardPage | `number` | sim | chamada Number |
| 35 | `leadCount` | DashboardPage | `number` | sim | chamada Number |
| 36 | `pipelineCount` | DashboardPage | `number` | sim | chamada Number |
| 37 | `pipelineValue` | DashboardPage | `string` | sim | expressão ?? |
| 38 | `wonCount` | DashboardPage | `number` | sim | chamada Number |
| 39 | `lostCount` | DashboardPage | `number` | sim | chamada Number |
| 40 | `conversionTotal` | DashboardPage | `number` | sim | expressão + |
| 41 | `conversion` | DashboardPage | `number` | sim | condição derivada |
| 42 | `overdueCount` | DashboardPage | `number` | sim | chamada Number |
| 43 | `stageMap` | DashboardPage | `Map<"new_lead" \| "qualification" \| "proposal" \| "negotiation" \| "won" \| "lost", { stage: "new_lead" \|…` | sim | instância Map |
| 44 | `largestStageValue` | DashboardPage | `number` | sim | chamada Math.max |
| 62 | `row` | DashboardPage | `{ stage: "new_lead" \| "qualification" \| "proposal" \| "negotiation" \| "won" \| "lost"; total: number; va…` | sim | chamada stageMap.get |
| 62 | `width` | DashboardPage | `number` | sim | condição derivada |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 89 | `title` | `string` | Metric |
| 89 | `value` | `string` | Metric |
| 89 | `hint` | `string` | Metric |
| 89 | `icon` | `ReactNode` | Metric |
| 89 | `tone` | `"green" \| "amber" \| undefined` | Metric |

## src/app/(app)/deals/page.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 12 | `stages` | module | `readonly [{ readonly value: "new_lead"; readonly label: "Novo lead"; }, { readonly value: "qualification"; …` | sim | lista |
| 15 | `q` | DealsPage | `[{ q?: string; stage?: string; }, { user: { id: string; name: string; email: string; }; organization: { id:…` | sim | chamada Promise.all |
| 15 | `stage` | DealsPage | `[{ q?: string; stage?: string; }, { user: { id: string; name: string; email: string; }; organization: { id:…` | sim | chamada Promise.all |
| 15 | `context` | DealsPage | `[{ q?: string; stage?: string; }, { user: { id: string; name: string; email: string; }; organization: { id:…` | sim | chamada Promise.all |
| 16 | `conditions` | DealsPage | `SQL<unknown>[]` | sim | lista |
| 19 | `rows` | DealsPage | `{ id: string; title: string; stage: "new_lead" \| "qualification" \| "proposal" \| "negotiation" \| "won" \…` | sim | chamada getDb().select({ id: deals.id, title: deals.title, stage: deals.stage, |
| 22 | `total` | DealsPage | `number` | sim | propriedade length |
| 23 | `totalValue` | DealsPage | `number` | sim | chamada rows.filter((deal) => !["won", "lost"].includes(deal.stage)).reduce |
| 30 | `cards` | DealsPage | `{ id: string; title: string; stage: "new_lead" \| "qualification" \| "proposal" \| "negotiation" \| "won" \…` | sim | chamada rows.filter |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 14 | `searchParams` | `Promise<{ q?: string; stage?: string; }>` | DealsPage |
| 14 | `q` | `string \| undefined` | DealsPage |
| 14 | `stage` | `string \| undefined` | DealsPage |

## src/app/(app)/deals/[id]/page.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 15 | `id` | DealDetailPage | `[{ id: string; }, { user: { id: string; name: string; email: string; }; organization: { id: string; name: s…` | sim | chamada Promise.all |
| 15 | `context` | DealDetailPage | `[{ id: string; }, { user: { id: string; name: string; email: string; }; organization: { id: string; name: s…` | sim | chamada Promise.all |
| 16 | `db` | DealDetailPage | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 17 | `row` | DealDetailPage | `{ deal: { id: string; organizationId: string; clientId: string; title: string; stage: "new_lead" \| "qualif…` | sim | chamada db.select({ deal: deals, client: clients }).from(deals).innerJoin(clie |
| 19 | `activityRows` | DealDetailPage | `{ id: string; organizationId: string; type: "email" \| "call" \| "meeting" \| "note" \| "follow_up"; subjec…` | sim | chamada db.select().from(activities).where(and(eq(activities.organizationId, c |
| 20 | `stageLabel` | DealDetailPage | `string` | sim | acesso indexado |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 14 | `params` | `Promise<{ id: string; }>` | DealDetailPage |
| 14 | `id` | `string` | DealDetailPage |

## src/app/(app)/deals/[id]/edit/page.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 11 | `id` | EditDealPage | `[{ id: string; }, { user: { id: string; name: string; email: string; }; organization: { id: string; name: s…` | sim | chamada Promise.all |
| 11 | `context` | EditDealPage | `[{ id: string; }, { user: { id: string; name: string; email: string; }; organization: { id: string; name: s…` | sim | chamada Promise.all |
| 12 | `db` | EditDealPage | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 13 | `deal` | EditDealPage | `[{ id: string; clientId: string; title: string; amount: string; expectedCloseAt: string \| null; }[], { id:…` | sim | chamada Promise.all |
| 13 | `clientRows` | EditDealPage | `[{ id: string; clientId: string; title: string; amount: string; expectedCloseAt: string \| null; }[], { id:…` | sim | chamada Promise.all |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 9 | `params` | `Promise<{ id: string; }>` | EditDealPage |
| 9 | `id` | `string` | EditDealPage |

## src/app/(app)/deals/new/page.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 12 | `clientId` | NewDealPage | `[{ clientId?: string; }, { user: { id: string; name: string; email: string; }; organization: { id: string; …` | sim | chamada Promise.all |
| 12 | `context` | NewDealPage | `[{ clientId?: string; }, { user: { id: string; name: string; email: string; }; organization: { id: string; …` | sim | chamada Promise.all |
| 13 | `clientRows` | NewDealPage | `{ id: string; name: string; }[]` | sim | chamada getDb().select({ id: clients.id, name: clients.name }).from(clients).w |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 10 | `searchParams` | `Promise<{ clientId?: string; }>` | NewDealPage |
| 10 | `clientId` | `string \| undefined` | NewDealPage |

## src/app/(app)/search/page.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 13 | `q` | GlobalSearchPage | `[{ q?: string; }, { user: { id: string; name: string; email: string; }; organization: { id: string; name: s…` | sim | chamada Promise.all |
| 13 | `context` | GlobalSearchPage | `[{ q?: string; }, { user: { id: string; name: string; email: string; }; organization: { id: string; name: s…` | sim | chamada Promise.all |
| 14 | `query` | GlobalSearchPage | `string` | sim | chamada q.trim().slice |
| 15 | `db` | GlobalSearchPage | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 16 | `clientRows` | GlobalSearchPage | `[{ id: string; name: string; email: string \| null; kind: "person" \| "company"; status: "active" \| "prosp…` | sim | condição derivada |
| 16 | `dealRows` | GlobalSearchPage | `[{ id: string; name: string; email: string \| null; kind: "person" \| "company"; status: "active" \| "prosp…` | sim | condição derivada |
| 16 | `taskRows` | GlobalSearchPage | `[{ id: string; name: string; email: string \| null; kind: "person" \| "company"; status: "active" \| "prosp…` | sim | condição derivada |
| 21 | `total` | GlobalSearchPage | `number` | sim | expressão + |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 11 | `searchParams` | `Promise<{ q?: string; }>` | GlobalSearchPage |
| 11 | `q` | `string \| undefined` | GlobalSearchPage |

## src/app/(app)/settings/page.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 7 | `context` | SettingsPage | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: Wo…` | sim | chamada getWorkspaceContext |

## src/app/(app)/tasks/page.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 15 | `q` | TasksPage | `[{ q?: string; filter?: string; status?: string; }, { user: { id: string; name: string; email: string; }; o…` | sim | chamada Promise.all |
| 15 | `filter` | TasksPage | `[{ q?: string; filter?: string; status?: string; }, { user: { id: string; name: string; email: string; }; o…` | sim | chamada Promise.all |
| 15 | `status` | TasksPage | `[{ q?: string; filter?: string; status?: string; }, { user: { id: string; name: string; email: string; }; o…` | sim | chamada Promise.all |
| 15 | `context` | TasksPage | `[{ q?: string; filter?: string; status?: string; }, { user: { id: string; name: string; email: string; }; o…` | sim | chamada Promise.all |
| 16 | `now` | TasksPage | `Date` | sim | instância Date |
| 17 | `conditions` | TasksPage | `SQL<unknown>[]` | sim | lista |
| 27 | `db` | TasksPage | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 28 | `rows` | TasksPage | `[{ task: { id: string; organizationId: string; title: string; description: string \| null; priority: "low" …` | sim | chamada Promise.all |
| 28 | `totalResult` | TasksPage | `[{ task: { id: string; organizationId: string; title: string; description: string \| null; priority: "low" …` | sim | chamada Promise.all |
| 35 | `total` | TasksPage | `number` | sim | chamada Number |
| 41 | `overdue` | TasksPage | `boolean` | sim | expressão && |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 13 | `searchParams` | `Promise<{ q?: string; filter?: string; status?: string; }>` | TasksPage |
| 13 | `q` | `string \| undefined` | TasksPage |
| 13 | `filter` | `string \| undefined` | TasksPage |
| 13 | `status` | `string \| undefined` | TasksPage |

## src/app/(app)/tasks/new/page.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 12 | `context` | NewTaskPage | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: Wo…` | sim | chamada getWorkspaceContext |
| 13 | `db` | NewTaskPage | `NodePgDatabase<typeof import("<projeto>/src/db/schema/index")> & { $client: Pool; }` | sim | chamada getDb |
| 14 | `clientRows` | NewTaskPage | `[{ id: string; name: string; }[], { id: string; title: string; clientId: string; }[]]` | sim | chamada Promise.all |
| 14 | `dealRows` | NewTaskPage | `[{ id: string; name: string; }[], { id: string; title: string; clientId: string; }[]]` | sim | chamada Promise.all |

## src/app/(app)/team/page.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 13 | `roleNames` | module | `Record<string, string>` | sim | objeto/configuração |
| 17 | `context` | TeamPage | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: Wo…` | sim | chamada getWorkspaceContext |
| 18 | `members` | TeamPage | `{ memberId: string; role: string; joinedAt: Date; name: string; email: string; userId: string; }[]` | sim | chamada getDb().select({ memberId: member.id, role: member.role, joinedAt: mem |
| 20 | `canManage` | TeamPage | `boolean` | sim | chamada canManageMemberRoles |
| 21 | `responsibilities` | TeamPage | `MemberAssignmentSummary[] \| null` | sim | null |
| 22 | `responsibilitiesFailed` | TeamPage | `boolean` | sim | literal escalar (valor omitido) |
| 26 | `error` | TeamPage | `unknown` | não | sem inicializador |

## src/app/(auth)/login/page.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 5 | `metadata` | module | `Metadata` | sim | objeto/configuração |
| 9 | `reason` | LoginPage | `{ reason?: string; }` | sim | alias searchParams |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 7 | `searchParams` | `Promise<{ reason?: string; }>` | LoginPage |
| 7 | `reason` | `string \| undefined` | LoginPage |

## src/app/workspace/select/page.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 12 | `metadata` | module | `Metadata` | sim | objeto/configuração |
| 13 | `dynamic` | module | `"force-dynamic"` | sim | literal string (valor omitido) |
| 15 | `reasonMessages` | module | `Record<string, string>` | sim | objeto/configuração |
| 33 | `reason` | SelectWorkspacePage | `[{ reason?: string; }, Headers & { append(...args: any[]): void; set(...args: any[]): void; delete(...args:…` | sim | chamada Promise.all |
| 33 | `requestHeaders` | SelectWorkspacePage | `[{ reason?: string; }, Headers & { append(...args: any[]): void; set(...args: any[]): void; delete(...args:…` | sim | chamada Promise.all |
| 34 | `session` | SelectWorkspacePage | `{ session: { id: string; createdAt: Date; updatedAt: Date; userId: string; expiresAt: Date; token: string; …` | sim | chamada getAuth().api.getSession |
| 37 | `memberships` | SelectWorkspacePage | `{ organizationId: string; organizationName: string; role: string; }[]` | sim | chamada getDb().select({ organizationId: organization.id, organizationName: or |
| 46 | `message` | SelectWorkspacePage | `string \| undefined` | sim | condição derivada |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 32 | `searchParams` | `Promise<{ reason?: string; }>` | SelectWorkspacePage |
| 32 | `reason` | `string \| undefined` | SelectWorkspacePage |

## src/components/zod-csp-provider.tsx


**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 9 | `children` | `ReactNode` | ZodCspProvider |

## src/components/activities/activity-form.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 11 | `schema` | module | `z.ZodObject<{ type: z.ZodEnum<{ email: "email"; call: "call"; meeting: "meeting"; note: "note"; follow_up: …` | sim | chamada z.object |
| 17 | `message` | ActivityForm | `[string, Dispatch<SetStateAction<string>>]` | sim | chamada useState |
| 17 | `setMessage` | ActivityForm | `[string, Dispatch<SetStateAction<string>>]` | sim | chamada useState |
| 18 | `register` | ActivityForm | `UseFormReturn<{ type: "email" \| "call" \| "meeting" \| "note" \| "follow_up"; subject: string; body?: stri…` | sim | chamada useForm |
| 18 | `handleSubmit` | ActivityForm | `UseFormReturn<{ type: "email" \| "call" \| "meeting" \| "note" \| "follow_up"; subject: string; body?: stri…` | sim | chamada useForm |
| 18 | `reset` | ActivityForm | `UseFormReturn<{ type: "email" \| "call" \| "meeting" \| "note" \| "follow_up"; subject: string; body?: stri…` | sim | chamada useForm |
| 18 | `errors` | ActivityForm | `UseFormReturn<{ type: "email" \| "call" \| "meeting" \| "note" \| "follow_up"; subject: string; body?: stri…` | sim | chamada useForm |
| 18 | `isSubmitting` | ActivityForm | `UseFormReturn<{ type: "email" \| "call" \| "meeting" \| "note" \| "follow_up"; subject: string; body?: stri…` | sim | chamada useForm |
| 24 | `result` | onSubmit | `{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }` | sim | chamada createActivity |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 15 | `clientId` | `string \| undefined` | ActivityForm |
| 15 | `dealId` | `string \| undefined` | ActivityForm |

## src/components/auth/login-form.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 12 | `schema` | module | `z.ZodObject<{ email: z.ZodEmail; password: z.ZodString; }, z.core.$strip>` | sim | chamada z.object |
| 18 | `router` | LoginForm | `AppRouterInstance` | sim | chamada useRouter |
| 19 | `serverError` | LoginForm | `[string, Dispatch<SetStateAction<string>>]` | sim | chamada useState |
| 19 | `setServerError` | LoginForm | `[string, Dispatch<SetStateAction<string>>]` | sim | chamada useState |
| 20 | `register` | LoginForm | `UseFormReturn<{ email: string; password: string; }, any, { email: string; password: string; }>` | sim | chamada useForm |
| 20 | `handleSubmit` | LoginForm | `UseFormReturn<{ email: string; password: string; }, any, { email: string; password: string; }>` | sim | chamada useForm |
| 20 | `errors` | LoginForm | `UseFormReturn<{ email: string; password: string; }, any, { email: string; password: string; }>` | sim | chamada useForm |
| 20 | `isSubmitting` | LoginForm | `UseFormReturn<{ email: string; password: string; }, any, { email: string; password: string; }>` | sim | chamada useForm |
| 26 | `result` | onSubmit | `Data<Omit<{ redirect: boolean; token: string; url?: string \| undefined; user: { id: string; createdAt: Dat…` | sim | chamada authClient.signIn.email |

## src/components/clients/client-form.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 16 | `router` | ClientForm | `AppRouterInstance` | sim | chamada useRouter |
| 17 | `serverMessage` | ClientForm | `[string, Dispatch<SetStateAction<string>>]` | sim | chamada useState |
| 17 | `setServerMessage` | ClientForm | `[string, Dispatch<SetStateAction<string>>]` | sim | chamada useState |
| 18 | `register` | ClientForm | `UseFormReturn<{ kind: "person" \| "company"; name: string; status: "active" \| "prospect" \| "inactive"; em…` | sim | chamada useForm |
| 18 | `handleSubmit` | ClientForm | `UseFormReturn<{ kind: "person" \| "company"; name: string; status: "active" \| "prospect" \| "inactive"; em…` | sim | chamada useForm |
| 18 | `setError` | ClientForm | `UseFormReturn<{ kind: "person" \| "company"; name: string; status: "active" \| "prospect" \| "inactive"; em…` | sim | chamada useForm |
| 18 | `errors` | ClientForm | `UseFormReturn<{ kind: "person" \| "company"; name: string; status: "active" \| "prospect" \| "inactive"; em…` | sim | chamada useForm |
| 18 | `isSubmitting` | ClientForm | `UseFormReturn<{ kind: "person" \| "company"; name: string; status: "active" \| "prospect" \| "inactive"; em…` | sim | chamada useForm |
| 27 | `result` | onSubmit | `ActionResult` | sim | condição derivada |
| 33 | `field` | onSubmit | `[string, string]` | não | sem inicializador |
| 33 | `message` | onSubmit | `[string, string]` | não | sem inicializador |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 12 | `id` | `string` | module |
| 12 | `kind` | `"person" \| "company"` | module |
| 12 | `name` | `string` | module |
| 12 | `email` | `string \| null` | module |
| 12 | `phone` | `string \| null` | module |
| 12 | `status` | `"active" \| "prospect" \| "inactive"` | module |
| 12 | `source` | `string \| null` | module |
| 12 | `notes` | `string \| null` | module |
| 14 | `client` | `ClientValues \| undefined` | ClientForm |

## src/components/clients/contact-form.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 11 | `schema` | module | `z.ZodObject<{ name: z.ZodString; title: z.ZodOptional<z.ZodString>; email: z.ZodOptional<z.ZodUnion<readonl…` | sim | chamada z.object |
| 17 | `message` | ContactForm | `[string, Dispatch<SetStateAction<string>>]` | sim | chamada useState |
| 17 | `setMessage` | ContactForm | `[string, Dispatch<SetStateAction<string>>]` | sim | chamada useState |
| 18 | `register` | ContactForm | `UseFormReturn<{ name: string; title?: string \| undefined; email?: string \| undefined; phone?: string \| u…` | sim | chamada useForm |
| 18 | `handleSubmit` | ContactForm | `UseFormReturn<{ name: string; title?: string \| undefined; email?: string \| undefined; phone?: string \| u…` | sim | chamada useForm |
| 18 | `reset` | ContactForm | `UseFormReturn<{ name: string; title?: string \| undefined; email?: string \| undefined; phone?: string \| u…` | sim | chamada useForm |
| 18 | `errors` | ContactForm | `UseFormReturn<{ name: string; title?: string \| undefined; email?: string \| undefined; phone?: string \| u…` | sim | chamada useForm |
| 18 | `isSubmitting` | ContactForm | `UseFormReturn<{ name: string; title?: string \| undefined; email?: string \| undefined; phone?: string \| u…` | sim | chamada useForm |
| 24 | `result` | onSubmit | `{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }` | sim | chamada createContact |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 15 | `companyClientId` | `string` | ContactForm |

## src/components/deals/deal-form.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 12 | `schema` | module | `z.ZodObject<{ clientId: z.ZodUUID; title: z.ZodString; amount: z.ZodString; expectedCloseAt: z.ZodOptional<…` | sim | chamada z.object |
| 20 | `router` | DealForm | `AppRouterInstance` | sim | chamada useRouter |
| 21 | `message` | DealForm | `[string, Dispatch<SetStateAction<string>>]` | sim | chamada useState |
| 21 | `setMessage` | DealForm | `[string, Dispatch<SetStateAction<string>>]` | sim | chamada useState |
| 22 | `register` | DealForm | `UseFormReturn<{ clientId: string; title: string; amount: string; expectedCloseAt?: string \| undefined; }, …` | sim | chamada useForm |
| 22 | `handleSubmit` | DealForm | `UseFormReturn<{ clientId: string; title: string; amount: string; expectedCloseAt?: string \| undefined; }, …` | sim | chamada useForm |
| 22 | `errors` | DealForm | `UseFormReturn<{ clientId: string; title: string; amount: string; expectedCloseAt?: string \| undefined; }, …` | sim | chamada useForm |
| 22 | `isSubmitting` | DealForm | `UseFormReturn<{ clientId: string; title: string; amount: string; expectedCloseAt?: string \| undefined; }, …` | sim | chamada useForm |
| 26 | `result` | onSubmit | `DealLinkedTasksConflict \| { ok: false; message: string; id?: undefined; } \| { ok: true; id: string; messa…` | sim | condição derivada |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 16 | `id` | `string` | module |
| 16 | `clientId` | `string` | module |
| 16 | `title` | `string` | module |
| 16 | `amount` | `string` | module |
| 16 | `expectedCloseAt` | `string \| null` | module |
| 18 | `clients` | `{ id: string; name: string; }[]` | DealForm |
| 18 | `id` | `string` | DealForm |
| 18 | `name` | `string` | DealForm |
| 18 | `initialClientId` | `string \| undefined` | DealForm |
| 18 | `deal` | `DealValues \| undefined` | DealForm |

## src/components/deals/stage-control.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 9 | `stages` | module | `readonly [{ readonly value: "new_lead"; readonly label: "Novo lead"; }, { readonly value: "qualification"; …` | sim | lista |
| 13 | `router` | StageControl | `AppRouterInstance` | sim | chamada useRouter |
| 14 | `stage` | StageControl | `[string, Dispatch<SetStateAction<string>>]` | sim | chamada useState |
| 14 | `setStage` | StageControl | `[string, Dispatch<SetStateAction<string>>]` | sim | chamada useState |
| 15 | `lossReason` | StageControl | `[string, Dispatch<SetStateAction<string>>]` | sim | chamada useState |
| 15 | `setLossReason` | StageControl | `[string, Dispatch<SetStateAction<string>>]` | sim | chamada useState |
| 16 | `message` | StageControl | `[string, Dispatch<SetStateAction<string>>]` | sim | chamada useState |
| 16 | `setMessage` | StageControl | `[string, Dispatch<SetStateAction<string>>]` | sim | chamada useState |
| 17 | `busy` | StageControl | `[boolean, Dispatch<SetStateAction<boolean>>]` | sim | chamada useState |
| 17 | `setBusy` | StageControl | `[boolean, Dispatch<SetStateAction<boolean>>]` | sim | chamada useState |
| 21 | `result` | save | `{ ok: false; message: string; } \| { ok: true; message?: undefined; }` | sim | chamada updateDealStage |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 11 | `dealId` | `string` | StageControl |
| 11 | `currentStage` | `string` | StageControl |

## src/components/settings/theme-control.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 8 | `THEME_KEY` | module | `"rota-theme"` | sim | literal string (valor omitido) |
| 9 | `listeners` | module | `Set<() => void>` | sim | instância Set |
| 13 | `stored` | getTheme | `string \| null` | sim | chamada localStorage.getItem |
| 41 | `theme` | ThemeControl | `Theme` | sim | chamada useSyncExternalStore |

## src/components/shell/app-shell.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 10 | `navigation` | module | `{ label: string; href: string; icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVG…` | sim | lista |
| 21 | `pathname` | AppShell | `string` | sim | chamada usePathname |
| 22 | `pageName` | AppShell | `string` | sim | expressão ?? |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 19 | `children` | `ReactNode` | AppShell |
| 19 | `user` | `{ name: string; email: string; }` | AppShell |
| 19 | `name` | `string` | AppShell |
| 19 | `email` | `string` | AppShell |
| 19 | `organization` | `{ id: string; name: string; }` | AppShell |
| 19 | `id` | `string` | AppShell |
| 19 | `name` | `string` | AppShell |
| 19 | `role` | `string` | AppShell |

## src/components/shell/logout-button.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 9 | `router` | LogoutButton | `AppRouterInstance` | sim | chamada useRouter |

## src/components/tasks/task-form.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 13 | `schema` | module | `z.ZodObject<{ title: z.ZodString; description: z.ZodOptional<z.ZodString>; priority: z.ZodEnum<{ low: "low"…` | sim | chamada z.object |
| 18 | `router` | TaskForm | `AppRouterInstance` | sim | chamada useRouter |
| 19 | `message` | TaskForm | `[string, Dispatch<SetStateAction<string>>]` | sim | chamada useState |
| 19 | `setMessage` | TaskForm | `[string, Dispatch<SetStateAction<string>>]` | sim | chamada useState |
| 20 | `register` | TaskForm | `UseFormReturn<{ title: string; priority: "low" \| "normal" \| "high" \| "urgent"; dueAt: string; descriptio…` | sim | chamada useForm |
| 20 | `handleSubmit` | TaskForm | `UseFormReturn<{ title: string; priority: "low" \| "normal" \| "high" \| "urgent"; dueAt: string; descriptio…` | sim | chamada useForm |
| 20 | `errors` | TaskForm | `UseFormReturn<{ title: string; priority: "low" \| "normal" \| "high" \| "urgent"; dueAt: string; descriptio…` | sim | chamada useForm |
| 20 | `isSubmitting` | TaskForm | `UseFormReturn<{ title: string; priority: "low" \| "normal" \| "high" \| "urgent"; dueAt: string; descriptio…` | sim | chamada useForm |
| 24 | `dueAt` | onSubmit | `string` | sim | chamada recifeDateTimeToIso |
| 26 | `result` | onSubmit | `{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }` | sim | chamada createTask |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 16 | `clients` | `{ id: string; name: string; }[]` | TaskForm |
| 16 | `id` | `string` | TaskForm |
| 16 | `name` | `string` | TaskForm |
| 16 | `deals` | `{ id: string; title: string; clientId: string; }[]` | TaskForm |
| 16 | `id` | `string` | TaskForm |
| 16 | `title` | `string` | TaskForm |
| 16 | `clientId` | `string` | TaskForm |

## src/components/tasks/task-status-control.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 10 | `router` | TaskStatusControl | `AppRouterInstance` | sim | chamada useRouter |
| 11 | `busy` | TaskStatusControl | `[boolean, Dispatch<SetStateAction<boolean>>]` | sim | chamada useState |
| 11 | `setBusy` | TaskStatusControl | `[boolean, Dispatch<SetStateAction<boolean>>]` | sim | chamada useState |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 8 | `taskId` | `string` | TaskStatusControl |
| 8 | `status` | `string` | TaskStatusControl |

## src/components/team/assignment-transfer-control.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 11 | `roleNames` | module | `Record<string, string>` | sim | objeto/configuração |
| 12 | `unassignedValue` | module | `"__unassigned__"` | sim | literal string (valor omitido) |
| 23 | `router` | AssignmentTransferControl | `AppRouterInstance` | sim | chamada useRouter |
| 24 | `dialogRef` | AssignmentTransferControl | `RefObject<HTMLDialogElement \| null>` | sim | chamada useRef |
| 25 | `submittingRef` | AssignmentTransferControl | `RefObject<boolean>` | sim | chamada useRef |
| 26 | `fromUserId` | AssignmentTransferControl | `[string, Dispatch<SetStateAction<string>>]` | sim | chamada useState |
| 26 | `setFromUserId` | AssignmentTransferControl | `[string, Dispatch<SetStateAction<string>>]` | sim | chamada useState |
| 27 | `toUserId` | AssignmentTransferControl | `[string, Dispatch<SetStateAction<string>>]` | sim | chamada useState |
| 27 | `setToUserId` | AssignmentTransferControl | `[string, Dispatch<SetStateAction<string>>]` | sim | chamada useState |
| 28 | `pending` | AssignmentTransferControl | `[boolean, Dispatch<SetStateAction<boolean>>]` | sim | chamada useState |
| 28 | `setPending` | AssignmentTransferControl | `[boolean, Dispatch<SetStateAction<boolean>>]` | sim | chamada useState |
| 29 | `confirmOpen` | AssignmentTransferControl | `[boolean, Dispatch<SetStateAction<boolean>>]` | sim | chamada useState |
| 29 | `setConfirmOpen` | AssignmentTransferControl | `[boolean, Dispatch<SetStateAction<boolean>>]` | sim | chamada useState |
| 30 | `feedback` | AssignmentTransferControl | `[{ kind: "success" \| "error"; text: string; } \| null, Dispatch<SetStateAction<{ kind: "success" \| "error…` | sim | chamada useState |
| 30 | `setFeedback` | AssignmentTransferControl | `[{ kind: "success" \| "error"; text: string; } \| null, Dispatch<SetStateAction<{ kind: "success" \| "error…` | sim | chamada useState |
| 31 | `source` | AssignmentTransferControl | `MemberAssignmentSummary \| undefined` | sim | chamada findAssignmentSource |
| 32 | `preview` | AssignmentTransferControl | `{ clients: number; deals: number; tasks: number; active: number; archived: number; total: number; } \| null` | sim | condição derivada |
| 33 | `selectionValid` | AssignmentTransferControl | `boolean` | sim | chamada isValidAssignmentTransfer |
| 34 | `destination` | AssignmentTransferControl | `string` | sim | condição derivada |
| 55 | `result` | confirmTransfer | `{ ok: true; counts: { clients: number; deals: number; tasks: number; total: number; }; archivedReferencesPe…` | sim | chamada transferMemberAssignments |
| 64 | `counts` | confirmTransfer | `{ ok: true; counts: { clients: number; deals: number; tasks: number; total: number; }; archivedReferencesPe…` | sim | alias result |
| 64 | `archivedReferencesPending` | confirmTransfer | `{ ok: true; counts: { clients: number; deals: number; tasks: number; total: number; }; archivedReferencesPe…` | sim | alias result |
| 65 | `archivedPendingText` | confirmTransfer | `string` | sim | TemplateExpression |
| 66 | `text` | confirmTransfer | `string` | sim | condição derivada |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 22 | `members` | `MemberAssignmentSummary[]` | AssignmentTransferControl |
| 30 | `kind` | `"success" \| "error"` | AssignmentTransferControl |
| 30 | `text` | `string` | AssignmentTransferControl |

## src/components/team/member-responsibilities.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 5 | `roleNames` | module | `Record<string, string>` | sim | objeto/configuração |
| 8 | `total` | CountCell | `number` | sim | expressão + |
| 52 | `hasAssignments` | MemberResponsibilities | `boolean` | sim | expressão > |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 7 | `active` | `number` | CountCell |
| 7 | `archived` | `number` | CountCell |
| 7 | `label` | `string` | CountCell |
| 7 | `activeLabel` | `string` | CountCell |
| 7 | `archivedLabel` | `string` | CountCell |
| 20 | `members` | `MemberAssignmentSummary[]` | MemberResponsibilities |

## src/components/team/member-role-control.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 8 | `selected` | MemberRoleControl | `[string, Dispatch<SetStateAction<string>>]` | sim | chamada useState |
| 8 | `setSelected` | MemberRoleControl | `[string, Dispatch<SetStateAction<string>>]` | sim | chamada useState |
| 9 | `message` | MemberRoleControl | `[string, Dispatch<SetStateAction<string>>]` | sim | chamada useState |
| 9 | `setMessage` | MemberRoleControl | `[string, Dispatch<SetStateAction<string>>]` | sim | chamada useState |
| 10 | `messageKind` | MemberRoleControl | `["success" \| "error" \| null, Dispatch<SetStateAction<"success" \| "error" \| null>>]` | sim | chamada useState |
| 10 | `setMessageKind` | MemberRoleControl | `["success" \| "error" \| null, Dispatch<SetStateAction<"success" \| "error" \| null>>]` | sim | chamada useState |
| 11 | `pending` | MemberRoleControl | `[boolean, TransitionStartFunction]` | sim | chamada useTransition |
| 11 | `startTransition` | MemberRoleControl | `[boolean, TransitionStartFunction]` | sim | chamada useTransition |
| 22 | `error` | MemberRoleControl | `unknown` | não | sem inicializador |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 6 | `memberId` | `string` | MemberRoleControl |
| 6 | `memberName` | `string` | MemberRoleControl |
| 6 | `memberEmail` | `string` | MemberRoleControl |
| 6 | `role` | `string` | MemberRoleControl |

## src/components/ui/button.tsx


**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 5 | `variant` | `ButtonVariant \| undefined` | module |
| 5 | `size` | `"default" \| "sm" \| undefined` | module |

## src/components/ui/field.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 6 | `inputId` | Field | `string \| undefined` | sim | expressão ?? |
| 7 | `hintId` | Field | `string` | sim | TemplateExpression |
| 8 | `errorId` | Field | `string` | sim | TemplateExpression |
| 21 | `textareaId` | TextareaField | `string \| undefined` | sim | expressão ?? |
| 33 | `selectId` | SelectField | `string \| undefined` | sim | expressão ?? |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 4 | `label` | `string` | Field |
| 4 | `hint` | `string \| undefined` | Field |
| 4 | `error` | `string \| undefined` | Field |
| 19 | `label` | `string` | TextareaField |
| 19 | `error` | `string \| undefined` | TextareaField |
| 31 | `label` | `string` | SelectField |
| 31 | `error` | `string \| undefined` | SelectField |

## src/components/ui/focus-visible-scroll-region.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 12 | `regionRef` | FocusVisibleScrollRegion | `RefObject<HTMLDivElement \| null>` | sim | chamada useRef |
| 15 | `focused` | handleFocusCapture | `EventTarget & HTMLDivElement` | sim | propriedade target |
| 19 | `region` | handleFocusCapture | `HTMLDivElement \| null` | sim | propriedade current |
| 22 | `regionRect` | handleFocusCapture | `DOMRect` | sim | chamada region.getBoundingClientRect |
| 23 | `focusedRect` | handleFocusCapture | `DOMRect` | sim | chamada focused.getBoundingClientRect |
| 24 | `regionLeft` | handleFocusCapture | `number` | sim | expressão + |
| 25 | `regionRight` | handleFocusCapture | `number` | sim | expressão + |
| 26 | `focusStyle` | handleFocusCapture | `CSSStyleDeclaration` | sim | chamada getComputedStyle |
| 27 | `outlineWidth` | handleFocusCapture | `number` | sim | expressão \|\| |
| 28 | `outlineOffset` | handleFocusCapture | `number` | sim | expressão \|\| |
| 29 | `outlineBleed` | handleFocusCapture | `number` | sim | chamada Math.max |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 6 | `className` | `string` | module |
| 7 | `children` | `ReactNode` | module |

## src/components/ui/page-heading.tsx


**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 3 | `eyebrow` | `string \| undefined` | PageHeading |
| 3 | `title` | `string` | PageHeading |
| 3 | `description` | `string \| undefined` | PageHeading |
| 3 | `action` | `ReactNode` | PageHeading |

## src/components/ui/status-badge.tsx

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 1 | `labels` | module | `Record<string, string>` | sim | objeto/configuração |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 8 | `value` | `string` | StatusBadge |

## scripts/debug-migrate.mjs

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 5 | `connectionString` | module | `string \| undefined` | sim | propriedade DATABASE_URL_MIGRATIONS |
| 11 | `pool` | module | `Pool` | sim | instância Pool |
| 19 | `db` | main | `NodePgDatabase<Record<string, never>> & { $client: Pool; }` | sim | chamada drizzle |

