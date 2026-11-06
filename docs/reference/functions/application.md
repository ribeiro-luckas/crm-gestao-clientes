# Funções da aplicação, scripts e configuração

Referência exaustiva gerada por análise AST/TypeScript. Cada declaração de função, método, arrow function e callback presente nos arquivos enumerados aparece uma vez. Linhas e assinaturas são obtidas do checker TypeScript. Callbacks anônimos são rotulados pelo contexto sintático. A descrição de funções públicas de negócio está em [fluxos](../../architecture/flows.md); esta tabela garante localização e assinatura sem atribuir comportamento não verificado.

## next.config.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [next.config.ts:5](../../../next.config.ts#L5) · `headers` | MethodDeclaration; module · async | `(): Promise<{ source: string; headers: { key: string; value: string; }[]; }[]>` | `Promise<{ source: string; headers: { key: string; value: string; }[]; }[]>` | — | — |

## scripts/bootstrap-owner.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [scripts/bootstrap-owner.ts:9](../../../scripts/bootstrap-owner.ts#L9) · `main` | FunctionDeclaration; module · async | `(): Promise<void>` | `Promise<void>` | loadEnvConfig, process.cwd, process.env.CRM_OWNER_EMAIL?.trim().toLowerCase, process.env.CRM_OWNER_EMAIL?.trim, process.env.CRM_OWNER_NAME?.trim, process.env.CRM_ORGANIZATION_NAME?.trim, process.env.CRM_ORGANIZATION_SLUG?.trim().toLowerCase, process.env.CRM_ORGANIZATION_SLUG?.trim | new Error("Defina CRM_OWNER_EMAIL, CRM_OWNER_PASSWORD, CRM_OWNER_NAME, CRM_ORGAN, new Error("A senha do OWNER deve ter entre 12 e 128 caracteres."), new Error("public.user, public.organization e public.member precisam estar vazia, new Error("Better Auth não retornou o usuário inicial."), new Error("Usuário foi criado, mas a associação OWNER não foi confirmada."), new Error("Bootstrap do OWNER interrompido.") |
| [scripts/bootstrap-owner.ts:41](../../../scripts/bootstrap-owner.ts#L41) · `callback@[users, organizations, members].some` | ArrowFunction; main | `(row: { total: number; }): boolean` | `boolean` | Number | — |
| [scripts/bootstrap-owner.ts:91](../../../scripts/bootstrap-owner.ts#L91) · `callback@main().catch` | ArrowFunction; module | `(): void` | `void` | console.error | — |

## scripts/lib/bootstrap-organization.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [scripts/lib/bootstrap-organization.ts:19](../../../scripts/lib/bootstrap-organization.ts#L19) · `createBootstrapOrganizationWithOwner` | FunctionDeclaration; module · async | `(input: BootstrapOrganizationInput, createId?: () => string): Promise<{ organization: { id: string; name: string; createdAt: Date; slug: string; logo: string \| null; metadata: string \| null; }; membership: { ...; }; }>` | `Promise<{ organization: { id: string; name: string; createdAt: Date; slug: string; logo: string \| null; metadata: string \| null; }; membership: { id: string; createdAt: Date; userI` | input.name.trim, input.slug.trim, input.ownerUserId.trim, getDb().transaction, getDb | new Error("Nome, slug e usuário OWNER são obrigatórios para o bootstrap.") |
| [scripts/lib/bootstrap-organization.ts:27](../../../scripts/lib/bootstrap-organization.ts#L27) · `callback@getDb().transaction` | ArrowFunction; createBootstrapOrganizationWithOwner · async | `(tx: import("<projeto>/node_modules/drizzle-orm/pg-core/session").PgTransaction<import("<projeto>/node_modules/drizzle-orm/node-postgres/session").NodePgQueryResultHKT, typeof import("<projeto>/src/db/schema/index"), …` | `Promise<{ organization: { id: string; name: string; createdAt: Date; slug: string; logo: string \| null; metadata: string \| null; }; membership: { id: string; createdAt: Date; userI` | tx.select({ id: user.id }).from(user) .where(eq(user.id, inpu…, tx.select({ id: user.id }).from(user) .where, tx.select({ id: user.id }).from, tx.select, eq, tx.insert(organization).values({ id: createId(), name: input.…, tx.insert(organization).values, tx.insert | new Error("O usuário OWNER do bootstrap não existe."), new Error("Não foi possível criar a organização do bootstrap."), new Error("Não foi possível criar a membership OWNER do bootstrap.") |

## src/proxy.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/proxy.ts:7](../../../src/proxy.ts#L7) · `proxy` | FunctionDeclaration; module | `(request: NextRequest): NextResponse<unknown>` | `NextResponse<unknown>` | NextResponse.next, randomBytes(18).toString, randomBytes, LOOPBACK_HOSTS.has, buildContentSecurityPolicy, requestHeaders.set, response.headers.set, response.headers.delete | — |

## src/app/api/auth/[...all]/route.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/app/api/auth/%5B...all%5D/route.ts:11](../../../src/app/api/auth/%5B...all%5D/route.ts#L11) · `handleAuthRoute` | FunctionDeclaration; module | `(handler: (request: Request) => Promise<Response>): (request: Request) => Promise<Response>` | `(request: Request) => Promise<Response>` | — | — |
| [src/app/api/auth/%5B...all%5D/route.ts:12](../../../src/app/api/auth/%5B...all%5D/route.ts#L12) · `(callback)` | ArrowFunction; handleAuthRoute · async | `(request: Request): Promise<Response>` | `Promise<Response>` | handler, safeLogger.error | — |
| [src/app/api/auth/%5B...all%5D/route.ts:28](../../../src/app/api/auth/%5B...all%5D/route.ts#L28) · `POST` | FunctionDeclaration; module · async | `(request: Request): Promise<Response>` | `Promise<Response>` | new URL(request.url).pathname.replace, handleAuthRoute(() => handleAuthRequestWithMappedErrors(endpo…, handleAuthRoute, handleAuthRoute(handlers.POST), request.clone().json, request.clone, denied, getAuth | — |
| [src/app/api/auth/%5B...all%5D/route.ts:31](../../../src/app/api/auth/%5B...all%5D/route.ts#L31) · `callback@handleAuthRoute` | ArrowFunction; POST | `(): Promise<Response>` | `Promise<Response>` | handleAuthRequestWithMappedErrors | — |
| [src/app/api/auth/%5B...all%5D/route.ts:31](../../../src/app/api/auth/%5B...all%5D/route.ts#L31) · `callback@handleAuthRequestWithMappedErrors` | ArrowFunction; POST | `(): Promise<Response>` | `Promise<Response>` | handlers.POST | — |
| [src/app/api/auth/%5B...all%5D/route.ts:63](../../../src/app/api/auth/%5B...all%5D/route.ts#L63) · `denied` | FunctionDeclaration; module | `(): Response` | `Response` | Response.json | — |

## src/app/api/export/clients.csv/route.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/app/api/export/clients.csv/route.ts:7](../../../src/app/api/export/clients.csv/route.ts#L7) · `GET` | FunctionDeclaration; module · async | `(request: Request): Promise<Response>` | `Promise<Response>` | requireApiWorkspaceRole, params.get("q")?.trim().slice, params.get("q")?.trim, params.get, eq, isNull, filters.push, or | — |
| [src/app/api/export/clients.csv/route.ts:24](../../../src/app/api/export/clients.csv/route.ts#L24) · `callback@rows.map` | ArrowFunction; GET | `(row: { id: string; organizationId: string; kind: "person" \| "company"; name: string; email: string \| null; phone: string \| null; status: "active" \| "prospect" \| "inactive"; source: string \| null; ... 4 more ...…` | `(string \| Date \| null)[]` | — | — |

## src/app/api/export/deals.csv/route.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/app/api/export/deals.csv/route.ts:9](../../../src/app/api/export/deals.csv/route.ts#L9) · `GET` | FunctionDeclaration; module · async | `(request: Request): Promise<Response>` | `Promise<Response>` | requireApiWorkspaceRole, params.get("q")?.trim().slice, params.get("q")?.trim, params.get, eq, isNull, conditions.push, or | — |
| [src/app/api/export/deals.csv/route.ts:27](../../../src/app/api/export/deals.csv/route.ts#L27) · `callback@rows.map` | ArrowFunction; GET | `({ deal, clientName }: { deal: { id: string; organizationId: string; clientId: string; title: string; stage: "new_lead" \| "qualification" \| "proposal" \| "negotiation" \| "won" \| "lost"; amount: string; currency: s…` | `(string \| Date \| null)[]` | — | — |

## src/components/team/assignment-transfer-utils.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/components/team/assignment-transfer-utils.ts:3](../../../src/components/team/assignment-transfer-utils.ts#L3) · `findAssignmentSource` | FunctionDeclaration; module | `(members: MemberAssignmentSummary[], userId: string): MemberAssignmentSummary \| undefined` | `MemberAssignmentSummary \| undefined` | members.find | — |
| [src/components/team/assignment-transfer-utils.ts:4](../../../src/components/team/assignment-transfer-utils.ts#L4) · `callback@members.find` | ArrowFunction; findAssignmentSource | `(member: MemberAssignmentSummary): boolean` | `boolean` | — | — |
| [src/components/team/assignment-transfer-utils.ts:7](../../../src/components/team/assignment-transfer-utils.ts#L7) · `isValidAssignmentTransfer` | FunctionDeclaration; module | `(fromUserId: string, toUserId: string, members: MemberAssignmentSummary[]): boolean` | `boolean` | members.some | — |
| [src/components/team/assignment-transfer-utils.ts:9](../../../src/components/team/assignment-transfer-utils.ts#L9) · `callback@members.some` | ArrowFunction; isValidAssignmentTransfer | `(member: MemberAssignmentSummary): boolean` | `boolean` | — | — |
| [src/components/team/assignment-transfer-utils.ts:10](../../../src/components/team/assignment-transfer-utils.ts#L10) · `callback@members.some` | ArrowFunction; isValidAssignmentTransfer | `(member: MemberAssignmentSummary): boolean` | `boolean` | — | — |
| [src/components/team/assignment-transfer-utils.ts:14](../../../src/components/team/assignment-transfer-utils.ts#L14) · `getTransferPreview` | FunctionDeclaration; module | `(source: MemberAssignmentSummary): { clients: number; deals: number; tasks: number; active: number; archived: number; total: number; }` | `{ clients: number; deals: number; tasks: number; active: number; archived: number; total: number; }` | — | — |

## src/db/index.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/db/index.ts:8](../../../src/db/index.ts#L8) · `getPool` | FunctionDeclaration; module | `(): Pool` | `Pool` | getIsolatedTestDatabaseUrl | new Error("DATABASE_URL não configurada. Copie .env.example para .env.local e co |
| [src/db/index.ts:19](../../../src/db/index.ts#L19) · `getDb` | FunctionDeclaration; module | `(): import("<projeto>/node_modules/drizzle-orm/node-postgres/driver").NodePgDatabase<typeof schema> & { $client: Pool; }` | `NodePgDatabase<typeof schema> & { $client: Pool; }` | createDatabase | — |
| [src/db/index.ts:24](../../../src/db/index.ts#L24) · `createDatabase` | FunctionDeclaration; module | `(): import("<projeto>/node_modules/drizzle-orm/node-postgres/driver").NodePgDatabase<typeof schema> & { $client: Pool; }` | `NodePgDatabase<typeof schema> & { $client: Pool; }` | drizzle, getPool | — |

## src/db/test-url.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/db/test-url.ts:1](../../../src/db/test-url.ts#L1) · `getIsolatedTestDatabaseUrl` | FunctionDeclaration; module | `(value?: string \| undefined): string` | `string` | decodeURIComponent, url.pathname.replace, ["postgres:", "postgresql:"].includes, url.toString | new Error("TEST_DATABASE_URL ausente no modo de teste."), new Error("TEST_DATABASE_URL inválida no modo de teste."), new Error("BLOQUEIO: modo de teste exige PostgreSQL crm_test_isolated em 127.0.0 |

## src/db/schema/auth.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/db/schema/auth.ts:4](../../../src/db/schema/auth.ts#L4) · `instant` | ArrowFunction; module | `(name: string): import("<projeto>/node_modules/drizzle-orm/pg-core/index").PgTimestampBuilderInitial<string>` | `PgTimestampBuilderInitial<string>` | timestamp | — |
| [src/db/schema/auth.ts:14](../../../src/db/schema/auth.ts#L14) · `callback@pgTable` | ArrowFunction; module | `(table: { id: import("<projeto>/node_modules/drizzle-orm/pg-core/index").ExtraConfigColumn<import("<projeto>/node_modules/drizzle-orm/column").ColumnBaseConfig<import("<projeto>/node_modules/drizzle-orm/column-builder…` | `IndexBuilder[]` | uniqueIndex("user_email_uidx").on, uniqueIndex | — |
| [src/db/schema/auth.ts:24](../../../src/db/schema/auth.ts#L24) · `callback@text("user_id").notNull().references` | ArrowFunction; module | `(): import("<projeto>/node_modules/drizzle-orm/pg-core/index").PgColumn<{ name: "id"; tableName: "user"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: false; i…` | `PgColumn<{ name: "id"; tableName: "user"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: false; isPrimaryKey: true; isAutoi` | — | — |
| [src/db/schema/auth.ts:26](../../../src/db/schema/auth.ts#L26) · `callback@pgTable` | ArrowFunction; module | `(table: { id: import("<projeto>/node_modules/drizzle-orm/pg-core/index").ExtraConfigColumn<import("<projeto>/node_modules/drizzle-orm/column").ColumnBaseConfig<import("<projeto>/node_modules/drizzle-orm/column-builder…` | `IndexBuilder[]` | uniqueIndex("session_token_uidx").on, uniqueIndex, index("session_user_idx").on, index | — |
| [src/db/schema/auth.ts:32](../../../src/db/schema/auth.ts#L32) · `callback@text("user_id").notNull().references` | ArrowFunction; module | `(): import("<projeto>/node_modules/drizzle-orm/pg-core/index").PgColumn<{ name: "id"; tableName: "user"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: false; i…` | `PgColumn<{ name: "id"; tableName: "user"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: false; isPrimaryKey: true; isAutoi` | — | — |
| [src/db/schema/auth.ts:42](../../../src/db/schema/auth.ts#L42) · `callback@pgTable` | ArrowFunction; module | `(table: { id: import("<projeto>/node_modules/drizzle-orm/pg-core/index").ExtraConfigColumn<import("<projeto>/node_modules/drizzle-orm/column").ColumnBaseConfig<import("<projeto>/node_modules/drizzle-orm/column-builder…` | `IndexBuilder[]` | index("account_user_idx").on, index | — |
| [src/db/schema/auth.ts:51](../../../src/db/schema/auth.ts#L51) · `callback@pgTable` | ArrowFunction; module | `(table: { id: import("<projeto>/node_modules/drizzle-orm/pg-core/index").ExtraConfigColumn<import("<projeto>/node_modules/drizzle-orm/column").ColumnBaseConfig<import("<projeto>/node_modules/drizzle-orm/column-builder…` | `IndexBuilder[]` | index("verification_identifier_idx").on, index | — |
| [src/db/schema/auth.ts:60](../../../src/db/schema/auth.ts#L60) · `callback@pgTable` | ArrowFunction; module | `(table: { id: import("<projeto>/node_modules/drizzle-orm/pg-core/index").ExtraConfigColumn<import("<projeto>/node_modules/drizzle-orm/column").ColumnBaseConfig<import("<projeto>/node_modules/drizzle-orm/column-builder…` | `IndexBuilder[]` | uniqueIndex("organization_slug_uidx").on, uniqueIndex | — |
| [src/db/schema/auth.ts:64](../../../src/db/schema/auth.ts#L64) · `callback@text("organization_id").notNull().references` | ArrowFunction; module | `(): import("<projeto>/node_modules/drizzle-orm/pg-core/index").PgColumn<{ name: "id"; tableName: "organization"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: …` | `PgColumn<{ name: "id"; tableName: "organization"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: false; isPrimaryKey: true;` | — | — |
| [src/db/schema/auth.ts:65](../../../src/db/schema/auth.ts#L65) · `callback@text("user_id").notNull().references` | ArrowFunction; module | `(): import("<projeto>/node_modules/drizzle-orm/pg-core/index").PgColumn<{ name: "id"; tableName: "user"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: false; i…` | `PgColumn<{ name: "id"; tableName: "user"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: false; isPrimaryKey: true; isAutoi` | — | — |
| [src/db/schema/auth.ts:68](../../../src/db/schema/auth.ts#L68) · `callback@pgTable` | ArrowFunction; module | `(table: { id: import("<projeto>/node_modules/drizzle-orm/pg-core/index").ExtraConfigColumn<import("<projeto>/node_modules/drizzle-orm/column").ColumnBaseConfig<import("<projeto>/node_modules/drizzle-orm/column-builder…` | `IndexBuilder[]` | uniqueIndex("member_org_user_uidx").on, uniqueIndex, index("member_user_idx").on, index | — |
| [src/db/schema/auth.ts:81](../../../src/db/schema/auth.ts#L81) · `callback@text("inviter_id").notNull().references` | ArrowFunction; module | `(): import("<projeto>/node_modules/drizzle-orm/pg-core/index").PgColumn<{ name: "id"; tableName: "user"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: false; i…` | `PgColumn<{ name: "id"; tableName: "user"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: false; isPrimaryKey: true; isAutoi` | — | — |
| [src/db/schema/auth.ts:82](../../../src/db/schema/auth.ts#L82) · `callback@text("organization_id").notNull().references` | ArrowFunction; module | `(): import("<projeto>/node_modules/drizzle-orm/pg-core/index").PgColumn<{ name: "id"; tableName: "organization"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: …` | `PgColumn<{ name: "id"; tableName: "organization"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: false; isPrimaryKey: true;` | — | — |
| [src/db/schema/auth.ts:87](../../../src/db/schema/auth.ts#L87) · `callback@pgTable` | ArrowFunction; module | `(table: { id: import("<projeto>/node_modules/drizzle-orm/pg-core/index").ExtraConfigColumn<import("<projeto>/node_modules/drizzle-orm/column").ColumnBaseConfig<import("<projeto>/node_modules/drizzle-orm/column-builder…` | `IndexBuilder[]` | index("invitation_org_idx").on, index | — |

## src/db/schema/crm.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/db/schema/crm.ts:5](../../../src/db/schema/crm.ts#L5) · `instant` | ArrowFunction; module | `(name: string): import("<projeto>/node_modules/drizzle-orm/pg-core/index").PgTimestampBuilderInitial<string>` | `PgTimestampBuilderInitial<string>` | timestamp | — |
| [src/db/schema/crm.ts:16](../../../src/db/schema/crm.ts#L16) · `callback@text("organization_id").notNull().references` | ArrowFunction; module | `(): import("<projeto>/node_modules/drizzle-orm/pg-core/index").PgColumn<{ name: "id"; tableName: "organization"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: …` | `PgColumn<{ name: "id"; tableName: "organization"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: false; isPrimaryKey: true;` | — | — |
| [src/db/schema/crm.ts:28](../../../src/db/schema/crm.ts#L28) · `callback@pgTable` | ArrowFunction; module | `(table: { id: import("<projeto>/node_modules/drizzle-orm/pg-core/index").ExtraConfigColumn<import("<projeto>/node_modules/drizzle-orm/column").ColumnBaseConfig<import("<projeto>/node_modules/drizzle-orm/column-builder…` | `(CheckBuilder \| ForeignKeyBuilder \| IndexBuilder)[]` | uniqueIndex("clients_org_id_uidx").on, uniqueIndex, foreignKey({ columns: [table.organizationId, table.ownerUserI…, foreignKey, index("clients_org_status_name_idx").on, index, index("clients_org_owner_idx").on, check | — |
| [src/db/schema/crm.ts:38](../../../src/db/schema/crm.ts#L38) · `callback@text("organization_id").notNull().references` | ArrowFunction; module | `(): import("<projeto>/node_modules/drizzle-orm/pg-core/index").PgColumn<{ name: "id"; tableName: "organization"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: …` | `PgColumn<{ name: "id"; tableName: "organization"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: false; isPrimaryKey: true;` | — | — |
| [src/db/schema/crm.ts:48](../../../src/db/schema/crm.ts#L48) · `callback@pgTable` | ArrowFunction; module | `(table: { id: import("<projeto>/node_modules/drizzle-orm/pg-core/index").ExtraConfigColumn<import("<projeto>/node_modules/drizzle-orm/column").ColumnBaseConfig<import("<projeto>/node_modules/drizzle-orm/column-builder…` | `(CheckBuilder \| ForeignKeyBuilder \| IndexBuilder)[]` | foreignKey({ columns: [table.organizationId, table.companyCli…, foreignKey, index("contacts_org_company_name_idx").on, index, check | — |
| [src/db/schema/crm.ts:56](../../../src/db/schema/crm.ts#L56) · `callback@text("organization_id").notNull().references` | ArrowFunction; module | `(): import("<projeto>/node_modules/drizzle-orm/pg-core/index").PgColumn<{ name: "id"; tableName: "organization"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: …` | `PgColumn<{ name: "id"; tableName: "organization"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: false; isPrimaryKey: true;` | — | — |
| [src/db/schema/crm.ts:69](../../../src/db/schema/crm.ts#L69) · `callback@pgTable` | ArrowFunction; module | `(table: { id: import("<projeto>/node_modules/drizzle-orm/pg-core/index").ExtraConfigColumn<import("<projeto>/node_modules/drizzle-orm/column").ColumnBaseConfig<import("<projeto>/node_modules/drizzle-orm/column-builder…` | `(CheckBuilder \| ForeignKeyBuilder \| IndexBuilder)[]` | foreignKey({ columns: [table.organizationId, table.clientId],…, foreignKey, foreignKey({ columns: [table.organizationId, table.ownerUserI…, uniqueIndex("deals_org_id_uidx").on, uniqueIndex, uniqueIndex("deals_org_id_client_id_uidx").on, index("deals_org_stage_due_idx").on, index | — |
| [src/db/schema/crm.ts:86](../../../src/db/schema/crm.ts#L86) · `callback@text("organization_id").notNull().references` | ArrowFunction; module | `(): import("<projeto>/node_modules/drizzle-orm/pg-core/index").PgColumn<{ name: "id"; tableName: "organization"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: …` | `PgColumn<{ name: "id"; tableName: "organization"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: false; isPrimaryKey: true;` | — | — |
| [src/db/schema/crm.ts:98](../../../src/db/schema/crm.ts#L98) · `callback@pgTable` | ArrowFunction; module | `(table: { id: import("<projeto>/node_modules/drizzle-orm/pg-core/index").ExtraConfigColumn<import("<projeto>/node_modules/drizzle-orm/column").ColumnBaseConfig<import("<projeto>/node_modules/drizzle-orm/column-builder…` | `(CheckBuilder \| ForeignKeyBuilder \| IndexBuilder)[]` | foreignKey({ columns: [table.organizationId, table.clientId],…, foreignKey, foreignKey({ columns: [table.organizationId, table.dealId], f…, foreignKey({ columns: [table.organizationId, table.dealId, ta…, foreignKey({ columns: [table.organizationId, table.assigneeUs…, uniqueIndex("tasks_org_id_uidx").on, uniqueIndex, index("tasks_org_deal_client_idx").on | — |
| [src/db/schema/crm.ts:112](../../../src/db/schema/crm.ts#L112) · `callback@text("organization_id").notNull().references` | ArrowFunction; module | `(): import("<projeto>/node_modules/drizzle-orm/pg-core/index").PgColumn<{ name: "id"; tableName: "organization"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: …` | `PgColumn<{ name: "id"; tableName: "organization"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: false; isPrimaryKey: true;` | — | — |
| [src/db/schema/crm.ts:117](../../../src/db/schema/crm.ts#L117) · `callback@text("actor_user_id").notNull().references` | ArrowFunction; module | `(): import("<projeto>/node_modules/drizzle-orm/pg-core/index").PgColumn<{ name: "id"; tableName: "user"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: false; i…` | `PgColumn<{ name: "id"; tableName: "user"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: false; isPrimaryKey: true; isAutoi` | — | — |
| [src/db/schema/crm.ts:122](../../../src/db/schema/crm.ts#L122) · `callback@pgTable` | ArrowFunction; module | `(table: { id: import("<projeto>/node_modules/drizzle-orm/pg-core/index").ExtraConfigColumn<import("<projeto>/node_modules/drizzle-orm/column").ColumnBaseConfig<import("<projeto>/node_modules/drizzle-orm/column-builder…` | `(CheckBuilder \| ForeignKeyBuilder \| IndexBuilder)[]` | foreignKey({ columns: [table.organizationId, table.clientId],…, foreignKey, foreignKey({ columns: [table.organizationId, table.dealId], f…, foreignKey({ columns: [table.organizationId, table.taskId], f…, index("activities_org_occurred_idx").on, index, check | — |
| [src/db/schema/crm.ts:133](../../../src/db/schema/crm.ts#L133) · `callback@text("organization_id").notNull().references` | ArrowFunction; module | `(): import("<projeto>/node_modules/drizzle-orm/pg-core/index").PgColumn<{ name: "id"; tableName: "organization"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: …` | `PgColumn<{ name: "id"; tableName: "organization"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: false; isPrimaryKey: true;` | — | — |
| [src/db/schema/crm.ts:134](../../../src/db/schema/crm.ts#L134) · `callback@text("actor_user_id").notNull().references` | ArrowFunction; module | `(): import("<projeto>/node_modules/drizzle-orm/pg-core/index").PgColumn<{ name: "id"; tableName: "user"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: false; i…` | `PgColumn<{ name: "id"; tableName: "user"; dataType: "string"; columnType: "PgText"; data: string; driverParam: string; notNull: true; hasDefault: false; isPrimaryKey: true; isAutoi` | — | — |
| [src/db/schema/crm.ts:140](../../../src/db/schema/crm.ts#L140) · `callback@pgTable` | ArrowFunction; module | `(table: { id: import("<projeto>/node_modules/drizzle-orm/pg-core/index").ExtraConfigColumn<import("<projeto>/node_modules/drizzle-orm/column").ColumnBaseConfig<import("<projeto>/node_modules/drizzle-orm/column-builder…` | `IndexBuilder[]` | index("audit_org_created_idx").on, index, index("audit_org_entity_idx").on | — |

## src/lib/auth-http-error-context.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/lib/auth-http-error-context.ts:18](../../../src/lib/auth-http-error-context.ts#L18) · `recordOrganizationOwnerInvariantError` | FunctionDeclaration; module | `(error: unknown): boolean` | `boolean` | requestContext.getStore, protectedMembershipEndpoints.has, mapOrganizationRequiresOwnerError | — |
| [src/lib/auth-http-error-context.ts:28](../../../src/lib/auth-http-error-context.ts#L28) · `recordMemberAssignmentIntegrityError` | FunctionDeclaration; module | `(error: unknown): boolean` | `boolean` | requestContext.getStore, protectedMembershipEndpoints.has, mapMemberAssignmentIntegrityError | — |
| [src/lib/auth-http-error-context.ts:37](../../../src/lib/auth-http-error-context.ts#L37) · `getOrganizationOwnerConflictResponse` | FunctionDeclaration; module | `(response: Response, context: AuthRequestErrorContext): Response` | `Response` | headers.set, headers.delete, JSON.stringify | — |
| [src/lib/auth-http-error-context.ts:51](../../../src/lib/auth-http-error-context.ts#L51) · `getMemberAssignmentConflictResponse` | FunctionDeclaration; module | `(response: Response, context: AuthRequestErrorContext): Response` | `Response` | headers.set, headers.delete, JSON.stringify | — |
| [src/lib/auth-http-error-context.ts:65](../../../src/lib/auth-http-error-context.ts#L65) · `handleAuthRequestWithMappedErrors` | FunctionDeclaration; module · async | `(pathname: string, operation: () => Promise<Response>): Promise<Response>` | `Promise<Response>` | requestContext.run | — |
| [src/lib/auth-http-error-context.ts:70](../../../src/lib/auth-http-error-context.ts#L70) · `callback@requestContext.run` | ArrowFunction; handleAuthRequestWithMappedErrors · async | `(): Promise<Response>` | `Promise<Response>` | operation, recordOrganizationOwnerInvariantError, recordMemberAssignmentIntegrityError, getOrganizationOwnerConflictResponse, getMemberAssignmentConflictResponse | error |

## src/lib/auth.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/lib/auth.ts:17](../../../src/lib/auth.ts#L17) · `getAuth` | FunctionDeclaration; module | `(options?: { bootstrap?: boolean; }): import("<projeto>/node_modules/better-auth/dist/index").Auth<{ appName: string; logger: { level: "warn"; disableColors: boolean; log(level: "warn" \| "debug" \| "info" \| "success…` | `Auth<{ appName: string; logger: { level: "warn"; disableColors: boolean; log(level: BetterAuthLogLevel, message: unknown, ...args: unknown[]): void; }; ... 9 more ...; advanced: {` | createAuth | — |
| [src/lib/auth.ts:30](../../../src/lib/auth.ts#L30) · `createAuth` | FunctionDeclaration; module | `(bootstrap: boolean): import("<projeto>/node_modules/better-auth/dist/index").Auth<{ appName: string; logger: { level: "warn"; disableColors: boolean; log(level: "warn" \| "debug" \| "info" \| "success" \| "error", me…` | `Auth<{ appName: string; logger: { level: "warn"; disableColors: boolean; log(level: BetterAuthLogLevel, message: unknown, ...args: unknown[]): void; }; ... 9 more ...; advanced: {` | betterAuth, createBetterAuthLogAdapter, drizzleAdapter, getDb, organizationPlugin, createAuthMiddleware | new Error("BETTER_AUTH_SECRET ausente ou curto. Gere um segredo aleatório de pel |
| [src/lib/auth.ts:40](../../../src/lib/auth.ts#L40) · `getAssignmentCounts` | FunctionDeclaration; createAuth · async | `(organizationId: string, userId: string): Promise<{ clients: number; deals: number; tasks: number; }>` | `Promise<{ clients: number; deals: number; tasks: number; }>` | getDb, Promise.all, db.select({ total: count() }).from(clients).where, db.select({ total: count() }).from, db.select, count, and, eq | — |
| [src/lib/auth.ts:89](../../../src/lib/auth.ts#L89) · `sendInvitationEmail` | ArrowFunction; createAuth · async | `(): Promise<never>` | `Promise<never>` | — | new Error("Convites dependem da configuração de um serviço de e-mail.") |
| [src/lib/auth.ts:93](../../../src/lib/auth.ts#L93) · `beforeRemoveMember` | ArrowFunction; createAuth · async | `({ member: targetMembership, user: targetUser, organization: targetOrganization }: { member: import("<projeto>/node_modules/better-auth/dist/plugins/index").Member & Record<string, any>; user: import("<projeto>/node_m…` | `Promise<void>` | APIError.from, getAssignmentCounts | APIError.from("INTERNAL_SERVER_ERROR", { code: "MEMBER_REMOVAL_CONTEXT_INVALID",, APIError.from("CONFLICT", { code: "MEMBER_HAS_ASSIGNMENTS", message: `Este membr |
| [src/lib/auth.ts:111](../../../src/lib/auth.ts#L111) · `beforeUpdateMemberRole` | ArrowFunction; createAuth · async | `({ member: target, newRole }: { member: import("<projeto>/node_modules/better-auth/dist/plugins/index").Member & Record<string, any>; newRole: string; user: import("<projeto>/node_modules/better-auth/dist/index").User…` | `Promise<void>` | target.role.toLowerCase().split(",").includes, target.role.toLowerCase().split, target.role.toLowerCase, newRole.toLowerCase().split(",").includes, newRole.toLowerCase().split, newRole.toLowerCase, APIError.from | APIError.from("FORBIDDEN", { code: "OWNER_ROLE_PROTECTED", message: "O papel do |
| [src/lib/auth.ts:122](../../../src/lib/auth.ts#L122) · `callback@createAuthMiddleware` | ArrowFunction; createAuth · async | `(requestContext: import("<projeto>/node_modules/better-call/dist/middleware").MiddlewareContext<import("<projeto>/node_modules/better-call/dist/middleware").MiddlewareOptions, import("<projeto>/node_modules/better-aut…` | `Promise<{ response: Response; } \| undefined>` | APIError.from, getAuth().api.getSession, getAuth, updateMemberRoleWithAudit, Response.json, getDb().select({ userId: member.userId }).from(member) .where…, getDb().select({ userId: member.userId }).from(member) .where, getDb().select({ userId: member.userId }).from | APIError.from("BAD_REQUEST", { code: "INVALID_MEMBER_ROLE_CHANGE", message: "Inf, APIError.from("UNAUTHORIZED", { code: "UNAUTHORIZED", message: "Autenticação nec, APIError.from("FORBIDDEN", { code: "ROLE_CHANGE_FORBIDDEN", message: "Você não t, APIError.from(error.apiStatus, { code: error.code, message: error.message }), error, APIError.from("CONFLICT", { code: "MEMBER_HAS_ASSIGNMENTS", message: `Você ainda |
| [src/lib/auth.ts:190](../../../src/lib/auth.ts#L190) · `before` | ArrowFunction; createAuth · async | `(newSession: { id: string; createdAt: Date; updatedAt: Date; userId: string; expiresAt: Date; token: string; ipAddress?: string \| null \| undefined; userAgent?: string \| null \| undefined; } & Record<...>): Promise<…` | `Promise<{ data: { activeOrganizationId: string \| undefined; id: string; createdAt: Date; updatedAt: Date; userId: string; expiresAt: Date; token: string; ipAddress?: string \| null` | getDb() .select({ organizationId: member.organizationId }) .f…, getDb() .select({ organizationId: member.organizationId }) .from, getDb() .select, getDb, eq, asc, memberships.find | — |
| [src/lib/auth.ts:196](../../../src/lib/auth.ts#L196) · `callback@memberships.find` | ArrowFunction; createAuth | `(item: { organizationId: string; }): boolean` | `boolean` | — | — |

## src/lib/content-security-policy.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/lib/content-security-policy.ts:5](../../../src/lib/content-security-policy.ts#L5) · `buildContentSecurityPolicy` | FunctionDeclaration; module | `(nonce: string, options: { development: boolean; websocketOrigin?: string; }): string` | `string` | directives.join | — |

## src/lib/csv.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/lib/csv.ts:1](../../../src/lib/csv.ts#L1) · `csvCell` | FunctionDeclaration; module | `(value: string \| number \| Date \| null \| undefined): string` | `string` | value.toISOString, String, /^[\t\r\n ]*[=+\-@]/.test, text.replaceAll | — |
| [src/lib/csv.ts:10](../../../src/lib/csv.ts#L10) · `csvDocument` | FunctionDeclaration; module | `(headers: string[], rows: Array<Array<string \| number \| Date \| null \| undefined>>): string` | `string` | [headers, ...rows].map((row) => row.map(csvCell).join(",")).join, [headers, ...rows].map | — |
| [src/lib/csv.ts:12](../../../src/lib/csv.ts#L12) · `callback@[headers, ...rows].map` | ArrowFunction; csvDocument | `(row: (string \| number \| Date \| null \| undefined)[]): string` | `string` | row.map(csvCell).join, row.map | — |

## src/lib/deal-linked-tasks-error.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/lib/deal-linked-tasks-error.ts:11](../../../src/lib/deal-linked-tasks-error.ts#L11) · `mapDealLinkedTasksError` | FunctionDeclaration; module | `(error: unknown): DealLinkedTasksConflict \| undefined` | `DealLinkedTasksConflict \| undefined` | visited.has, visited.add | — |

## src/lib/member-assignment-integrity-error.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/lib/member-assignment-integrity-error.ts:14](../../../src/lib/member-assignment-integrity-error.ts#L14) · `mapMemberAssignmentIntegrityError` | FunctionDeclaration; module | `(error: unknown): MemberAssignmentConflict \| undefined` | `MemberAssignmentConflict \| undefined` | visited.has, visited.add, MEMBER_ASSIGNMENT_CONSTRAINTS.has | — |

## src/lib/organization-owner-invariant-error.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/lib/organization-owner-invariant-error.ts:10](../../../src/lib/organization-owner-invariant-error.ts#L10) · `mapOrganizationRequiresOwnerError` | FunctionDeclaration; module | `(error: unknown): OrganizationOwnerConflict \| undefined` | `OrganizationOwnerConflict \| undefined` | visited.has, visited.add | — |

## src/lib/safe-logger.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/lib/safe-logger.ts:51](../../../src/lib/safe-logger.ts#L51) · `safeCode` | FunctionDeclaration; module | `(value: unknown): string \| undefined` | `string \| undefined` | sensitiveTerms.test, sqlStatePattern.test, knownErrorCodes.has | — |
| [src/lib/safe-logger.ts:56](../../../src/lib/safe-logger.ts#L56) · `errorSummary` | FunctionDeclaration; module | `(error: unknown): Record<string, string> \| undefined` | `Record<string, string> \| undefined` | errorNames.has, safeCode | — |
| [src/lib/safe-logger.ts:73](../../../src/lib/safe-logger.ts#L73) · `createSafeLogger` | FunctionDeclaration; module | `(sink?: LogSink): { error: (input: SafeLogInput) => void; warn: (input: SafeLogInput) => void; info: (input: SafeLogInput) => void; }` | `{ error: (input: SafeLogInput) => void; warn: (input: SafeLogInput) => void; info: (input: SafeLogInput) => void; }` | — | — |
| [src/lib/safe-logger.ts:74](../../../src/lib/safe-logger.ts#L74) · `write` | ArrowFunction; createSafeLogger | `(level: LogLevel, input: SafeLogInput): void` | `void` | new Date().toISOString, categories.has, operations.has, safeCode, uuidPattern.test, errorSummary, sink[level], JSON.stringify | — |
| [src/lib/safe-logger.ts:102](../../../src/lib/safe-logger.ts#L102) · `error` | ArrowFunction; createSafeLogger | `(input: SafeLogInput): void` | `void` | write | — |
| [src/lib/safe-logger.ts:103](../../../src/lib/safe-logger.ts#L103) · `warn` | ArrowFunction; createSafeLogger | `(input: SafeLogInput): void` | `void` | write | — |
| [src/lib/safe-logger.ts:104](../../../src/lib/safe-logger.ts#L104) · `info` | ArrowFunction; createSafeLogger | `(input: SafeLogInput): void` | `void` | write | — |
| [src/lib/safe-logger.ts:110](../../../src/lib/safe-logger.ts#L110) · `createBetterAuthLogAdapter` | FunctionDeclaration; module | `(logger?: ReturnType<typeof createSafeLogger>): { level: "warn"; disableColors: boolean; log(level: BetterAuthLogLevel, message: unknown, ...args: unknown[]): void; }` | `{ level: "warn"; disableColors: boolean; log(level: BetterAuthLogLevel, message: unknown, ...args: unknown[]): void; }` | — | — |
| [src/lib/safe-logger.ts:115](../../../src/lib/safe-logger.ts#L115) · `log` | MethodDeclaration; createBetterAuthLogAdapter | `(level: BetterAuthLogLevel, message: unknown, ...args: unknown[]): void` | `void` | args.find, logger[safeLevel] | — |
| [src/lib/safe-logger.ts:119](../../../src/lib/safe-logger.ts#L119) · `callback@args.find` | ArrowFunction; log | `(argument: unknown): argument is Error` | `boolean` | — | — |

## src/lib/utils.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/lib/utils.ts:4](../../../src/lib/utils.ts#L4) · `cn` | FunctionDeclaration; module | `(...values: ClassValue[]): string` | `string` | twMerge, clsx | — |
| [src/lib/utils.ts:10](../../../src/lib/utils.ts#L10) · `formatCurrency` | FunctionDeclaration; module | `(value: string \| number, currency?: string): string` | `string` | Number, new Intl.NumberFormat("pt-BR", { style: "currency", currency … | — |
| [src/lib/utils.ts:18](../../../src/lib/utils.ts#L18) · `formatDate` | FunctionDeclaration; module | `(value: Date \| string, options?: Intl.DateTimeFormatOptions): string` | `string` | new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife"… | — |
| [src/lib/utils.ts:26](../../../src/lib/utils.ts#L26) · `formatDateTime` | FunctionDeclaration; module | `(value: Date \| string): string` | `string` | formatDate | — |
| [src/lib/utils.ts:32](../../../src/lib/utils.ts#L32) · `initials` | FunctionDeclaration; module | `(name: string): string` | `string` | name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => p…, name.split(/\s+/).filter(Boolean).slice(0, 2).map, name.split(/\s+/).filter(Boolean).slice, name.split(/\s+/).filter, name.split | — |
| [src/lib/utils.ts:34](../../../src/lib/utils.ts#L34) · `callback@name.split(/\s+/).filter(Boolean).slice(0, 2).map` | ArrowFunction; initials | `(part: string): string` | `string` | — | — |
| [src/lib/utils.ts:38](../../../src/lib/utils.ts#L38) · `recifeDateTimeToIso` | FunctionDeclaration; module | `(value: string): string` | `string` | /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec, Date.UTC, Number, new Intl.DateTimeFormat("en-US", { timeZone: "America/Recife"…, Object.fromEntries, parts.map, new Date(wallClockAsUtc - timezoneOffset).toISOString | — |
| [src/lib/utils.ts:47](../../../src/lib/utils.ts#L47) · `callback@parts.map` | ArrowFunction; recifeDateTimeToIso | `(item: Intl.DateTimeFormatPart): [keyof Intl.DateTimeFormatPartTypesRegistry, string]` | `[keyof Intl.DateTimeFormatPartTypesRegistry, string]` | — | — |

## src/lib/workspace.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/lib/workspace.ts:21](../../../src/lib/workspace.ts#L21) · `(callback)` | Constructor; module | `(): WorkspaceAuthenticationError` | `WorkspaceAuthenticationError` | super | — |
| [src/lib/workspace.ts:25](../../../src/lib/workspace.ts#L25) · `(callback)` | Constructor; module | `(): WorkspaceAuthorizationError` | `WorkspaceAuthorizationError` | super | — |
| [src/lib/workspace.ts:32](../../../src/lib/workspace.ts#L32) · `(callback)` | Constructor; module | `(reason?: WorkspaceSelectionReason): WorkspaceSelectionRequiredError` | `WorkspaceSelectionRequiredError` | super | — |
| [src/lib/workspace.ts:41](../../../src/lib/workspace.ts#L41) · `resolveWorkspaceSelection` | FunctionDeclaration; module | `(activeOrganizationId: string \| null \| undefined, memberships: WorkspaceMembership[]): WorkspaceSelection` | `WorkspaceSelection` | memberships.find | — |
| [src/lib/workspace.ts:48](../../../src/lib/workspace.ts#L48) · `callback@memberships.find` | ArrowFunction; resolveWorkspaceSelection | `(item: WorkspaceMembership): boolean` | `boolean` | — | — |
| [src/lib/workspace.ts:56](../../../src/lib/workspace.ts#L56) · `getMemberships` | FunctionDeclaration; module · async | `(userId: string): Promise<WorkspaceMembership[]>` | `Promise<WorkspaceMembership[]>` | getDb().select({ organizationId: organization.id, organizatio…, getDb().select, getDb, eq, asc | — |
| [src/lib/workspace.ts:67](../../../src/lib/workspace.ts#L67) · `activateUnambiguousMembership` | FunctionDeclaration; module · async | `(organizationId: string): Promise<boolean>` | `Promise<boolean>` | getAuth().api.setActiveOrganization, getAuth, headers | — |
| [src/lib/workspace.ts:79](../../../src/lib/workspace.ts#L79) · `validRole` | FunctionDeclaration; module | `(role: string): role is WorkspaceRole` | `boolean` | — | — |
| [src/lib/workspace.ts:83](../../../src/lib/workspace.ts#L83) · `contextFor` | FunctionDeclaration; module | `(session: { user: { id: string; name: string; email: string; }; }, membership: WorkspaceMembership): { user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: WorkspaceRo…` | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: WorkspaceRole; } \| null` | membership.role.toLowerCase, validRole | — |
| [src/lib/workspace.ts:94](../../../src/lib/workspace.ts#L94) · `requireApiWorkspaceRole` | FunctionDeclaration; module · async | `(allowed: WorkspaceRole[]): Promise<{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: WorkspaceRole; }>` | `Promise<{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: WorkspaceRole; }>` | getAuth, auth.api.getSession, headers, getMemberships, resolveWorkspaceSelection, activateUnambiguousMembership, contextFor, allowed.includes | new WorkspaceAuthenticationError(), new WorkspaceSelectionRequiredError("selection-failed"), new WorkspaceSelectionRequiredError(selection.reason), new WorkspaceAuthorizationError() |
| [src/lib/workspace.ts:124](../../../src/lib/workspace.ts#L124) · `workspaceApiErrorResponse` | FunctionDeclaration; module | `(error: unknown): Response` | `Response` | Response.json, safeLogger.error | — |
| [src/lib/workspace.ts:138](../../../src/lib/workspace.ts#L138) · `callback@cache` | ArrowFunction; module · async | `(): Promise<{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: WorkspaceRole; }>` | `Promise<{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: WorkspaceRole; }>` | getAuth, auth.api.getSession, headers, redirect, getMemberships, resolveWorkspaceSelection, activateUnambiguousMembership, contextFor | — |
| [src/lib/workspace.ts:168](../../../src/lib/workspace.ts#L168) · `requireWorkspaceRole` | FunctionDeclaration; module · async | `(allowed: WorkspaceRole[]): Promise<{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: WorkspaceRole; }>` | `Promise<{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: WorkspaceRole; }>` | getWorkspaceContext, allowed.includes | new Error("Você não tem permissão para realizar esta ação.") |

## src/modules/activities/actions.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/modules/activities/actions.ts:17](../../../src/modules/activities/actions.ts#L17) · `callback@z.object({ clientId: z.union([z.uuid(), z.literal("")]).optional(), dealId: z.union([z.uuid(), z.literal("")]).optional(), type: z.enum(["call", "meeting", "email", "note", "follow_up"]), subject: z.string().trim().min(2, "Informe um resumo da atividade.").max(160), body: z.string().trim().max(2000).optional(), occurredAt: z.iso.datetime().optional(), }).refine` | ArrowFunction; module | `(data: { type: "email" \| "call" \| "meeting" \| "note" \| "follow_up"; subject: string; clientId?: string \| undefined; dealId?: string \| undefined; body?: string \| undefined; occurredAt?: string \| undefined; }): …` | `boolean` | Boolean | — |
| [src/modules/activities/actions.ts:21](../../../src/modules/activities/actions.ts#L21) · `createActivity` | FunctionDeclaration; module · async | `(input: unknown): Promise<{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }>` | `Promise<{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }>` | activitySchema.safeParse, requireWorkspaceRole, getDb, db.transaction, revalidatePath | — |
| [src/modules/activities/actions.ts:34](../../../src/modules/activities/actions.ts#L34) · `callback@db.transaction` | ArrowFunction; createActivity · async | `(tx: import("<projeto>/node_modules/drizzle-orm/pg-core/session").PgTransaction<import("<projeto>/node_modules/drizzle-orm/node-postgres/session").NodePgQueryResultHKT, typeof import("<projeto>/src/db/schema/index"), …` | `Promise<{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }>` | tx.select({ id: deals.id, clientId: deals.clientId }).from(de…, tx.select({ id: deals.id, clientId: deals.clientId }).from, tx.select, and, eq, isNull, [...new Set([clientId, dealClientId].filter((value): value is…, [clientId, dealClientId].filter | — |
| [src/modules/activities/actions.ts:53](../../../src/modules/activities/actions.ts#L53) · `callback@[clientId, dealClientId].filter` | ArrowFunction; createActivity | `(value: string \| null): value is string` | `boolean` | Boolean | — |

## src/modules/clients/actions.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/modules/clients/actions.ts:15](../../../src/modules/clients/actions.ts#L15) · `createClient` | FunctionDeclaration; module · async | `(input: unknown): Promise<ActionResult>` | `Promise<ActionResult>` | clientSchema.safeParse, Object.fromEntries, parsed.error.issues.map, requireWorkspaceRole, getDb, db.transaction, revalidatePath | — |
| [src/modules/clients/actions.ts:21](../../../src/modules/clients/actions.ts#L21) · `callback@parsed.error.issues.map` | ArrowFunction; createClient | `(issue: z.core.$ZodIssue): [string, string]` | `[string, string]` | String | — |
| [src/modules/clients/actions.ts:29](../../../src/modules/clients/actions.ts#L29) · `callback@db.transaction` | ArrowFunction; createClient · async | `(tx: import("<projeto>/node_modules/drizzle-orm/pg-core/session").PgTransaction<import("<projeto>/node_modules/drizzle-orm/node-postgres/session").NodePgQueryResultHKT, typeof import("<projeto>/src/db/schema/index"), …` | `Promise<[{ id: string; }]>` | tx.insert(clients).values({ organizationId: context.organizat…, tx.insert(clients).values, tx.insert, tx.insert(auditLogs).values, JSON.stringify | — |
| [src/modules/clients/actions.ts:58](../../../src/modules/clients/actions.ts#L58) · `updateClient` | FunctionDeclaration; module · async | `(id: string, input: unknown): Promise<ActionResult>` | `Promise<ActionResult>` | z.uuid().safeParse, z.uuid, clientSchema.safeParse, requireWorkspaceRole, getDb, db.transaction, revalidatePath | — |
| [src/modules/clients/actions.ts:68](../../../src/modules/clients/actions.ts#L68) · `callback@db.transaction` | ArrowFunction; updateClient · async | `(tx: import("<projeto>/node_modules/drizzle-orm/pg-core/session").PgTransaction<import("<projeto>/node_modules/drizzle-orm/node-postgres/session").NodePgQueryResultHKT, typeof import("<projeto>/src/db/schema/index"), …` | `Promise<{ ok: false; message: string; } \| { ok: true; message?: undefined; }>` | tx.select({ id: clients.id, kind: clients.kind }) .from(clien…, tx.select({ id: clients.id, kind: clients.kind }) .from, tx.select, and, eq, isNull, tx.update(clients).set({ kind: data.kind, name: data.name, em…, tx.update(clients).set | — |
| [src/modules/clients/actions.ts:98](../../../src/modules/clients/actions.ts#L98) · `reassignClientOwner` | FunctionDeclaration; module · async | `(input: unknown): Promise<ActionResult>` | `Promise<ActionResult>` | z.object({ clientId: z.uuid(), newUserId: z.string().min(1).n…, z.object, z.uuid, z.string().min(1).nullable, z.string().min, z.string, requireWorkspaceRole, getDb | — |
| [src/modules/clients/actions.ts:104](../../../src/modules/clients/actions.ts#L104) · `callback@db.transaction` | ArrowFunction; reassignClientOwner · async | `(tx: import("<projeto>/node_modules/drizzle-orm/pg-core/session").PgTransaction<import("<projeto>/node_modules/drizzle-orm/node-postgres/session").NodePgQueryResultHKT, typeof import("<projeto>/src/db/schema/index"), …` | `Promise<{ ok: false; message: string; changed?: undefined; } \| { ok: true; changed: boolean; message?: undefined; }>` | tx.select({ id: clients.id, ownerUserId: clients.ownerUserId …, tx.select({ id: clients.id, ownerUserId: clients.ownerUserId …, tx.select, and, eq, isNull, tx.select({ userId: member.userId }).from(member) .where(and(…, tx.select({ userId: member.userId }).from(member) .where | — |
| [src/modules/clients/actions.ts:143](../../../src/modules/clients/actions.ts#L143) · `archiveClient` | FunctionDeclaration; module · async | `(id: string): Promise<ActionResult>` | `Promise<ActionResult>` | requireWorkspaceRole, z.uuid().safeParse, z.uuid, getDb, db.transaction, revalidatePath | — |
| [src/modules/clients/actions.ts:148](../../../src/modules/clients/actions.ts#L148) · `callback@db.transaction` | ArrowFunction; archiveClient · async | `(tx: import("<projeto>/node_modules/drizzle-orm/pg-core/session").PgTransaction<import("<projeto>/node_modules/drizzle-orm/node-postgres/session").NodePgQueryResultHKT, typeof import("<projeto>/src/db/schema/index"), …` | `Promise<{ ok: false; message: string; } \| { ok: true; message?: undefined; }>` | tx.select({ id: clients.id, kind: clients.kind }) .from(clien…, tx.select({ id: clients.id, kind: clients.kind }) .from, tx.select, and, eq, isNull, tx.select({ value: sql<number>`count(*)::int` }).from(contact…, tx.select({ value: sql<number>`count(*)::int` }).from | — |

## src/modules/clients/archive-rules.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/modules/clients/archive-rules.ts:7](../../../src/modules/clients/archive-rules.ts#L7) · `evaluateClientArchivalEligibility` | FunctionDeclaration; module | `(dependencies: ClientDependencyCounts): { canArchive: boolean; reason?: string; }` | `{ canArchive: boolean; reason?: string; }` | — | — |

## src/modules/clients/contact-actions.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/modules/clients/contact-actions.ts:18](../../../src/modules/clients/contact-actions.ts#L18) · `createContact` | FunctionDeclaration; module · async | `(input: unknown): Promise<{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }>` | `Promise<{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }>` | contactSchema.safeParse, requireWorkspaceRole, getDb, db.transaction, revalidatePath | — |
| [src/modules/clients/contact-actions.ts:24](../../../src/modules/clients/contact-actions.ts#L24) · `callback@db.transaction` | ArrowFunction; createContact · async | `(tx: import("<projeto>/node_modules/drizzle-orm/pg-core/session").PgTransaction<import("<projeto>/node_modules/drizzle-orm/node-postgres/session").NodePgQueryResultHKT, typeof import("<projeto>/src/db/schema/index"), …` | `Promise<{ ok: false; message: string; id?: undefined; clientId?: undefined; } \| { ok: true; id: string; clientId: string; message?: undefined; }>` | tx.select({ id: clients.id }).from(clients).where(and( eq(cli…, tx.select({ id: clients.id }).from(clients).where, tx.select({ id: clients.id }).from, tx.select, and, eq, isNull, tx.insert(contacts).values({ organizationId: context.organiza… | — |

## src/modules/deals/actions.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/modules/deals/actions.ts:19](../../../src/modules/deals/actions.ts#L19) · `createDeal` | FunctionDeclaration; module · async | `(input: unknown): Promise<{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }>` | `Promise<{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }>` | dealSchema.safeParse, requireWorkspaceRole, getDb, parsed.data.amount.includes, db.transaction, revalidatePath | — |
| [src/modules/deals/actions.ts:28](../../../src/modules/deals/actions.ts#L28) · `callback@db.transaction` | ArrowFunction; createDeal · async | `(tx: import("<projeto>/node_modules/drizzle-orm/pg-core/session").PgTransaction<import("<projeto>/node_modules/drizzle-orm/node-postgres/session").NodePgQueryResultHKT, typeof import("<projeto>/src/db/schema/index"), …` | `Promise<{ ok: false; message: string; id?: undefined; clientId?: undefined; } \| { ok: true; id: string; clientId: string; message?: undefined; }>` | tx.select({ id: clients.id }).from(clients).where(and(eq(clie…, tx.select({ id: clients.id }).from(clients).where, tx.select({ id: clients.id }).from, tx.select, and, eq, isNull, tx.insert(deals).values({ organizationId: context.organizatio… | — |
| [src/modules/deals/actions.ts:44](../../../src/modules/deals/actions.ts#L44) · `updateDeal` | FunctionDeclaration; module · async | `(id: string, input: unknown): Promise<import("<projeto>/src/lib/deal-linked-tasks-error").DealLinkedTasksConflict \| { ...; } \| { ...; }>` | `Promise<DealLinkedTasksConflict \| { ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }>` | z.uuid().safeParse, z.uuid, dealSchema.safeParse, requireWorkspaceRole, getDb, parsed.data.amount.includes, db.transaction, mapDealLinkedTasksError | error |
| [src/modules/deals/actions.ts:56](../../../src/modules/deals/actions.ts#L56) · `callback@db.transaction` | ArrowFunction; updateDeal · async | `(tx: import("<projeto>/node_modules/drizzle-orm/pg-core/session").PgTransaction<import("<projeto>/node_modules/drizzle-orm/node-postgres/session").NodePgQueryResultHKT, typeof import("<projeto>/src/db/schema/index"), …` | `Promise<{ ok: false; message: string; oldClientId?: undefined; clientId?: undefined; } \| { ok: true; oldClientId: string; clientId: string; message?: undefined; }>` | tx.select({ id: deals.id, clientId: deals.clientId }) .from(d…, tx.select({ id: deals.id, clientId: deals.clientId }) .from, tx.select, and, eq, isNull, [...new Set([existing.clientId, parsed.data.clientId])].sort, tx.select({ id: clients.id }) .from(clients) .where(and(eq(cl… | — |
| [src/modules/deals/actions.ts:98](../../../src/modules/deals/actions.ts#L98) · `updateDealStage` | FunctionDeclaration; module · async | `(input: unknown): Promise<{ ok: false; message: string; } \| { ok: true; message?: undefined; }>` | `Promise<{ ok: false; message: string; } \| { ok: true; message?: undefined; }>` | stageSchema.safeParse, parsed.data.lossReason?.trim, requireWorkspaceRole, getDb, db.transaction, revalidatePath | — |
| [src/modules/deals/actions.ts:108](../../../src/modules/deals/actions.ts#L108) · `callback@db.transaction` | ArrowFunction; updateDealStage · async | `(tx: import("<projeto>/node_modules/drizzle-orm/pg-core/session").PgTransaction<import("<projeto>/node_modules/drizzle-orm/node-postgres/session").NodePgQueryResultHKT, typeof import("<projeto>/src/db/schema/index"), …` | `Promise<{ ok: false; message: string; dealId?: undefined; clientId?: undefined; } \| { ok: true; dealId: string; clientId: string; message?: undefined; }>` | tx.select({ id: deals.id, stage: deals.stage, clientId: deals…, tx.select, and, eq, isNull, tx.select({ id: clients.id }).from(clients).where(and(eq(clie…, tx.select({ id: clients.id }).from(clients).where, tx.select({ id: clients.id }).from | — |
| [src/modules/deals/actions.ts:130](../../../src/modules/deals/actions.ts#L130) · `reassignDealOwner` | FunctionDeclaration; module · async | `(input: unknown): Promise<{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }>` | `Promise<{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }>` | z.object({ dealId: z.uuid(), newUserId: z.string().min(1).nul…, z.object, z.uuid, z.string().min(1).nullable, z.string().min, z.string, requireWorkspaceRole, getDb | — |
| [src/modules/deals/actions.ts:136](../../../src/modules/deals/actions.ts#L136) · `callback@db.transaction` | ArrowFunction; reassignDealOwner · async | `(tx: import("<projeto>/node_modules/drizzle-orm/pg-core/session").PgTransaction<import("<projeto>/node_modules/drizzle-orm/node-postgres/session").NodePgQueryResultHKT, typeof import("<projeto>/src/db/schema/index"), …` | `Promise<{ ok: false; message: string; changed?: undefined; } \| { ok: true; changed: boolean; message?: undefined; }>` | tx.select({ id: deals.id, ownerUserId: deals.ownerUserId }) .…, tx.select({ id: deals.id, ownerUserId: deals.ownerUserId }) .…, tx.select, and, eq, isNull, tx.select({ userId: member.userId }).from(member) .where(and(…, tx.select({ userId: member.userId }).from(member) .where | — |

## src/modules/tasks/actions.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/modules/tasks/actions.ts:20](../../../src/modules/tasks/actions.ts#L20) · `createTask` | FunctionDeclaration; module · async | `(input: unknown): Promise<{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }>` | `Promise<{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }>` | taskSchema.safeParse, requireWorkspaceRole, getDb, db.transaction, revalidatePath | — |
| [src/modules/tasks/actions.ts:31](../../../src/modules/tasks/actions.ts#L31) · `callback@db.transaction` | ArrowFunction; createTask · async | `(tx: import("<projeto>/node_modules/drizzle-orm/pg-core/session").PgTransaction<import("<projeto>/node_modules/drizzle-orm/node-postgres/session").NodePgQueryResultHKT, typeof import("<projeto>/src/db/schema/index"), …` | `Promise<{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }>` | tx.select({ id: deals.id, clientId: deals.clientId }).from(de…, tx.select({ id: deals.id, clientId: deals.clientId }).from, tx.select, and, eq, isNull, [...new Set([clientId, dealClientId].filter((value): value is…, [clientId, dealClientId].filter | — |
| [src/modules/tasks/actions.ts:40](../../../src/modules/tasks/actions.ts#L40) · `callback@[clientId, dealClientId].filter` | ArrowFunction; createTask | `(value: string \| null): value is string` | `boolean` | Boolean | — |
| [src/modules/tasks/actions.ts:60](../../../src/modules/tasks/actions.ts#L60) · `setTaskStatus` | FunctionDeclaration; module · async | `(input: unknown): Promise<{ ok: false; message: string; } \| { ok: true; message?: undefined; }>` | `Promise<{ ok: false; message: string; } \| { ok: true; message?: undefined; }>` | z.object({ taskId: z.uuid(), status: z.enum(["todo", "in_prog…, z.object, z.uuid, z.enum, requireWorkspaceRole, getDb, db.transaction, revalidatePath | — |
| [src/modules/tasks/actions.ts:68](../../../src/modules/tasks/actions.ts#L68) · `callback@db.transaction` | ArrowFunction; setTaskStatus · async | `(tx: import("<projeto>/node_modules/drizzle-orm/pg-core/session").PgTransaction<import("<projeto>/node_modules/drizzle-orm/node-postgres/session").NodePgQueryResultHKT, typeof import("<projeto>/src/db/schema/index"), …` | `Promise<{ ok: false; message: string; clientId?: undefined; } \| { ok: true; clientId: string \| null; message?: undefined; }>` | tx.select({ id: tasks.id, dealId: tasks.dealId }).from(tasks)…, tx.select({ id: tasks.id, dealId: tasks.dealId }).from(tasks)…, tx.select({ id: tasks.id, dealId: tasks.dealId }).from, tx.select, and, eq, isNull, tx.select({ id: deals.id, clientId: deals.clientId }).from(de… | — |
| [src/modules/tasks/actions.ts:94](../../../src/modules/tasks/actions.ts#L94) · `callback@[task.clientId, dealClientId].filter` | ArrowFunction; setTaskStatus | `(value: string \| null): value is string` | `boolean` | Boolean | — |
| [src/modules/tasks/actions.ts:117](../../../src/modules/tasks/actions.ts#L117) · `reassignTaskAssignee` | FunctionDeclaration; module · async | `(input: unknown): Promise<{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }>` | `Promise<{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }>` | z.object({ taskId: z.uuid(), newUserId: z.string().min(1).nul…, z.object, z.uuid, z.string().min(1).nullable, z.string().min, z.string, requireWorkspaceRole, getDb | — |
| [src/modules/tasks/actions.ts:123](../../../src/modules/tasks/actions.ts#L123) · `callback@db.transaction` | ArrowFunction; reassignTaskAssignee · async | `(tx: import("<projeto>/node_modules/drizzle-orm/pg-core/session").PgTransaction<import("<projeto>/node_modules/drizzle-orm/node-postgres/session").NodePgQueryResultHKT, typeof import("<projeto>/src/db/schema/index"), …` | `Promise<{ ok: false; message: string; changed?: undefined; clientId?: undefined; dealId?: undefined; } \| { ok: true; changed: boolean; message?: undefined; clientId?: undefined; de` | tx.select({ id: tasks.id, assigneeUserId: tasks.assigneeUserI…, tx.select, and, eq, isNull, tx.select({ userId: member.userId }).from(member) .where(and(…, tx.select({ userId: member.userId }).from(member) .where, tx.select({ userId: member.userId }).from | — |

## src/modules/team/actions.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/modules/team/actions.ts:14](../../../src/modules/team/actions.ts#L14) · `(callback)` | Constructor; module | `(): IncompleteAssignmentTransferError` | `IncompleteAssignmentTransferError` | super | — |
| [src/modules/team/actions.ts:41](../../../src/modules/team/actions.ts#L41) · `getMemberAssignmentSummary` | FunctionDeclaration; module · async | `(): Promise<MemberAssignmentSummary[]>` | `Promise<MemberAssignmentSummary[]>` | requireWorkspaceRole, getDb, db.transaction | — |
| [src/modules/team/actions.ts:45](../../../src/modules/team/actions.ts#L45) · `callback@db.transaction` | ArrowFunction; getMemberAssignmentSummary · async | `(tx: import("<projeto>/node_modules/drizzle-orm/pg-core/session").PgTransaction<import("<projeto>/node_modules/drizzle-orm/node-postgres/session").NodePgQueryResultHKT, typeof import("<projeto>/src/db/schema/index"), …` | `Promise<{ clients: { active: number; archived: number; }; deals: { active: number; archived: number; }; tasks: { active: number; archived: number; }; total: { active: number; archi` | tx.select({ role: member.role }).from(member) .where(and(eq(m…, tx.select({ role: member.role }).from(member) .where, tx.select({ role: member.role }).from, tx.select, and, eq, authorizedMember.role.toLowerCase, tx.select({ memberId: member.id, userId: user.id, name: user.… | new Error("Acesso não autorizado ao resumo de responsabilidades.") |
| [src/modules/team/actions.ts:90](../../../src/modules/team/actions.ts#L90) · `callback@clientCounts.map` | ArrowFunction; getMemberAssignmentSummary | `(row: { userId: string \| null; active: number; archived: number; }): [string \| null, { active: number; archived: number; }]` | `[string \| null, { active: number; archived: number; }]` | — | — |
| [src/modules/team/actions.ts:91](../../../src/modules/team/actions.ts#L91) · `callback@dealCounts.map` | ArrowFunction; getMemberAssignmentSummary | `(row: { userId: string \| null; active: number; archived: number; }): [string \| null, { active: number; archived: number; }]` | `[string \| null, { active: number; archived: number; }]` | — | — |
| [src/modules/team/actions.ts:92](../../../src/modules/team/actions.ts#L92) · `callback@taskCounts.map` | ArrowFunction; getMemberAssignmentSummary | `(row: { userId: string \| null; active: number; archived: number; }): [string \| null, { active: number; archived: number; }]` | `[string \| null, { active: number; archived: number; }]` | — | — |
| [src/modules/team/actions.ts:94](../../../src/modules/team/actions.ts#L94) · `callback@members.map` | ArrowFunction; getMemberAssignmentSummary | `(person: { memberId: string; userId: string; name: string; email: string; role: string; }): { clients: { active: number; archived: number; }; deals: { active: number; archived: number; }; tasks: { active: number; arch…` | `{ clients: { active: number; archived: number; }; deals: { active: number; archived: number; }; tasks: { active: number; archived: number; }; total: { active: number; archived: num` | clientsByUser.get, dealsByUser.get, tasksByUser.get | — |
| [src/modules/team/actions.ts:111](../../../src/modules/team/actions.ts#L111) · `updateMemberRole` | FunctionDeclaration; module · async | `(memberId: string, role: string): Promise<void>` | `Promise<void>` | ["admin", "member"].includes, requireWorkspaceRole, getDb, db.select({ id: member.id, role: member.role, userId: member.…, db.select, and, eq, updateMemberRoleWithAudit | new Error("Escolha um papel válido."), new Error("Membro não encontrado neste workspace."), new Error("Não é permitido alterar o próprio papel."), new Error("O papel OWNER não pode ser alterado por este fluxo."), new Error("Não foi possível atualizar o papel do membro.") |
| [src/modules/team/actions.ts:139](../../../src/modules/team/actions.ts#L139) · `transferMemberAssignments` | FunctionDeclaration; module · async | `(input: unknown): Promise<{ ok: true; counts: { clients: number; deals: number; tasks: number; total: number; }; archivedReferencesPending: { clients: number; deals: number; tasks: number; total: number; }; } \| { ...…` | `Promise<{ ok: true; counts: { clients: number; deals: number; tasks: number; total: number; }; archivedReferencesPending: { clients: number; deals: number; tasks: number; total: nu` | z.object({ fromUserId: z.string().min(1), toUserId: z.string(…, z.object, z.string().min, z.string, z.string().min(1).nullable, requireWorkspaceRole, getDb, db.transaction | error |
| [src/modules/team/actions.ts:154](../../../src/modules/team/actions.ts#L154) · `callback@db.transaction` | ArrowFunction; transferMemberAssignments · async | `(tx: import("<projeto>/node_modules/drizzle-orm/pg-core/session").PgTransaction<import("<projeto>/node_modules/drizzle-orm/node-postgres/session").NodePgQueryResultHKT, typeof import("<projeto>/src/db/schema/index"), …` | `Promise<{ ok: false; message: string; counts?: undefined; archivedReferencesPending?: undefined; } \| { ok: true; counts: { clients: number; deals: number; tasks: number; total: num` | tx.select({ id: tasks.id }).from(tasks) .where(and(eq(tasks.o…, tx.select({ id: tasks.id }).from(tasks) .where, tx.select({ id: tasks.id }).from, tx.select, and, eq, asc, tx.select({ id: deals.id }).from(deals) .where(and(eq(deals.o… | new IncompleteAssignmentTransferError() |
| [src/modules/team/actions.ts:182](../../../src/modules/team/actions.ts#L182) · `callback@lockedTasks.slice(offset, offset + 500).map` | ArrowFunction; transferMemberAssignments | `(row: { id: string; }): string` | `string` | — | — |
| [src/modules/team/actions.ts:186](../../../src/modules/team/actions.ts#L186) · `callback@rows.map` | ArrowFunction; transferMemberAssignments | `(row: { id: string; }): string` | `string` | — | — |
| [src/modules/team/actions.ts:195](../../../src/modules/team/actions.ts#L195) · `callback@lockedDeals.slice(offset, offset + 500).map` | ArrowFunction; transferMemberAssignments | `(row: { id: string; }): string` | `string` | — | — |
| [src/modules/team/actions.ts:199](../../../src/modules/team/actions.ts#L199) · `callback@rows.map` | ArrowFunction; transferMemberAssignments | `(row: { id: string; }): string` | `string` | — | — |
| [src/modules/team/actions.ts:208](../../../src/modules/team/actions.ts#L208) · `callback@lockedClients.slice(offset, offset + 500).map` | ArrowFunction; transferMemberAssignments | `(row: { id: string; }): string` | `string` | — | — |
| [src/modules/team/actions.ts:212](../../../src/modules/team/actions.ts#L212) · `callback@rows.map` | ArrowFunction; transferMemberAssignments | `(row: { id: string; }): string` | `string` | — | — |

## src/modules/team/member-role-service.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/modules/team/member-role-service.ts:10](../../../src/modules/team/member-role-service.ts#L10) · `(callback)` | Constructor; module | `(code: string, apiStatus: MemberRoleApiStatus, message: string): MemberRoleChangeError` | `MemberRoleChangeError` | super | — |
| [src/modules/team/member-role-service.ts:21](../../../src/modules/team/member-role-service.ts#L21) · `updateMemberRoleWithAudit` | FunctionDeclaration; module · async | `(input: { organizationId: string; actorUserId: string; memberId: string; role: string; }): Promise<{ id: string; userId: string; organizationId: string; role: string; }>` | `Promise<{ id: string; userId: string; organizationId: string; role: string; }>` | input.organizationId.trim, input.actorUserId.trim, input.memberId.trim, input.role.trim().toLowerCase, input.role.trim, getDb, db.transaction | new MemberRoleChangeError("INVALID_MEMBER_ROLE_CHANGE", "BAD_REQUEST", "Escolha |
| [src/modules/team/member-role-service.ts:37](../../../src/modules/team/member-role-service.ts#L37) · `callback@db.transaction` | ArrowFunction; updateMemberRoleWithAudit · async | `(tx: import("<projeto>/node_modules/drizzle-orm/pg-core/session").PgTransaction<import("<projeto>/node_modules/drizzle-orm/node-postgres/session").NodePgQueryResultHKT, typeof import("<projeto>/src/db/schema/index"), …` | `Promise<{ id: string; userId: string; organizationId: string; role: string; }>` | tx.select({ id: member.id, organizationId: member.organizatio…, tx.select, and, eq, or, asc, lockedMemberships.find, actor.role.toLowerCase().split(",").map((item) => item.trim()… | new MemberRoleChangeError("ROLE_CHANGE_FORBIDDEN", "FORBIDDEN", "Você não tem pe, new MemberRoleChangeError("MEMBER_NOT_FOUND", "BAD_REQUEST", "Membro não encontr, new MemberRoleChangeError("CANNOT_CHANGE_OWN_ROLE", "FORBIDDEN", "Não é permitid, new MemberRoleChangeError("OWNER_ROLE_PROTECTED", "FORBIDDEN", "O papel OWNER nã, new MemberRoleChangeError("MEMBERSHIP_CHANGED_CONCURRENTLY", "FORBIDDEN", "A ass |
| [src/modules/team/member-role-service.ts:53](../../../src/modules/team/member-role-service.ts#L53) · `callback@lockedMemberships.find` | ArrowFunction; updateMemberRoleWithAudit | `(row: { id: string; organizationId: string; userId: string; role: string; }): boolean` | `boolean` | — | — |
| [src/modules/team/member-role-service.ts:54](../../../src/modules/team/member-role-service.ts#L54) · `callback@actor.role.toLowerCase().split(",").map` | ArrowFunction; updateMemberRoleWithAudit | `(item: string): string` | `string` | item.trim | — |
| [src/modules/team/member-role-service.ts:58](../../../src/modules/team/member-role-service.ts#L58) · `callback@lockedMemberships.find` | ArrowFunction; updateMemberRoleWithAudit | `(row: { id: string; organizationId: string; userId: string; role: string; }): boolean` | `boolean` | — | — |
| [src/modules/team/member-role-service.ts:65](../../../src/modules/team/member-role-service.ts#L65) · `callback@target.role.toLowerCase().split(",").map` | ArrowFunction; updateMemberRoleWithAudit | `(item: string): string` | `string` | item.trim | — |

## src/modules/team/permissions.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/modules/team/permissions.ts:1](../../../src/modules/team/permissions.ts#L1) · `canManageMemberRoles` | FunctionDeclaration; module | `(role: string): boolean` | `boolean` | — | — |

## src/modules/workspaces/actions.ts

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/modules/workspaces/actions.ts:10](../../../src/modules/workspaces/actions.ts#L10) · `selectWorkspace` | FunctionDeclaration; module · async | `(formData: FormData): Promise<void>` | `Promise<void>` | formData.get, rawOrganizationId.trim, redirect, headers, getAuth, auth.api.getSession, getDb().select({ organizationId: member.organizationId }) .fr…, getDb().select({ organizationId: member.organizationId }) .from | — |

## src/app/layout.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/app/layout.tsx:14](../../../src/app/layout.tsx#L14) · `RootLayout` | FunctionDeclaration; module · async | `({ children }: Readonly<{ children: React.ReactNode; }>): Promise<import("<projeto>/node_modules/@types/react/index").JSX.Element>` | `Promise<JSX.Element>` | connection | — |

## src/app/page.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/app/page.tsx:3](../../../src/app/page.tsx#L3) · `HomePage` | FunctionDeclaration; module | `(): void` | `void` | redirect | — |

## src/app/(app)/layout.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/app/(app)/layout.tsx:6](../../../src/app/%28app%29/layout.tsx#L6) · `AuthenticatedLayout` | FunctionDeclaration; module · async | `({ children }: Readonly<{ children: React.ReactNode; }>): Promise<import("<projeto>/node_modules/@types/react/index").JSX.Element>` | `Promise<JSX.Element>` | getWorkspaceContext | — |

## src/app/(app)/activities/page.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/app/(app)/activities/page.tsx:12](../../../src/app/%28app%29/activities/page.tsx#L12) · `ActivitiesPage` | FunctionDeclaration; module · async | `({ searchParams }: { searchParams: Promise<{ q?: string; }>; }): Promise<import("<projeto>/node_modules/@types/react/index").JSX.Element>` | `Promise<JSX.Element>` | Promise.all, getWorkspaceContext, eq, q.trim, conditions.push, or, ilike, getDb().select({ activity: activities, clientName: clients.na… | — |
| [src/app/(app)/activities/page.tsx:28](../../../src/app/%28app%29/activities/page.tsx#L28) · `callback@rows.map` | ArrowFunction; ActivitiesPage | `({ activity, clientName, clientId, dealTitle, dealId }: { activity: { id: string; organizationId: string; type: "email" \| "call" \| "meeting" \| "note" \| "follow_up"; subject: string; body: string \| null; occurredA…` | `JSX.Element` | activity.occurredAt.toISOString, formatDateTime | — |

## src/app/(app)/clients/page.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/app/(app)/clients/page.tsx:15](../../../src/app/%28app%29/clients/page.tsx#L15) · `ClientsPage` | FunctionDeclaration; module · async | `({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; status?: string; }>; }): Promise<import("<projeto>/node_modules/@types/react/index").JSX.Element>` | `Promise<JSX.Element>` | Promise.all, getWorkspaceContext, Math.max, Number.parseInt, eq, isNull, q.trim, filters.push | — |
| [src/app/(app)/clients/page.tsx:44](../../../src/app/%28app%29/clients/page.tsx#L44) · `callback@rows.map` | ArrowFunction; ClientsPage | `(client: { id: string; organizationId: string; kind: "person" \| "company"; name: string; email: string \| null; phone: string \| null; status: "active" \| "prospect" \| "inactive"; source: string \| null; ... 4 more …` | `JSX.Element` | formatDate | — |

## src/app/(app)/clients/[id]/page.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/app/(app)/clients/%5Bid%5D/page.tsx:14](../../../src/app/%28app%29/clients/%5Bid%5D/page.tsx#L14) · `ClientDetailPage` | FunctionDeclaration; module · async | `({ params }: { params: Promise<{ id: string; }>; }): Promise<import("<projeto>/node_modules/@types/react/index").JSX.Element>` | `Promise<JSX.Element>` | Promise.all, getWorkspaceContext, getDb, and, eq, isNull, db.select().from(clients).where(where).limit, db.select().from(clients).where | — |
| [src/app/(app)/clients/%5Bid%5D/page.tsx:43](../../../src/app/%28app%29/clients/%5Bid%5D/page.tsx#L43) · `callback@contactRows.map` | ArrowFunction; ClientDetailPage | `(contact: { id: string; organizationId: string; companyClientId: string; name: string; title: string \| null; email: string \| null; phone: string \| null; notes: string \| null; createdAt: Date; updatedAt: Date; dele…` | `JSX.Element` | contact.name.slice(0, 1).toUpperCase, contact.name.slice | — |
| [src/app/(app)/clients/%5Bid%5D/page.tsx:48](../../../src/app/%28app%29/clients/%5Bid%5D/page.tsx#L48) · `callback@dealRows.map` | ArrowFunction; ClientDetailPage | `(deal: { id: string; organizationId: string; clientId: string; title: string; stage: "new_lead" \| "qualification" \| "proposal" \| "negotiation" \| "won" \| "lost"; amount: string; currency: string; ... 6 more ...; d…` | `JSX.Element` | formatCurrency | — |
| [src/app/(app)/clients/%5Bid%5D/page.tsx:54](../../../src/app/%28app%29/clients/%5Bid%5D/page.tsx#L54) · `callback@activityRows.map` | ArrowFunction; ClientDetailPage | `(activity: { id: string; organizationId: string; type: "email" \| "call" \| "meeting" \| "note" \| "follow_up"; subject: string; body: string \| null; occurredAt: Date; actorUserId: string; clientId: string \| null; d…` | `JSX.Element` | activity.occurredAt.toISOString, formatDateTime | — |

## src/app/(app)/clients/[id]/edit/page.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/app/(app)/clients/%5Bid%5D/edit/page.tsx:9](../../../src/app/%28app%29/clients/%5Bid%5D/edit/page.tsx#L9) · `EditClientPage` | FunctionDeclaration; module · async | `({ params }: { params: Promise<{ id: string; }>; }): Promise<import("<projeto>/node_modules/@types/react/index").JSX.Element>` | `Promise<JSX.Element>` | Promise.all, getWorkspaceContext, getDb().select({ id: clients.id, kind: clients.kind, name: cl…, getDb().select, getDb, and, eq, isNull | — |

## src/app/(app)/clients/new/page.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/app/(app)/clients/new/page.tsx:6](../../../src/app/%28app%29/clients/new/page.tsx#L6) · `NewClientPage` | FunctionDeclaration; module | `(): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | — | — |

## src/app/(app)/dashboard/page.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/app/(app)/dashboard/page.tsx:14](../../../src/app/%28app%29/dashboard/page.tsx#L14) · `DashboardPage` | FunctionDeclaration; module · async | `(): Promise<import("<projeto>/node_modules/@types/react/index").JSX.Element>` | `Promise<JSX.Element>` | getWorkspaceContext, getDb, now.getTime, eq, Promise.all, db.select({ total: count() }).from(clients).where, db.select({ total: count() }).from, db.select | — |
| [src/app/(app)/dashboard/page.tsx:43](../../../src/app/%28app%29/dashboard/page.tsx#L43) · `callback@stageRows.map` | ArrowFunction; DashboardPage | `(row: { stage: "new_lead" \| "qualification" \| "proposal" \| "negotiation" \| "won" \| "lost"; total: number; value: string; }): ["new_lead" \| "qualification" \| "proposal" \| "negotiation" \| "won" \| "lost", { sta…` | `["new_lead" \| "qualification" \| "proposal" \| "negotiation" \| "won" \| "lost", { stage: "new_lead" \| "qualification" \| "proposal" \| "negotiation" \| "won" \| "lost"; total: number; val` | — | — |
| [src/app/(app)/dashboard/page.tsx:44](../../../src/app/%28app%29/dashboard/page.tsx#L44) · `callback@stageRows.map` | ArrowFunction; DashboardPage | `(row: { stage: "new_lead" \| "qualification" \| "proposal" \| "negotiation" \| "won" \| "lost"; total: number; value: string; }): number` | `number` | Number | — |
| [src/app/(app)/dashboard/page.tsx:62](../../../src/app/%28app%29/dashboard/page.tsx#L62) · `callback@openStages.map` | ArrowFunction; DashboardPage | `(stage: "new_lead" \| "qualification" \| "proposal" \| "negotiation"): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | stageMap.get, Math.max, Number, formatCurrency | — |
| [src/app/(app)/dashboard/page.tsx:69](../../../src/app/%28app%29/dashboard/page.tsx#L69) · `callback@recentDeals.map` | ArrowFunction; DashboardPage | `(deal: { id: string; title: string; amount: string; stage: "new_lead" \| "qualification" \| "proposal" \| "negotiation" \| "won" \| "lost"; expectedCloseAt: string \| null; clientName: string; }): import("<projeto>/no…` | `JSX.Element` | formatDate, formatCurrency | — |
| [src/app/(app)/dashboard/page.tsx:81](../../../src/app/%28app%29/dashboard/page.tsx#L81) · `callback@upcomingMeetings.map` | ArrowFunction; DashboardPage | `(item: { id: string; subject: string; occurredAt: Date; }): { id: string; title: string; dueAt: Date; kind: string; }` | `{ id: string; title: string; dueAt: Date; kind: string; }` | — | — |
| [src/app/(app)/dashboard/page.tsx:81](../../../src/app/%28app%29/dashboard/page.tsx#L81) · `callback@upcomingTasks.map` | ArrowFunction; DashboardPage | `(item: { id: string; title: string; dueAt: Date; priority: "low" \| "normal" \| "high" \| "urgent"; }): { id: string; title: string; dueAt: Date; kind: string; }` | `{ id: string; title: string; dueAt: Date; kind: string; }` | — | — |
| [src/app/(app)/dashboard/page.tsx:81](../../../src/app/%28app%29/dashboard/page.tsx#L81) · `callback@[...upcomingMeetings.map((item) => ({ id: item.id, title: item.subject, dueAt: item.occurredAt, kind: "Reunião" })), ...upcomingTasks.map((item) => ({ id: item.id, title: item.title, dueAt: item.dueAt, kind: "Tarefa" }))].sort` | ArrowFunction; DashboardPage | `(a: { id: string; title: string; dueAt: Date; kind: string; }, b: { id: string; title: string; dueAt: Date; kind: string; }): number` | `number` | a.dueAt.getTime, b.dueAt.getTime | — |
| [src/app/(app)/dashboard/page.tsx:81](../../../src/app/%28app%29/dashboard/page.tsx#L81) · `callback@[...upcomingMeetings.map((item) => ({ id: item.id, title: item.subject, dueAt: item.occurredAt, kind: "Reunião" })), ...upcomingTasks.map((item) => ({ id: item.id, title: item.title, dueAt: item.dueAt, kind: "Tarefa" }))].sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime()).slice(0, 5).map` | ArrowFunction; DashboardPage | `(item: { id: string; title: string; dueAt: Date; kind: string; }): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | item.dueAt.toISOString, formatDateTime | — |
| [src/app/(app)/dashboard/page.tsx:89](../../../src/app/%28app%29/dashboard/page.tsx#L89) · `Metric` | FunctionDeclaration; module | `({ title, value, hint, icon, tone }: { title: string; value: string; hint: string; icon: React.ReactNode; tone?: "green" \| "amber"; }): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | — | — |

## src/app/(app)/deals/page.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/app/(app)/deals/page.tsx:14](../../../src/app/%28app%29/deals/page.tsx#L14) · `DealsPage` | FunctionDeclaration; module · async | `({ searchParams }: { searchParams: Promise<{ q?: string; stage?: string; }>; }): Promise<import("<projeto>/node_modules/@types/react/index").JSX.Element>` | `Promise<JSX.Element>` | Promise.all, getWorkspaceContext, eq, isNull, q.trim, conditions.push, or, ilike | — |
| [src/app/(app)/deals/page.tsx:18](../../../src/app/%28app%29/deals/page.tsx#L18) · `callback@stages.some` | ArrowFunction; DealsPage | `(item: { readonly value: "new_lead"; readonly label: "Novo lead"; } \| { readonly value: "qualification"; readonly label: "Qualificação"; } \| { readonly value: "proposal"; readonly label: "Proposta"; } \| { ...; } \|…` | `boolean` | — | — |
| [src/app/(app)/deals/page.tsx:23](../../../src/app/%28app%29/deals/page.tsx#L23) · `callback@rows.filter` | ArrowFunction; DealsPage | `(deal: { id: string; title: string; stage: "new_lead" \| "qualification" \| "proposal" \| "negotiation" \| "won" \| "lost"; amount: string; expectedCloseAt: string \| null; clientId: string; clientName: string; }): bo…` | `boolean` | ["won", "lost"].includes | — |
| [src/app/(app)/deals/page.tsx:23](../../../src/app/%28app%29/deals/page.tsx#L23) · `callback@rows.filter((deal) => !["won", "lost"].includes(deal.stage)).reduce` | ArrowFunction; DealsPage | `(sum: number, deal: { id: string; title: string; stage: "new_lead" \| "qualification" \| "proposal" \| "negotiation" \| "won" \| "lost"; amount: string; expectedCloseAt: string \| null; clientId: string; clientName: s…` | `number` | Number | — |
| [src/app/(app)/deals/page.tsx:28](../../../src/app/%28app%29/deals/page.tsx#L28) · `callback@stages.map` | ArrowFunction; DealsPage | `(item: { readonly value: "new_lead"; readonly label: "Novo lead"; } \| { readonly value: "qualification"; readonly label: "Qualificação"; } \| { readonly value: "proposal"; readonly label: "Proposta"; } \| { ...; } \|…` | `JSX.Element` | — | — |
| [src/app/(app)/deals/page.tsx:30](../../../src/app/%28app%29/deals/page.tsx#L30) · `callback@stages.map` | ArrowFunction; DealsPage | `(item: { readonly value: "new_lead"; readonly label: "Novo lead"; } \| { readonly value: "qualification"; readonly label: "Qualificação"; } \| { readonly value: "proposal"; readonly label: "Proposta"; } \| { ...; } \|…` | `JSX.Element` | rows.filter, cards.map | — |
| [src/app/(app)/deals/page.tsx:30](../../../src/app/%28app%29/deals/page.tsx#L30) · `callback@rows.filter` | ArrowFunction; DealsPage | `(deal: { id: string; title: string; stage: "new_lead" \| "qualification" \| "proposal" \| "negotiation" \| "won" \| "lost"; amount: string; expectedCloseAt: string \| null; clientId: string; clientName: string; }): bo…` | `boolean` | — | — |
| [src/app/(app)/deals/page.tsx:30](../../../src/app/%28app%29/deals/page.tsx#L30) · `callback@cards.map` | ArrowFunction; DealsPage | `(deal: { id: string; title: string; stage: "new_lead" \| "qualification" \| "proposal" \| "negotiation" \| "won" \| "lost"; amount: string; expectedCloseAt: string \| null; clientId: string; clientName: string; }): im…` | `JSX.Element` | formatCurrency, formatDate | — |

## src/app/(app)/deals/[id]/page.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/app/(app)/deals/%5Bid%5D/page.tsx:14](../../../src/app/%28app%29/deals/%5Bid%5D/page.tsx#L14) · `DealDetailPage` | FunctionDeclaration; module · async | `({ params }: { params: Promise<{ id: string; }>; }): Promise<import("<projeto>/node_modules/@types/react/index").JSX.Element>` | `Promise<JSX.Element>` | Promise.all, getWorkspaceContext, getDb, db.select({ deal: deals, client: clients }).from(deals).inner…, db.select({ deal: deals, client: clients }).from(deals).inner…, db.select({ deal: deals, client: clients }).from, db.select, and | — |
| [src/app/(app)/deals/%5Bid%5D/page.tsx:28](../../../src/app/%28app%29/deals/%5Bid%5D/page.tsx#L28) · `callback@activityRows.map` | ArrowFunction; DealDetailPage | `(activity: { id: string; organizationId: string; type: "email" \| "call" \| "meeting" \| "note" \| "follow_up"; subject: string; body: string \| null; occurredAt: Date; actorUserId: string; clientId: string \| null; d…` | `JSX.Element` | activity.occurredAt.toISOString, formatDateTime | — |

## src/app/(app)/deals/[id]/edit/page.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/app/(app)/deals/%5Bid%5D/edit/page.tsx:9](../../../src/app/%28app%29/deals/%5Bid%5D/edit/page.tsx#L9) · `EditDealPage` | FunctionDeclaration; module · async | `({ params }: { params: Promise<{ id: string; }>; }): Promise<import("<projeto>/node_modules/@types/react/index").JSX.Element>` | `Promise<JSX.Element>` | Promise.all, getWorkspaceContext, getDb, db.select({ id: deals.id, clientId: deals.clientId, title: de…, db.select, and, eq, isNull | — |

## src/app/(app)/deals/new/page.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/app/(app)/deals/new/page.tsx:10](../../../src/app/%28app%29/deals/new/page.tsx#L10) · `NewDealPage` | FunctionDeclaration; module · async | `({ searchParams }: { searchParams: Promise<{ clientId?: string; }>; }): Promise<import("<projeto>/node_modules/@types/react/index").JSX.Element>` | `Promise<JSX.Element>` | Promise.all, getWorkspaceContext, getDb().select({ id: clients.id, name: clients.name }).from(c…, getDb().select({ id: clients.id, name: clients.name }).from, getDb().select, getDb, and, eq | — |

## src/app/(app)/help/page.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/app/(app)/help/page.tsx:3](../../../src/app/%28app%29/help/page.tsx#L3) · `HelpPage` | FunctionDeclaration; module | `(): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | — | — |

## src/app/(app)/search/page.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/app/(app)/search/page.tsx:11](../../../src/app/%28app%29/search/page.tsx#L11) · `GlobalSearchPage` | FunctionDeclaration; module · async | `({ searchParams }: { searchParams: Promise<{ q?: string; }>; }): Promise<import("<projeto>/node_modules/@types/react/index").JSX.Element>` | `Promise<JSX.Element>` | Promise.all, getWorkspaceContext, q.trim().slice, q.trim, getDb, db.select({ id: clients.id, name: clients.name, email: client…, db.select, and | — |
| [src/app/(app)/search/page.tsx:28](../../../src/app/%28app%29/search/page.tsx#L28) · `callback@clientRows.map` | ArrowFunction; GlobalSearchPage | `(client: { id: string; name: string; email: string \| null; kind: "person" \| "company"; status: "active" \| "prospect" \| "inactive"; }): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | — | — |
| [src/app/(app)/search/page.tsx:29](../../../src/app/%28app%29/search/page.tsx#L29) · `callback@dealRows.map` | ArrowFunction; GlobalSearchPage | `(deal: { id: string; title: string; amount: string; stage: "new_lead" \| "qualification" \| "proposal" \| "negotiation" \| "won" \| "lost"; clientName: string; }): import("<projeto>/node_modules/@types/react/index").J…` | `JSX.Element` | formatCurrency | — |
| [src/app/(app)/search/page.tsx:30](../../../src/app/%28app%29/search/page.tsx#L30) · `callback@taskRows.map` | ArrowFunction; GlobalSearchPage | `(task: { id: string; title: string; dueAt: Date; status: "todo" \| "in_progress" \| "done" \| "canceled"; }): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | encodeURIComponent, formatDateTime | — |

## src/app/(app)/settings/page.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/app/(app)/settings/page.tsx:6](../../../src/app/%28app%29/settings/page.tsx#L6) · `SettingsPage` | FunctionDeclaration; module · async | `(): Promise<import("<projeto>/node_modules/@types/react/index").JSX.Element>` | `Promise<JSX.Element>` | getWorkspaceContext | — |

## src/app/(app)/tasks/page.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/app/(app)/tasks/page.tsx:13](../../../src/app/%28app%29/tasks/page.tsx#L13) · `TasksPage` | FunctionDeclaration; module · async | `({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string; status?: string; }>; }): Promise<import("<projeto>/node_modules/@types/react/index").JSX.Element>` | `Promise<JSX.Element>` | Promise.all, getWorkspaceContext, eq, isNull, q.trim, conditions.push, or, ilike | — |
| [src/app/(app)/tasks/page.tsx:41](../../../src/app/%28app%29/tasks/page.tsx#L41) · `callback@rows.map` | ArrowFunction; TasksPage | `({ task, clientName, dealTitle }: { task: { id: string; organizationId: string; title: string; description: string \| null; priority: "low" \| "normal" \| "high" \| "urgent"; status: "todo" \| "in_progress" \| "done" …` | `JSX.Element` | task.dueAt.toISOString, formatDateTime | — |

## src/app/(app)/tasks/new/page.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/app/(app)/tasks/new/page.tsx:10](../../../src/app/%28app%29/tasks/new/page.tsx#L10) · `NewTaskPage` | FunctionDeclaration; module · async | `(): Promise<import("<projeto>/node_modules/@types/react/index").JSX.Element>` | `Promise<JSX.Element>` | getWorkspaceContext, getDb, Promise.all, db.select({ id: clients.id, name: clients.name }).from(client…, db.select({ id: clients.id, name: clients.name }).from(client…, db.select({ id: clients.id, name: clients.name }).from, db.select, and | — |

## src/app/(app)/team/loading.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/app/(app)/team/loading.tsx:1](../../../src/app/%28app%29/team/loading.tsx#L1) · `TeamLoading` | FunctionDeclaration; module | `(): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | — | — |

## src/app/(app)/team/page.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/app/(app)/team/page.tsx:15](../../../src/app/%28app%29/team/page.tsx#L15) · `TeamPage` | FunctionDeclaration; module · async | `(): Promise<import("<projeto>/node_modules/@types/react/index").JSX.Element>` | `Promise<JSX.Element>` | getWorkspaceContext, getDb().select({ memberId: member.id, role: member.role, join…, getDb().select, getDb, eq, asc, canManageMemberRoles, getMemberAssignmentSummary | — |
| [src/app/(app)/team/page.tsx:36](../../../src/app/%28app%29/team/page.tsx#L36) · `callback@members.map` | ArrowFunction; TeamPage | `(person: { memberId: string; role: string; joinedAt: Date; name: string; email: string; userId: string; }): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | person.name.slice(0, 1).toUpperCase, person.name.slice, new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZ… | — |

## src/app/(auth)/login/page.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/app/(auth)/login/page.tsx:7](../../../src/app/%28auth%29/login/page.tsx#L7) · `LoginPage` | FunctionDeclaration; module · async | `({ searchParams }: { searchParams: Promise<{ reason?: string; }>; }): Promise<import("<projeto>/node_modules/@types/react/index").JSX.Element>` | `Promise<JSX.Element>` | — | — |

## src/app/workspace/select/page.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/app/workspace/select/page.tsx:24](../../../src/app/workspace/select/page.tsx#L24) · `roleLabel` | FunctionDeclaration; module | `(role: string): "Proprietário" \| "Administrador" \| "Membro"` | `"Proprietário" \| "Administrador" \| "Membro"` | role.toLowerCase | — |
| [src/app/workspace/select/page.tsx:32](../../../src/app/workspace/select/page.tsx#L32) · `SelectWorkspacePage` | FunctionDeclaration; module · async | `({ searchParams }: { searchParams: Promise<{ reason?: string; }>; }): Promise<import("<projeto>/node_modules/@types/react/index").JSX.Element>` | `Promise<JSX.Element>` | Promise.all, headers, getAuth().api.getSession, getAuth, redirect, getDb().select({ organizationId: organization.id, organizatio…, getDb().select, getDb | — |
| [src/app/workspace/select/page.tsx:54](../../../src/app/workspace/select/page.tsx#L54) · `callback@memberships.map` | ArrowFunction; SelectWorkspacePage | `(item: { organizationId: string; organizationName: string; role: string; }): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | roleLabel | — |

## src/components/zod-csp-provider.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/components/zod-csp-provider.tsx:9](../../../src/components/zod-csp-provider.tsx#L9) · `ZodCspProvider` | FunctionDeclaration; module | `({ children }: { children: ReactNode; }): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | — | — |

## src/components/activities/activity-form.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/components/activities/activity-form.tsx:15](../../../src/components/activities/activity-form.tsx#L15) · `ActivityForm` | FunctionDeclaration; module | `({ clientId, dealId }: { clientId?: string; dealId?: string; }): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | useState, useForm, zodResolver, handleSubmit, register | — |
| [src/components/activities/activity-form.tsx:20](../../../src/components/activities/activity-form.tsx#L20) · `onSubmit` | FunctionDeclaration; ActivityForm · async | `(values: Values): Promise<void>` | `Promise<void>` | setMessage, createActivity, reset | — |

## src/components/auth/login-form.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/components/auth/login-form.tsx:16](../../../src/components/auth/login-form.tsx#L16) · `LoginForm` | FunctionDeclaration; module | `(): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | useRouter, useState, useForm, zodResolver, handleSubmit, register | — |
| [src/components/auth/login-form.tsx:22](../../../src/components/auth/login-form.tsx#L22) · `onSubmit` | FunctionDeclaration; LoginForm · async | `(values: LoginValues): Promise<void>` | `Promise<void>` | setServerError, authClient.signIn.email, router.replace, router.refresh | — |

## src/components/clients/client-form.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/components/clients/client-form.tsx:14](../../../src/components/clients/client-form.tsx#L14) · `ClientForm` | FunctionDeclaration; module | `({ client }: { client?: ClientValues; }): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | useRouter, useState, useForm, zodResolver, handleSubmit, Boolean, register | — |
| [src/components/clients/client-form.tsx:23](../../../src/components/clients/client-form.tsx#L23) · `onSubmit` | FunctionDeclaration; ClientForm · async | `(values: ClientInput): Promise<void>` | `Promise<void>` | setServerMessage, updateClient, createClient, Object.entries, setError, router.push, router.refresh | — |
| [src/components/clients/client-form.tsx:61](../../../src/components/clients/client-form.tsx#L61) · `(callback)` | ArrowFunction; ClientForm | `(): void` | `void` | router.back | — |

## src/components/clients/contact-form.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/components/clients/contact-form.tsx:15](../../../src/components/clients/contact-form.tsx#L15) · `ContactForm` | FunctionDeclaration; module | `({ companyClientId }: { companyClientId: string; }): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | useState, useForm, zodResolver, handleSubmit, register | — |
| [src/components/clients/contact-form.tsx:20](../../../src/components/clients/contact-form.tsx#L20) · `onSubmit` | FunctionDeclaration; ContactForm · async | `(values: Values): Promise<void>` | `Promise<void>` | setMessage, createContact, reset | — |

## src/components/deals/deal-form.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/components/deals/deal-form.tsx:18](../../../src/components/deals/deal-form.tsx#L18) · `DealForm` | FunctionDeclaration; module | `({ clients, initialClientId, deal }: { clients: { id: string; name: string; }[]; initialClientId?: string; deal?: DealValues; }): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | useRouter, useState, useForm, zodResolver, handleSubmit, register, clients.map | — |
| [src/components/deals/deal-form.tsx:24](../../../src/components/deals/deal-form.tsx#L24) · `onSubmit` | FunctionDeclaration; DealForm · async | `(values: Values): Promise<void>` | `Promise<void>` | setMessage, updateDeal, createDeal, router.push, router.refresh | — |
| [src/components/deals/deal-form.tsx:34](../../../src/components/deals/deal-form.tsx#L34) · `callback@clients.map` | ArrowFunction; DealForm | `(client: { id: string; name: string; }): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | — | — |
| [src/components/deals/deal-form.tsx:40](../../../src/components/deals/deal-form.tsx#L40) · `(callback)` | ArrowFunction; DealForm | `(): void` | `void` | router.back | — |

## src/components/deals/stage-control.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/components/deals/stage-control.tsx:11](../../../src/components/deals/stage-control.tsx#L11) · `StageControl` | FunctionDeclaration; module | `({ dealId, currentStage }: { dealId: string; currentStage: string; }): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | useRouter, useState, stages.map | — |
| [src/components/deals/stage-control.tsx:19](../../../src/components/deals/stage-control.tsx#L19) · `save` | FunctionDeclaration; StageControl · async | `(): Promise<void>` | `Promise<void>` | setBusy, setMessage, updateDealStage, router.refresh | — |
| [src/components/deals/stage-control.tsx:29](../../../src/components/deals/stage-control.tsx#L29) · `(callback)` | ArrowFunction; StageControl | `(event: import("<projeto>/node_modules/@types/react/index").ChangeEvent<HTMLSelectElement, HTMLSelectElement>): void` | `void` | setStage | — |
| [src/components/deals/stage-control.tsx:29](../../../src/components/deals/stage-control.tsx#L29) · `callback@stages.map` | ArrowFunction; StageControl | `(item: { readonly value: "new_lead"; readonly label: "Novo lead"; } \| { readonly value: "qualification"; readonly label: "Qualificação"; } \| { readonly value: "proposal"; readonly label: "Proposta"; } \| { ...; } \|…` | `JSX.Element` | — | — |
| [src/components/deals/stage-control.tsx:30](../../../src/components/deals/stage-control.tsx#L30) · `(callback)` | ArrowFunction; StageControl | `(event: import("<projeto>/node_modules/@types/react/index").ChangeEvent<HTMLInputElement, HTMLInputElement>): void` | `void` | setLossReason | — |

## src/components/settings/theme-control.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/components/settings/theme-control.tsx:11](../../../src/components/settings/theme-control.tsx#L11) · `getTheme` | FunctionDeclaration; module | `(): Theme` | `Theme` | localStorage.getItem, window.matchMedia | — |
| [src/components/settings/theme-control.tsx:21](../../../src/components/settings/theme-control.tsx#L21) · `subscribe` | FunctionDeclaration; module | `(listener: () => void): () => void` | `() => void` | listeners.add, window.addEventListener | — |
| [src/components/settings/theme-control.tsx:26](../../../src/components/settings/theme-control.tsx#L26) · `(callback)` | ArrowFunction; subscribe | `(): void` | `void` | listeners.delete, window.removeEventListener | — |
| [src/components/settings/theme-control.tsx:33](../../../src/components/settings/theme-control.tsx#L33) · `getServerTheme` | FunctionDeclaration; module | `(): Theme` | `Theme` | — | — |
| [src/components/settings/theme-control.tsx:39](../../../src/components/settings/theme-control.tsx#L39) · `ThemeControl` | FunctionDeclaration; module | `(): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | useSyncExternalStore, useEffect | — |
| [src/components/settings/theme-control.tsx:43](../../../src/components/settings/theme-control.tsx#L43) · `callback@useEffect` | ArrowFunction; ThemeControl | `(): void` | `void` | — | — |
| [src/components/settings/theme-control.tsx:47](../../../src/components/settings/theme-control.tsx#L47) · `updateTheme` | FunctionDeclaration; ThemeControl | `(next: Theme): void` | `void` | localStorage.setItem, listeners.forEach | — |
| [src/components/settings/theme-control.tsx:50](../../../src/components/settings/theme-control.tsx#L50) · `callback@listeners.forEach` | ArrowFunction; updateTheme | `(listener: () => void): void` | `void` | listener | — |
| [src/components/settings/theme-control.tsx:53](../../../src/components/settings/theme-control.tsx#L53) · `(callback)` | ArrowFunction; ThemeControl | `(): void` | `void` | updateTheme | — |
| [src/components/settings/theme-control.tsx:53](../../../src/components/settings/theme-control.tsx#L53) · `(callback)` | ArrowFunction; ThemeControl | `(): void` | `void` | updateTheme | — |

## src/components/shell/app-shell.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/components/shell/app-shell.tsx:19](../../../src/components/shell/app-shell.tsx#L19) · `AppShell` | FunctionDeclaration; module | `({ children, user, organization, role }: { children: ReactNode; user: { name: string; email: string; }; organization: { id: string; name: string; }; role: string; }): import("<projeto>/node_modules/@types/react/index"…` | `JSX.Element` | usePathname, navigation.find, initials, navigation.map | — |
| [src/components/shell/app-shell.tsx:22](../../../src/components/shell/app-shell.tsx#L22) · `callback@navigation.find` | ArrowFunction; AppShell | `(item: { label: string; href: string; icon: import("<projeto>/node_modules/@types/react/index").ForwardRefExoticComponent<Omit<import("<projeto>/node_modules/lucide-react/dist/lucide-react").LucideProps, "ref"> & impo…` | `boolean` | — | — |
| [src/components/shell/app-shell.tsx:38](../../../src/components/shell/app-shell.tsx#L38) · `callback@navigation.map` | ArrowFunction; AppShell | `({ label, href, icon: Icon }: { label: string; href: string; icon: import("<projeto>/node_modules/@types/react/index").ForwardRefExoticComponent<Omit<import("<projeto>/node_modules/lucide-react/dist/lucide-react").Luc…` | `JSX.Element` | — | — |

## src/components/shell/logout-button.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/components/shell/logout-button.tsx:7](../../../src/components/shell/logout-button.tsx#L7) · `LogoutButton` | FunctionDeclaration; module | `(): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | useRouter | — |
| [src/components/shell/logout-button.tsx:11](../../../src/components/shell/logout-button.tsx#L11) · `(callback)` | ArrowFunction; LogoutButton · async | `(): Promise<void>` | `Promise<void>` | authClient.signOut, router.replace, router.refresh | — |

## src/components/tasks/task-form.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/components/tasks/task-form.tsx:16](../../../src/components/tasks/task-form.tsx#L16) · `TaskForm` | FunctionDeclaration; module | `({ clients, deals }: { clients: { id: string; name: string; }[]; deals: { id: string; title: string; clientId: string; }[]; }): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | useRouter, useState, useForm, zodResolver, handleSubmit, register, clients.map, deals.map | — |
| [src/components/tasks/task-form.tsx:22](../../../src/components/tasks/task-form.tsx#L22) · `onSubmit` | FunctionDeclaration; TaskForm · async | `(values: Values): Promise<void>` | `Promise<void>` | setMessage, recifeDateTimeToIso, createTask, router.push, router.refresh | — |
| [src/components/tasks/task-form.tsx:37](../../../src/components/tasks/task-form.tsx#L37) · `callback@clients.map` | ArrowFunction; TaskForm | `(client: { id: string; name: string; }): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | — | — |
| [src/components/tasks/task-form.tsx:38](../../../src/components/tasks/task-form.tsx#L38) · `callback@deals.map` | ArrowFunction; TaskForm | `(deal: { id: string; title: string; clientId: string; }): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | — | — |
| [src/components/tasks/task-form.tsx:42](../../../src/components/tasks/task-form.tsx#L42) · `(callback)` | ArrowFunction; TaskForm | `(): void` | `void` | router.back | — |

## src/components/tasks/task-status-control.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/components/tasks/task-status-control.tsx:8](../../../src/components/tasks/task-status-control.tsx#L8) · `TaskStatusControl` | FunctionDeclaration; module | `({ taskId, status }: { taskId: string; status: string; }): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | useRouter, useState | — |
| [src/components/tasks/task-status-control.tsx:15](../../../src/components/tasks/task-status-control.tsx#L15) · `(callback)` | ArrowFunction; TaskStatusControl · async | `(): Promise<void>` | `Promise<void>` | setBusy, setTaskStatus, router.refresh | — |

## src/components/team/assignment-transfer-control.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/components/team/assignment-transfer-control.tsx:14](../../../src/components/team/assignment-transfer-control.tsx#L14) · `personLabel` | FunctionDeclaration; module | `(person: MemberAssignmentSummary): string` | `string` | — | — |
| [src/components/team/assignment-transfer-control.tsx:18](../../../src/components/team/assignment-transfer-control.tsx#L18) · `countLabel` | FunctionDeclaration; module | `(value: number, singular: string, plural: string): string` | `string` | — | — |
| [src/components/team/assignment-transfer-control.tsx:22](../../../src/components/team/assignment-transfer-control.tsx#L22) · `AssignmentTransferControl` | FunctionDeclaration; module | `({ members }: { members: MemberAssignmentSummary[]; }): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | useRouter, useRef, useState, findAssignmentSource, getTransferPreview, isValidAssignmentTransfer, members.find, members.map | — |
| [src/components/team/assignment-transfer-control.tsx:36](../../../src/components/team/assignment-transfer-control.tsx#L36) · `callback@members.find` | ArrowFunction; AssignmentTransferControl | `(person: MemberAssignmentSummary): boolean` | `boolean` | — | — |
| [src/components/team/assignment-transfer-control.tsx:38](../../../src/components/team/assignment-transfer-control.tsx#L38) · `openConfirmation` | FunctionDeclaration; AssignmentTransferControl | `(): void` | `void` | setFeedback, dialogRef.current?.showModal, setConfirmOpen | — |
| [src/components/team/assignment-transfer-control.tsx:45](../../../src/components/team/assignment-transfer-control.tsx#L45) · `closeConfirmation` | FunctionDeclaration; AssignmentTransferControl | `(): void` | `void` | dialogRef.current?.close | — |
| [src/components/team/assignment-transfer-control.tsx:49](../../../src/components/team/assignment-transfer-control.tsx#L49) · `confirmTransfer` | FunctionDeclaration; AssignmentTransferControl · async | `(): Promise<void>` | `Promise<void>` | setPending, setFeedback, transferMemberAssignments, countLabel, dialogRef.current?.close, router.refresh | — |
| [src/components/team/assignment-transfer-control.tsx:93](../../../src/components/team/assignment-transfer-control.tsx#L93) · `(callback)` | ArrowFunction; AssignmentTransferControl | `(event: import("<projeto>/node_modules/@types/react/index").ChangeEvent<HTMLSelectElement, HTMLSelectElement>): void` | `void` | setFromUserId, setFeedback | — |
| [src/components/team/assignment-transfer-control.tsx:95](../../../src/components/team/assignment-transfer-control.tsx#L95) · `callback@members.map` | ArrowFunction; AssignmentTransferControl | `(person: MemberAssignmentSummary): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | personLabel | — |
| [src/components/team/assignment-transfer-control.tsx:100](../../../src/components/team/assignment-transfer-control.tsx#L100) · `(callback)` | ArrowFunction; AssignmentTransferControl | `(event: import("<projeto>/node_modules/@types/react/index").ChangeEvent<HTMLSelectElement, HTMLSelectElement>): void` | `void` | setToUserId, setFeedback | — |
| [src/components/team/assignment-transfer-control.tsx:102](../../../src/components/team/assignment-transfer-control.tsx#L102) · `callback@members.filter` | ArrowFunction; AssignmentTransferControl | `(person: MemberAssignmentSummary): boolean` | `boolean` | — | — |
| [src/components/team/assignment-transfer-control.tsx:102](../../../src/components/team/assignment-transfer-control.tsx#L102) · `callback@members.filter((person) => person.userId !== fromUserId).map` | ArrowFunction; AssignmentTransferControl | `(person: MemberAssignmentSummary): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | personLabel | — |
| [src/components/team/assignment-transfer-control.tsx:127](../../../src/components/team/assignment-transfer-control.tsx#L127) · `(callback)` | ArrowFunction; AssignmentTransferControl | `(): void` | `void` | setConfirmOpen | — |
| [src/components/team/assignment-transfer-control.tsx:127](../../../src/components/team/assignment-transfer-control.tsx#L127) · `(callback)` | ArrowFunction; AssignmentTransferControl | `(event: import("<projeto>/node_modules/@types/react/index").SyntheticEvent<HTMLDialogElement, Event>): void` | `void` | event.preventDefault | — |

## src/components/team/member-responsibilities.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/components/team/member-responsibilities.tsx:7](../../../src/components/team/member-responsibilities.tsx#L7) · `CountCell` | FunctionDeclaration; module | `({ active, archived, label, activeLabel, archivedLabel }: { active: number; archived: number; label: string; activeLabel: string; archivedLabel: string; }): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | — | — |
| [src/components/team/member-responsibilities.tsx:20](../../../src/components/team/member-responsibilities.tsx#L20) · `MemberResponsibilities` | FunctionDeclaration; module | `({ members }: { members: MemberAssignmentSummary[]; }): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | members.map | — |
| [src/components/team/member-responsibilities.tsx:51](../../../src/components/team/member-responsibilities.tsx#L51) · `callback@members.map` | ArrowFunction; MemberResponsibilities | `(person: MemberAssignmentSummary): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | person.name.slice(0, 1).toUpperCase, person.name.slice | — |

## src/components/team/member-role-control.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/components/team/member-role-control.tsx:6](../../../src/components/team/member-role-control.tsx#L6) · `MemberRoleControl` | FunctionDeclaration; module | `({ memberId, memberName, memberEmail, role }: { memberId: string; memberName: string; memberEmail: string; role: string; }): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | useState, useTransition | — |
| [src/components/team/member-role-control.tsx:14](../../../src/components/team/member-role-control.tsx#L14) · `(callback)` | ArrowFunction; MemberRoleControl | `(event: import("<projeto>/node_modules/@types/react/index").ChangeEvent<HTMLSelectElement, HTMLSelectElement>): void` | `void` | setSelected | — |
| [src/components/team/member-role-control.tsx:15](../../../src/components/team/member-role-control.tsx#L15) · `(callback)` | ArrowFunction; MemberRoleControl | `(): void` | `void` | startTransition | — |
| [src/components/team/member-role-control.tsx:15](../../../src/components/team/member-role-control.tsx#L15) · `callback@startTransition` | ArrowFunction; MemberRoleControl · async | `(): Promise<void>` | `Promise<void>` | setMessage, setMessageKind, updateMemberRole, setSelected | — |

## src/components/ui/button.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/components/ui/button.tsx:7](../../../src/components/ui/button.tsx#L7) · `Button` | FunctionDeclaration; module | `({ className, variant, size, ...props }: ButtonProps): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | cn | — |

## src/components/ui/field.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/components/ui/field.tsx:4](../../../src/components/ui/field.tsx#L4) · `Field` | FunctionDeclaration; module | `({ label, hint, error, id, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string; }): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | cn, Boolean, [hint ? hintId : null, error ? errorId : null].filter(Boolean…, [hint ? hintId : null, error ? errorId : null].filter | — |
| [src/components/ui/field.tsx:19](../../../src/components/ui/field.tsx#L19) · `TextareaField` | FunctionDeclaration; module | `({ label, error, id, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; }): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | cn, Boolean | — |
| [src/components/ui/field.tsx:31](../../../src/components/ui/field.tsx#L31) · `SelectField` | FunctionDeclaration; module | `({ label, error, id, className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; }): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | cn, Boolean | — |

## src/components/ui/focus-visible-scroll-region.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/components/ui/focus-visible-scroll-region.tsx:11](../../../src/components/ui/focus-visible-scroll-region.tsx#L11) · `FocusVisibleScrollRegion` | FunctionDeclaration; module | `({ className, children }: FocusVisibleScrollRegionProps): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | useRef | — |
| [src/components/ui/focus-visible-scroll-region.tsx:14](../../../src/components/ui/focus-visible-scroll-region.tsx#L14) · `handleFocusCapture` | FunctionDeclaration; FocusVisibleScrollRegion | `(event: FocusEvent<HTMLDivElement>): void` | `void` | focused.matches, requestAnimationFrame | — |
| [src/components/ui/focus-visible-scroll-region.tsx:18](../../../src/components/ui/focus-visible-scroll-region.tsx#L18) · `callback@requestAnimationFrame` | ArrowFunction; handleFocusCapture | `(): void` | `void` | region.getBoundingClientRect, focused.getBoundingClientRect, getComputedStyle, Number.parseFloat, Math.max | — |

## src/components/ui/page-heading.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/components/ui/page-heading.tsx:3](../../../src/components/ui/page-heading.tsx#L3) · `PageHeading` | FunctionDeclaration; module | `({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode; }): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | — | — |

## src/components/ui/status-badge.tsx

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [src/components/ui/status-badge.tsx:8](../../../src/components/ui/status-badge.tsx#L8) · `StatusBadge` | FunctionDeclaration; module | `({ value }: { value: string; }): import("<projeto>/node_modules/@types/react/index").JSX.Element` | `JSX.Element` | — | — |

## scripts/debug-migrate.mjs

| Linha / símbolo | Contexto e forma | Assinatura verificada | Retorno inferido | Chamadas diretas reconhecidas | Erros explícitos
|---|---|---|---|---|---|
| [scripts/debug-migrate.mjs:17](../../../scripts/debug-migrate.mjs#L17) · `main` | FunctionDeclaration; module · async | `(): Promise<void>` | `Promise<void>` | drizzle, migrate, console.log, console.error, pool.end | — |

