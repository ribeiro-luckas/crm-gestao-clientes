# Variáveis dos testes e helpers

Inventário de variáveis obtido do AST e dos tipos resolvidos pelo TypeScript. Valores literais de inicialização não são publicados. “Origem” registra a forma da expressão inicializadora, não seu valor. Parâmetros constam junto às assinaturas da referência de funções; propriedades de interfaces/classes são catalogadas em seção própria.

## tests/e2e/accessibility-forms.spec.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 10 | `form` | module | `Locator` | sim | chamada page.locator |
| 13 | `email` | module | `Locator` | sim | chamada page.getByLabel |
| 14 | `password` | module | `Locator` | sim | chamada page.getByLabel |
| 16 | `brand` | module | `Locator` | sim | chamada page.getByRole |
| 24 | `associationIssues` | module | `{ duplicateIds: string[]; unassociatedLabels: string[]; unlabeledFields: string[]; }` | sim | chamada form.evaluate |
| 25 | `fields` | module | `(HTMLInputElement \| HTMLSelectElement \| HTMLTextAreaElement)[]` | sim | chamada Array.from |
| 26 | `ids` | module | `string[]` | sim | chamada fields.map |
| 27 | `labels` | module | `HTMLLabelElement[]` | sim | chamada Array.from |
| 28 | `duplicateIds` | module | `string[]` | sim | chamada ids.filter |
| 29 | `unassociatedLabels` | module | `string[]` | sim | chamada labels.filter((label) => { const target = label.htmlFor ? document.get |
| 30 | `target` | module | `HTMLInputElement \| HTMLSelectElement \| HTMLTextAreaElement \| null` | sim | condição derivada |
| 33 | `unlabeledFields` | module | `string[]` | sim | chamada fields.filter((field) => !field.labels?.length).map |
| 45 | `email` | module | `Locator` | sim | chamada page.getByLabel |
| 46 | `password` | module | `Locator` | sim | chamada page.getByLabel |
| 47 | `submit` | module | `Locator` | sim | chamada page.getByRole |
| 58 | `viewport` | module | `{ width: number; height: number; }` | não | sem inicializador |
| 60 | `dimensions` | module | `{ viewport: number; content: number; }` | sim | chamada page.evaluate |
| 72 | `theme` | module | `"light" \| "dark"` | não | sem inicializador |
| 74 | `results` | module | `axe.AxeResults` | sim | chamada new AxeBuilder({ page }).analyze |

## tests/e2e/contacts-activities-archive.spec.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 10 | `connection` | module | `IsolatedConnectionPair` | não | sem inicializador |
| 11 | `db` | module | `NodePgDatabase<typeof schema>` | não | sem inicializador |
| 12 | `orgA` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 13 | `orgB` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 14 | `clientAId` | module | `string` | não | sem inicializador |
| 15 | `clientBId` | module | `string` | não | sem inicializador |
| 16 | `archivedClientId` | module | `string` | não | sem inicializador |
| 17 | `archivedContactId` | module | `string` | não | sem inicializador |
| 18 | `archivedActivityId` | module | `string` | não | sem inicializador |
| 19 | `archivedClientName` | module | `string` | não | sem inicializador |
| 20 | `archivedActivitySubject` | module | `string` | não | sem inicializador |
| 28 | `archivedName` | module | `string` | sim | TemplateExpression |
| 29 | `createdClients` | module | `{ id: string; name: string; }[]` | sim | chamada db.insert(schema.clients).values([ { organizationId: orgA.organization |
| 34 | `clientA` | module | `{ id: string; name: string; } \| undefined` | sim | chamada createdClients.find |
| 35 | `clientB` | module | `{ id: string; name: string; } \| undefined` | sim | chamada createdClients.find |
| 36 | `archivedClient` | module | `{ id: string; name: string; } \| undefined` | sim | chamada createdClients.find |
| 43 | `archivedContact` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.contacts).values({ organizationId: orgA.organizationI |
| 51 | `archivedActivity` | module | `{ id: string; subject: string; }[]` | sim | chamada db.insert(schema.activities).values({ organizationId: orgA.organizatio |
| 64 | `errors` | module | `unknown[]` | sim | lista |
| 65 | `fixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 76 | `error` | module | `unknown` | não | sem inicializador |
| 77 | `error` | module | `unknown` | não | sem inicializador |
| 79 | `residues` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { organizationId: string; }[], { id: string; }[],…` | sim | chamada Promise.all |
| 95 | `error` | module | `unknown` | não | sem inicializador |
| 102 | `response` | signInAsOwner | `APIResponse<any>` | sim | chamada signInWithRateLimitRetry |
| 110 | `contactsPanel` | module | `Locator` | sim | chamada page.locator("section.panel").filter |
| 122 | `contact` | module | `{ id: string; organizationId: string; companyClientId: string; name: string; email: string \| null; phone: …` | sim | chamada db.select({ id: schema.contacts.id, organizationId: schema.contacts.or |
| 126 | `audit` | module | `{ organizationId: string; actorUserId: string; action: string; entityType: string; entityId: string; }[]` | sim | chamada db.select({ organizationId: schema.auditLogs.organizationId, actorUser |
| 135 | `contactsPanel` | module | `Locator` | sim | chamada page.locator("section.panel").filter |
| 147 | `activityPanel` | module | `Locator` | sim | chamada page.locator("section.panel").filter |
| 161 | `historyPanel` | module | `Locator` | sim | chamada page.locator("section.panel").filter |
| 165 | `activity` | module | `{ id: string; organizationId: string; actorUserId: string; clientId: string \| null; dealId: string \| null…` | sim | chamada db.select({ id: schema.activities.id, organizationId: schema.activitie |
| 169 | `audit` | module | `{ actorUserId: string; action: string; entityType: string; entityId: string; }[]` | sim | chamada db.select({ actorUserId: schema.auditLogs.actorUserId, action: schema. |
| 180 | `archivedContactBefore` | module | `{ id: string; companyClientId: string; deletedAt: Date \| null; }[]` | sim | chamada db.select({ id: schema.contacts.id, companyClientId: schema.contacts.c |
| 182 | `archivedActivityBefore` | module | `{ id: string; clientId: string \| null; subject: string; }[]` | sim | chamada db.select({ id: schema.activities.id, clientId: schema.activities.clie |
| 191 | `archivedClientResponse` | module | `Response \| null` | sim | chamada page.goto |
| 206 | `privateContact` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.contacts).values({ organizationId: orgB.organizationI |
| 220 | `foreignClientResponse` | module | `Response \| null` | sim | chamada page.goto |

## tests/e2e/crm-core-flows.spec.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 9 | `linkedTasksMessage` | module | `"Não é possível alterar o cliente desta oportunidade enquanto houver tarefas vinculadas. Reconcilie as tare…` | sim | literal string (valor omitido) |
| 11 | `connection` | module | `IsolatedConnectionPair` | não | sem inicializador |
| 12 | `db` | module | `NodePgDatabase<typeof schema>` | não | sem inicializador |
| 13 | `fixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 14 | `clientIds` | module | `{ primary: string; secondary: string; }` | não | sem inicializador |
| 15 | `dealId` | module | `string` | não | sem inicializador |
| 21 | `primary` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.clients).values([ { organizationId: fixture.organizat |
| 21 | `secondary` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.clients).values([ { organizationId: fixture.organizat |
| 26 | `deal` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.deals).values({ organizationId: fixture.organizationI |
| 37 | `errors` | module | `unknown[]` | sim | lista |
| 40 | `error` | module | `unknown` | não | sem inicializador |
| 42 | `userIds` | module | `string[]` | sim | chamada Object.values(fixture.actors).map |
| 43 | `residues` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 59 | `error` | module | `unknown` | não | sem inicializador |
| 68 | `identity` | signIn | `{ userId: string; email: string; password: string; memberId: string; }` | sim | acesso indexado |
| 69 | `response` | signIn | `APIResponse<any>` | sim | chamada signInWithRateLimitRetry |
| 79 | `invalidLogin` | module | `Promise<Response>` | sim | chamada page.waitForResponse |
| 113 | `persisted` | module | `{ name: string; status: "active" \| "prospect" \| "inactive"; ownerUserId: string \| null; }[]` | sim | chamada db.select({ name: schema.clients.name, status: schema.clients.status, |
| 135 | `persisted` | module | `{ clientId: string; title: string; }[]` | sim | chamada db.select({ clientId: schema.deals.clientId, title: schema.deals.title |
| 142 | `activeTask` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.tasks).values([ { organizationId: fixture.organizatio |
| 142 | `archivedTask` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.tasks).values([ { organizationId: fixture.organizatio |
| 146 | `dealBefore` | module | `{ clientId: string; title: string; amount: string; }[]` | sim | chamada db.select({ clientId: schema.deals.clientId, title: schema.deals.title |
| 148 | `auditBefore` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.auditLogs.id }).from(schema.auditLogs) .where |
| 187 | `taskRow` | module | `Locator` | sim | chamada page.getByRole("row").filter |
| 191 | `persisted` | module | `{ status: "todo" \| "in_progress" \| "done" \| "canceled"; clientId: string \| null; dealId: string \| null…` | sim | chamada db.select({ status: schema.tasks.status, clientId: schema.tasks.client |
| 198 | `assignedClient` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.clients).values({ organizationId: fixture.organizatio |
| 202 | `response` | module | `APIResponse<any>` | sim | chamada page.request.post |
| 207 | `body` | module | `{ code: string; message: string; }` | sim | chamada response.json |
| 220 | `denied` | module | `APIResponse<any>` | sim | chamada page.request.post |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 14 | `primary` | `string` | module |
| 14 | `secondary` | `string` | module |
| 207 | `code` | `string` | module |
| 207 | `message` | `string` | module |

## tests/e2e/multitenant-security.spec.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 10 | `connection` | module | `IsolatedConnectionPair` | não | sem inicializador |
| 11 | `db` | module | `NodePgDatabase<typeof schema>` | não | sem inicializador |
| 12 | `orgA` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 13 | `orgB` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 14 | `extraMembership` | module | `{ organizationId: string; userId: string; } \| undefined` | não | sem inicializador |
| 21 | `clientA` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.clients).values({ organizationId: orgA.organizationId |
| 22 | `clientB` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.clients).values({ organizationId: orgB.organizationId |
| 23 | `dealA` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.deals).values({ organizationId: orgA.organizationId, |
| 24 | `dealB` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.deals).values({ organizationId: orgB.organizationId, |
| 30 | `cleanupErrors` | module | `unknown[]` | sim | lista |
| 31 | `currentExtraMembership` | module | `{ organizationId: string; userId: string; } \| undefined` | sim | alias extraMembership |
| 40 | `remains` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.member.id }).from(schema.member).where |
| 45 | `error` | module | `unknown` | não | sem inicializador |
| 47 | `fixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 58 | `error` | module | `unknown` | não | sem inicializador |
| 59 | `error` | module | `unknown` | não | sem inicializador |
| 68 | `response` | signIn | `APIResponse<any>` | sim | chamada signInWithRateLimitRetry |
| 76 | `actor` | module | `"owner" \| "admin"` | não | sem inicializador |
| 79 | `endpoint` | module | `string[]` | não | sem inicializador |
| 79 | `mustContain` | module | `string[]` | não | sem inicializador |
| 79 | `mustNotContain` | module | `string[]` | não | sem inicializador |
| 83 | `response` | module | `APIResponse<any>` | sim | chamada page.request.get |
| 87 | `csv` | module | `string` | sim | chamada response.text |
| 96 | `endpoint` | module | `string` | não | sem inicializador |
| 97 | `response` | module | `APIResponse<any>` | sim | chamada page.request.get |
| 101 | `body` | module | `string` | sim | chamada response.text |
| 108 | `endpoint` | module | `string` | não | sem inicializador |
| 109 | `response` | module | `APIResponse<any>` | sim | chamada page.request.get |
| 110 | `status` | module | `number` | sim | chamada response.status |
| 111 | `body` | module | `string` | sim | chamada response.text |
| 123 | `clientsSection` | module | `Locator` | sim | chamada page.locator("section").filter |
| 124 | `dealsSection` | module | `Locator` | sim | chamada page.locator("section").filter |
| 125 | `tasksSection` | module | `Locator` | sim | chamada page.locator("section").filter |
| 139 | `owner` | module | `{ userId: string; email: string; password: string; memberId: string; }` | sim | propriedade owner |
| 140 | `firstSessionResponse` | module | `APIResponse<any>` | sim | chamada page.request.get |
| 142 | `firstSessionBody` | module | `{ session?: { id?: string; }; user?: { id?: string; }; }` | sim | chamada firstSessionResponse.json |
| 145 | `firstSessionId` | module | `string` | sim | propriedade id |
| 146 | `firstContextSessionCookies` | module | `Cookie[]` | sim | chamada page.context().cookies |
| 151 | `secondContext` | module | `BrowserContext` | sim | chamada browser.newContext |
| 153 | `secondPage` | module | `Page` | sim | chamada secondContext.newPage |
| 155 | `secondSessionResponse` | module | `APIResponse<any>` | sim | chamada secondPage.request.get |
| 157 | `secondSessionBody` | module | `{ session?: { id?: string; }; user?: { id?: string; }; }` | sim | chamada secondSessionResponse.json |
| 160 | `secondSessionId` | module | `string` | sim | propriedade id |
| 163 | `sessionsBefore` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.session.id }).from(schema.session).where |
| 165 | `accountsBefore` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.account.id }).from(schema.account).where |
| 166 | `membershipsBefore` | module | `{ id: string; organizationId: string; role: string; }[]` | sim | chamada db.select({ id: schema.member.id, organizationId: schema.member.organi |
| 169 | `signOutResponsePromise` | module | `Promise<Response>` | sim | chamada page.waitForResponse |
| 170 | `requestUrl` | module | `URL` | sim | instância URL |
| 174 | `signOut` | module | `Response` | sim | alias signOutResponsePromise |
| 175 | `signOutBody` | module | `{ code?: unknown; message?: unknown; } \| null` | sim | chamada signOut.json().catch |
| 176 | `publicError` | module | `string` | sim | condição derivada |
| 186 | `revokedSessionResponse` | module | `APIResponse<any>` | sim | chamada page.request.get |
| 191 | `preservedSessionResponse` | module | `APIResponse<any>` | sim | chamada secondPage.request.get |
| 193 | `preservedSessionBody` | module | `{ session?: { id?: string; }; user?: { id?: string; }; }` | sim | chamada preservedSessionResponse.json |
| 204 | `actor` | module | `{ userId: string; email: string; password: string; memberId: string; }` | sim | propriedade member |
| 205 | `crossMemberId` | module | `string` | sim | TemplateExpression |
| 214 | `ownerMembershipBefore` | module | `{ id: string; role: string; }[]` | sim | chamada db.select({ id: schema.member.id, role: schema.member.role }) .from(sc |
| 218 | `assignedClients` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[]]` | sim | chamada Promise.all |
| 218 | `assignedDeals` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[]]` | sim | chamada Promise.all |
| 218 | `assignedTasks` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[]]` | sim | chamada Promise.all |
| 225 | `tenantSnapshot` | module | `(organizationId: string) => Promise<[{ id: string; ownerUserId: string \| null; }[], { id: string; clientId…` | sim | função/callback |
| 230 | `beforeA` | module | `[{ id: string; ownerUserId: string \| null; }[], { id: string; clientId: string; ownerUserId: string \| nul…` | sim | chamada tenantSnapshot |
| 231 | `beforeB` | module | `[{ id: string; ownerUserId: string \| null; }[], { id: string; clientId: string; ownerUserId: string \| nul…` | sim | chamada tenantSnapshot |
| 232 | `membershipsBBefore` | module | `{ id: string; userId: string; role: string; }[]` | sim | chamada db.select({ id: schema.member.id, userId: schema.member.userId, role: |
| 236 | `sessionResponse` | module | `APIResponse<any>` | sim | chamada page.request.get |
| 238 | `sessionBody` | module | `{ session?: { id?: string; }; user?: { id?: string; }; }` | sim | chamada sessionResponse.json |
| 241 | `memberSessionId` | module | `string` | sim | propriedade id |
| 249 | `ownerContext` | module | `BrowserContext` | sim | chamada browser.newContext |
| 251 | `ownerPage` | module | `Page` | sim | chamada ownerContext.newPage |
| 253 | `removal` | module | `APIResponse<any>` | sim | chamada ownerPage.request.post |
| 276 | `sessionAfterRemoval` | module | `APIResponse<any>` | sim | chamada page.request.get |
| 278 | `sessionAfterBody` | module | `{ session?: { id?: string; }; user?: { id?: string; }; }` | sim | chamada sessionAfterRemoval.json |
| 282 | `activeOrganizationAfterRemoval` | module | `{ activeOrganizationId: string \| null; }[]` | sim | chamada db.select({ activeOrganizationId: schema.session.activeOrganizationId |
| 288 | `selectionRegion` | module | `Locator` | sim | chamada page.getByRole |
| 292 | `availableWorkspace` | module | `Locator` | sim | chamada page.getByRole |
| 298 | `activeOrganizationAfterSelection` | module | `{ activeOrganizationId: string \| null; }[]` | sim | chamada db.select({ activeOrganizationId: schema.session.activeOrganizationId |
| 302 | `workspaceSwitcher` | module | `Locator` | sim | chamada page.locator |
| 309 | `clientA` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.clients.id }).from(schema.clients).where |
| 310 | `privateClientResponse` | module | `Response \| null` | sim | chamada page.goto |
| 317 | `endpoint` | module | `string` | não | sem inicializador |
| 318 | `response` | module | `APIResponse<any>` | sim | chamada page.request.get |
| 328 | `endpoint` | module | `string` | não | sem inicializador |
| 329 | `response` | module | `APIResponse<any>` | sim | chamada page.request.get |
| 353 | `owner` | module | `{ userId: string; email: string; password: string; memberId: string; }` | sim | propriedade owner |
| 356 | `extraMemberId` | module | `string` | sim | TemplateExpression |
| 367 | `session` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.session.id }).from(schema.session).where |
| 371 | `workspaceButtons` | module | `Locator` | sim | chamada page.getByRole |
| 387 | `activeB` | module | `{ activeOrganizationId: string \| null; }[]` | sim | chamada db.select({ activeOrganizationId: schema.session.activeOrganizationId |
| 392 | `workspaceSwitcher` | module | `Locator` | sim | chamada page.locator |
| 402 | `activeA` | module | `{ activeOrganizationId: string \| null; }[]` | sim | chamada db.select({ activeOrganizationId: schema.session.activeOrganizationId |
| 422 | `session` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.session.id }).from(schema.session) .where |
| 429 | `storedSession` | module | `{ activeOrganizationId: string \| null; }[]` | sim | chamada db.select({ activeOrganizationId: schema.session.activeOrganizationId |
| 435 | `actor` | module | `{ userId: string; email: string; password: string; memberId: string; }` | sim | propriedade target |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 14 | `organizationId` | `string` | module |
| 14 | `userId` | `string` | module |
| 67 | `email` | `string` | signIn |
| 67 | `password` | `string` | signIn |
| 142 | `session` | `{ id?: string; } \| undefined` | module |
| 142 | `id` | `string \| undefined` | module |
| 142 | `user` | `{ id?: string; } \| undefined` | module |
| 142 | `id` | `string \| undefined` | module |
| 157 | `session` | `{ id?: string; } \| undefined` | module |
| 157 | `id` | `string \| undefined` | module |
| 157 | `user` | `{ id?: string; } \| undefined` | module |
| 157 | `id` | `string \| undefined` | module |
| 175 | `code` | `unknown` | module |
| 175 | `message` | `unknown` | module |
| 193 | `session` | `{ id?: string; } \| undefined` | module |
| 193 | `id` | `string \| undefined` | module |
| 193 | `user` | `{ id?: string; } \| undefined` | module |
| 193 | `id` | `string \| undefined` | module |
| 238 | `session` | `{ id?: string; } \| undefined` | module |
| 238 | `id` | `string \| undefined` | module |
| 238 | `user` | `{ id?: string; } \| undefined` | module |
| 238 | `id` | `string \| undefined` | module |
| 278 | `session` | `{ id?: string; } \| undefined` | module |
| 278 | `id` | `string \| undefined` | module |
| 278 | `user` | `{ id?: string; } \| undefined` | module |
| 278 | `id` | `string \| undefined` | module |

## tests/e2e/pipeline-listing-filters.spec.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 10 | `connection` | module | `IsolatedConnectionPair` | não | sem inicializador |
| 11 | `db` | module | `NodePgDatabase<typeof schema>` | não | sem inicializador |
| 12 | `orgA` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 13 | `orgB` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 14 | `clientAId` | module | `string` | não | sem inicializador |
| 15 | `clientBId` | module | `string` | não | sem inicializador |
| 16 | `privateDealAId` | module | `string` | não | sem inicializador |
| 17 | `suffix` | module | `string` | não | sem inicializador |
| 26 | `clients` | module | `{ id: string; organizationId: string; }[]` | sim | chamada db.insert(schema.clients).values([ { organizationId: orgA.organization |
| 30 | `clientA` | module | `{ id: string; organizationId: string; } \| undefined` | sim | chamada clients.find |
| 31 | `clientB` | module | `{ id: string; organizationId: string; } \| undefined` | sim | chamada clients.find |
| 36 | `privateDeal` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.deals).values({ organizationId: orgA.organizationId, |
| 47 | `errors` | module | `unknown[]` | sim | lista |
| 48 | `fixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 59 | `error` | module | `unknown` | não | sem inicializador |
| 60 | `error` | module | `unknown` | não | sem inicializador |
| 62 | `userIds` | module | `string[]` | sim | chamada Object.values(fixture.actors).map |
| 63 | `residues` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { organizationId: string; }[], { id: string; }[],…` | sim | chamada Promise.all |
| 79 | `error` | module | `unknown` | não | sem inicializador |
| 86 | `identity` | signInAs | `{ userId: string; email: string; password: string; memberId: string; }` | sim | acesso indexado |
| 87 | `response` | signInAs | `APIResponse<any>` | sim | chamada signInWithRateLimitRetry |
| 92 | `rows` | tableColumnTexts | `Locator[]` | sim | chamada page.getByRole("row").all |
| 98 | `deal` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.deals).values({ organizationId: orgA.organizationId, |
| 108 | `stagePanel` | module | `Locator` | sim | chamada page.locator("section.panel").filter |
| 109 | `stageSelect` | module | `Locator` | sim | chamada page.getByLabel |
| 123 | `updateButton` | module | `Locator` | sim | chamada stagePanel.getByRole |
| 131 | `audit` | module | `{ actorUserId: string; action: string; details: string \| null; }[]` | sim | chamada db.select({ actorUserId: schema.auditLogs.actorUserId, action: schema. |
| 148 | `finalAudit` | module | `{ actorUserId: string; details: string \| null; }[]` | sim | chamada db.select({ actorUserId: schema.auditLogs.actorUserId, details: schema |
| 162 | `earlyTitle` | module | `string` | sim | TemplateExpression |
| 163 | `lateTitle` | module | `string` | sim | TemplateExpression |
| 164 | `otherStageTitle` | module | `string` | sim | TemplateExpression |
| 178 | `qualificationColumn` | module | `Locator` | sim | chamada page.getByRole |
| 192 | `stage` | module | `string` | não | sem inicializador |
| 206 | `width` | module | `number` | não | sem inicializador |
| 210 | `pageWidth` | module | `{ viewport: number; content: number; }` | sim | chamada page.evaluate |
| 217 | `brandName` | module | `"rota ." \| "rota . CRM COMERCIAL"` | sim | condição derivada |
| 218 | `brand` | module | `Locator` | sim | chamada page.getByRole |
| 221 | `skipLink` | module | `Locator` | sim | chamada page.getByRole |
| 227 | `workspaceSwitcher` | module | `Locator` | sim | chamada page.locator |
| 238 | `navigationNames` | module | `string[]` | sim | lista |
| 239 | `name` | module | `string` | não | sem inicializador |
| 240 | `link` | module | `Locator` | sim | chamada page.getByRole |
| 246 | `outlineWidth` | module | `number` | sim | chamada link.evaluate |
| 254 | `index` | module | `number` | sim | expressão - |
| 267 | `kanban` | module | `Locator` | sim | chamada page.getByRole |
| 273 | `stageControl` | module | `Locator` | sim | chamada page.getByRole("combobox", { name: "Etapa da oportunidade" }).first |
| 278 | `board` | module | `Locator` | sim | chamada page.locator |
| 284 | `clientPageWidth` | module | `{ viewport: number; content: number; }` | sim | chamada page.evaluate |
| 293 | `prefix` | module | `string` | sim | TemplateExpression |
| 294 | `generatedNames` | module | `string[]` | sim | chamada Array.from |
| 295 | `clientValues` | module | `{ name: string; organizationId: string; kind: "person" \| "company"; id?: string \| undefined; email?: stri…` | sim | chamada generatedNames.map |
| 320 | `firstPageRows` | module | `string[]` | sim | chamada tableColumnTexts |
| 323 | `nextPage` | module | `Locator` | sim | chamada page.getByRole |
| 328 | `secondPageRows` | module | `string[]` | sim | chamada tableColumnTexts |
| 331 | `allNames` | module | `string[]` | sim | chamada [...firstPageRows, ...secondPageRows].map |
| 335 | `previousPage` | module | `Locator` | sim | chamada page.getByRole |
| 342 | `prefix` | module | `string` | sim | TemplateExpression |
| 343 | `titles` | module | `{ overdue: string; early: string; late: string; done: string; }` | sim | objeto/configuração |
| 359 | `tasksTable` | module | `Locator` | sim | chamada page.getByRole |
| 372 | `protectedDeal` | module | `{ stage: "new_lead" \| "qualification" \| "proposal" \| "negotiation" \| "won" \| "lost"; }[]` | sim | chamada db.select({ stage: schema.deals.stage }).from(schema.deals).where |
| 373 | `auditBefore` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.auditLogs.id }).from(schema.auditLogs) .where |
| 376 | `unauthenticatedResponse` | module | `Response \| null` | sim | chamada page.goto |
| 381 | `foreignResponse` | module | `Response \| null` | sim | chamada page.goto |

## tests/e2e/sec-01b-security-headers.spec.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 12 | `connection` | module | `IsolatedConnectionPair \| undefined` | não | sem inicializador |
| 13 | `db` | module | `NodePgDatabase<typeof schema> \| undefined` | não | sem inicializador |
| 14 | `fixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 32 | `strictProductionCsp` | module | `boolean` | sim | expressão === |
| 33 | `observed` | module | `Record<string, unknown>` | sim | objeto/configuração |
| 35 | `assetResponses` | module | `{ kind: string; status: number; contentType: string \| null; nosniff: string \| null; cspEnforced: boolean;…` | sim | lista |
| 36 | `browserDiagnostics` | module | `{ kind: string; hydrationRelated?: boolean; cspRelated?: boolean; resourceType?: string; origin?: string; d…` | sim | lista |
| 37 | `browserDiagnosticsCursor` | module | `number` | sim | literal escalar (valor omitido) |
| 50 | `windowWithViolations` | module | `Window & { __safeCspViolations?: SafeViolation[]; __safeScriptLifecycleTracker?: { mutationObserved: (scrip…` | sim | alias window |
| 61 | `scriptsAddedAfterDOMContentLoaded` | module | `WeakSet<HTMLScriptElement>` | sim | instância WeakSet |
| 62 | `scriptsObservedByMutation` | module | `WeakSet<HTMLScriptElement>` | sim | instância WeakSet |
| 63 | `scriptsWithLoadEvent` | module | `WeakSet<HTMLScriptElement>` | sim | instância WeakSet |
| 64 | `scriptsWithErrorEvent` | module | `WeakSet<HTMLScriptElement>` | sim | instância WeakSet |
| 65 | `stylesAddedAfterDOMContentLoaded` | module | `WeakSet<HTMLStyleElement>` | sim | instância WeakSet |
| 66 | `domContentLoaded` | module | `boolean` | sim | expressão !== |
| 74 | `markScripts` | module | `(node: Node) => void` | sim | função/callback |
| 77 | `style` | markScripts | `HTMLStyleElement` | não | sem inicializador |
| 86 | `script` | markScripts | `HTMLScriptElement` | não | sem inicializador |
| 92 | `scriptObserver` | module | `MutationObserver` | sim | instância MutationObserver |
| 93 | `record` | module | `MutationRecord` | não | sem inicializador |
| 93 | `node` | module | `Node` | não | sem inicializador |
| 104 | `uri` | module | `string` | sim | propriedade blockedURI |
| 105 | `blockedResource` | module | `"data" \| "external" \| "none" \| "inline" \| "eval" \| "same-origin"` | sim | condição derivada |
| 112 | `sourceCategory` | module | `string` | sim | literal string (valor omitido) |
| 115 | `sourceUrl` | module | `URL` | sim | instância URL |
| 121 | `scripts` | module | `HTMLScriptElement[]` | sim | chamada Array.from |
| 122 | `blockedScriptElement` | module | `HTMLScriptElement \| null` | sim | null |
| 125 | `blockedUrl` | module | `string` | sim | propriedade href |
| 126 | `matches` | module | `HTMLScriptElement[]` | sim | chamada scripts.filter |
| 151 | `value` | module | `string` | sim | chamada message.text |
| 159 | `origin` | module | `string` | sim | literal string (valor omitido) |
| 160 | `developmentLike` | module | `boolean` | sim | literal escalar (valor omitido) |
| 162 | `url` | module | `URL` | sim | instância URL |
| 169 | `kind` | module | `string` | sim | chamada response.request().resourceType |
| 171 | `headers` | module | `{ [key: string]: string; }` | sim | chamada response.headers |
| 182 | `loginPage` | module | `APIResponse<any>` | sim | chamada page.request.get |
| 184 | `loginDiagnostics` | module | `ResponseDiagnostics` | sim | chamada responseDiagnostics |
| 200 | `loginRequestNonce` | module | `string` | sim | chamada expectCspPolicy |
| 203 | `loginDocument` | module | `Response \| null` | sim | chamada page.goto |
| 205 | `loginReadiness` | module | `{ readinessAssertionPassed: boolean; functionalReadinessReached: boolean; visibleControls: boolean[]; enabl…` | sim | chamada captureFunctionalReadiness |
| 208 | `loginStability` | module | `{ documentReadyState: string; framesObserved: number; configuredFrameLimit: number; elapsedMs: number; conf…` | sim | chamada waitForScriptDomStability |
| 211 | `loginViolations` | module | `{ effectiveDirective: string; violatedDirective: string; disposition: string; resourceCategory: string; sou…` | sim | chamada captureCspViolations |
| 212 | `loginBrowserDiagnostics` | module | `{ kind: string; hydrationRelated?: boolean; cspRelated?: boolean; resourceType?: string; origin?: string; d…` | sim | chamada browserDiagnostics.slice |
| 218 | `loginDocumentDiagnostics` | module | `ResponseDiagnostics` | sim | chamada browserResponseDiagnostics |
| 220 | `loginNonce` | module | `string` | sim | chamada expectCspPolicy |
| 223 | `loginScriptSummary` | module | `{ scriptElementCount: number; policyRelevantScriptCount: number; inlineScriptCount: number; externalScriptC…` | sim | chamada verifyDocumentScripts |
| 240 | `actor` | module | `{ userId: string; email: string; password: string; memberId: string; }` | sim | propriedade owner |
| 241 | `signIn` | module | `APIResponse<any>` | sim | chamada signInWithRateLimitRetry |
| 248 | `sessionCookies` | module | `{ name: string; httpOnly: boolean; secure: boolean; sameSite: string \| null; path: string \| null; maxAgeP…` | sim | propriedade cookies |
| 253 | `privatePage` | module | `APIResponse<any>` | sim | chamada page.request.get |
| 257 | `privatePageDiagnostics` | module | `ResponseDiagnostics` | sim | chamada responseDiagnostics |
| 267 | `privatePageNonce` | module | `string` | sim | chamada expectCspPolicy |
| 271 | `dashboardDocument` | module | `Response \| null` | sim | chamada page.goto |
| 273 | `dashboardReadiness` | module | `{ readinessAssertionPassed: boolean; functionalReadinessReached: boolean; visibleControls: boolean[]; enabl…` | sim | chamada captureFunctionalReadiness |
| 276 | `dashboardStability` | module | `{ documentReadyState: string; framesObserved: number; configuredFrameLimit: number; elapsedMs: number; conf…` | sim | chamada waitForScriptDomStability |
| 279 | `dashboardViolations` | module | `{ effectiveDirective: string; violatedDirective: string; disposition: string; resourceCategory: string; sou…` | sim | chamada captureCspViolations |
| 280 | `dashboardBrowserDiagnostics` | module | `{ kind: string; hydrationRelated?: boolean; cspRelated?: boolean; resourceType?: string; origin?: string; d…` | sim | chamada browserDiagnostics.slice |
| 285 | `dashboardDocumentDiagnostics` | module | `ResponseDiagnostics` | sim | chamada browserResponseDiagnostics |
| 287 | `dashboardNonce` | module | `string` | sim | chamada expectCspPolicy |
| 290 | `dashboardScriptSummary` | module | `{ scriptElementCount: number; policyRelevantScriptCount: number; inlineScriptCount: number; externalScriptC…` | sim | chamada verifyDocumentScripts |
| 307 | `workspaceSelectDocument` | module | `Response \| null` | sim | chamada page.goto |
| 309 | `workspaceSelectReadiness` | module | `{ readinessAssertionPassed: boolean; functionalReadinessReached: boolean; visibleControls: boolean[]; enabl…` | sim | chamada captureFunctionalReadiness |
| 312 | `workspaceSelectStability` | module | `{ documentReadyState: string; framesObserved: number; configuredFrameLimit: number; elapsedMs: number; conf…` | sim | chamada waitForScriptDomStability |
| 315 | `workspaceSelectViolations` | module | `{ effectiveDirective: string; violatedDirective: string; disposition: string; resourceCategory: string; sou…` | sim | chamada captureCspViolations |
| 316 | `workspaceSelectBrowserDiagnostics` | module | `{ kind: string; hydrationRelated?: boolean; cspRelated?: boolean; resourceType?: string; origin?: string; d…` | sim | chamada browserDiagnostics.slice |
| 321 | `workspaceSelectDiagnostics` | module | `ResponseDiagnostics` | sim | chamada browserResponseDiagnostics |
| 323 | `workspaceSelectNonce` | module | `string` | sim | chamada expectCspPolicy |
| 327 | `workspaceSelectScriptSummary` | module | `{ scriptElementCount: number; policyRelevantScriptCount: number; inlineScriptCount: number; externalScriptC…` | sim | chamada verifyDocumentScripts |
| 355 | `loadedScript` | module | `boolean` | sim | chamada assetResponses.some |
| 356 | `loadedStylesheet` | module | `boolean` | sim | chamada assetResponses.some |
| 361 | `session` | module | `APIResponse<any>` | sim | chamada page.request.get |
| 369 | `csv` | module | `APIResponse<any>` | sim | chamada page.request.get |
| 380 | `signOutResponsePromise` | module | `Promise<Response>` | sim | chamada page.waitForResponse |
| 381 | `url` | module | `URL` | sim | instância URL |
| 385 | `signOut` | module | `Response` | sim | alias signOutResponsePromise |
| 389 | `actor` | module | `{ userId: string; email: string; password: string; memberId: string; }` | sim | propriedade owner |
| 392 | `invalidSignInPromise` | module | `Promise<Response>` | sim | chamada page.waitForResponse |
| 393 | `url` | module | `URL` | sim | instância URL |
| 397 | `invalidSignIn` | module | `Response` | sim | alias invalidSignInPromise |
| 408 | `privateRedirect` | module | `APIResponse<any>` | sim | chamada page.request.get |
| 423 | `redirectedDocument` | module | `Response \| null` | sim | chamada page.goto |
| 426 | `redirectedDocumentDiagnostics` | module | `ResponseDiagnostics` | sim | chamada browserResponseDiagnostics |
| 435 | `nonce` | module | `string` | sim | chamada randomBytes(18).toString |
| 436 | `policy` | module | `string` | sim | chamada buildContentSecurityPolicy |
| 437 | `cspProbeContext` | module | `BrowserContext` | sim | chamada browser.newContext |
| 438 | `cspProbePage` | module | `Page` | sim | chamada cspProbeContext.newPage |
| 439 | `cspIssues` | module | `{ directive: string; reportOnly: boolean; violationType: string; resourceCategory: string; }[]` | sim | lista |
| 440 | `externalRequests` | module | `string[]` | sim | lista |
| 441 | `cdp` | module | `CDPSession` | sim | chamada cspProbeContext.newCDPSession |
| 444 | `details` | module | `{ contentSecurityPolicyIssueDetails?: { violatedDirective?: string; isReportOnly?: boolean; contentSecurity…` | sim | propriedade details |
| 452 | `violation` | module | `{ violatedDirective?: string; isReportOnly?: boolean; contentSecurityPolicyViolationType?: string; blockedU…` | sim | propriedade contentSecurityPolicyIssueDetails |
| 454 | `blockedURL` | module | `string` | sim | expressão ?? |
| 455 | `violationType` | module | `string` | sim | expressão ?? |
| 456 | `resourceCategory` | module | `"external" \| "inline" \| "eval" \| "other"` | sim | condição derivada |
| 486 | `cspProbeResponse` | module | `Response \| null` | sim | chamada cspProbePage.goto |
| 489 | `negativeBrowserState` | module | `{ inlineScriptExecuted: boolean; nonceScriptExecuted: boolean; dynamicEvalFinished: boolean; externalScript…` | sim | chamada cspProbePage.evaluate |
| 498 | `negativeEvidence` | module | `{ inlineScriptExecuted: boolean; nonceScriptExecuted: boolean; dynamicEvalFinished: boolean; externalScript…` | sim | objeto/configuração |
| 518 | `deniedExport` | module | `APIResponse<any>` | sim | chamada page.request.get |
| 528 | `directory` | module | `string` | sim | chamada join |
| 531 | `error` | module | `unknown` | não | sem inicializador |
| 545 | `headers` | snapshotResponse | `{ [key: string]: string; }` | sim | chamada response.headers |
| 546 | `relevantNames` | snapshotResponse | `string[]` | sim | lista |
| 558 | `selected` | snapshotResponse | `Record<string, string \| null>` | sim | objeto/configuração |
| 559 | `name` | snapshotResponse | `string` | não | sem inicializador |
| 563 | `cookies` | snapshotResponse | `{ name: string; httpOnly: boolean; secure: boolean; sameSite: string \| null; path: string \| null; maxAgeP…` | sim | chamada response.headersArray() .filter((header) => header.name.toLowerCase() |
| 566 | `parts` | snapshotResponse | `string[]` | sim | chamada header.value.split(";").map |
| 567 | `name` | snapshotResponse | `string` | sim | expressão ?? |
| 568 | `attributes` | snapshotResponse | `string[]` | sim | chamada parts.slice |
| 569 | `sameSite` | snapshotResponse | `string \| null` | sim | expressão ?? |
| 570 | `path` | snapshotResponse | `string \| null` | sim | expressão ?? |
| 581 | `location` | snapshotResponse | `string \| null` | sim | null |
| 619 | `headers` | responseDiagnostics | `Record<string, string>` | sim | propriedade headers |
| 639 | `headers` | browserResponseDiagnostics | `{ [key: string]: string; }` | sim | chamada response.headers |
| 651 | `sanitized` | expectCspPolicy | `string \| undefined` | sim | chamada value?.replace |
| 678 | `nonce` | expectCspPolicy | `string` | sim | expressão ?? |
| 684 | `headers` | expectSingleCspPolicy | `{ name: string; value: string; }[] \| { name: string; value: string; }[]` | sim | chamada response.headersArray |
| 685 | `policies` | expectSingleCspPolicy | `{ name: string; value: string; }[]` | sim | chamada headers.filter |
| 686 | `reportOnlyPolicies` | expectSingleCspPolicy | `{ name: string; value: string; }[]` | sim | chamada headers.filter |
| 695 | `enforced` | expectNoEnforcedAppViolations | `{ disposition: string; }[]` | sim | chamada violations.filter |
| 701 | `controls` | captureFunctionalReadiness | `Locator[]` | sim | condição derivada |
| 704 | `snapshot` | captureFunctionalReadiness | `() => Promise<{ visibleControls: boolean[]; enabledFormControls: boolean[]; functionalReadinessReached: boo…` | sim | função/callback |
| 705 | `visibleControls` | snapshot | `boolean[]` | sim | chamada Promise.all |
| 706 | `enabledFormControls` | snapshot | `boolean[]` | sim | condição derivada |
| 710 | `readinessAssertionPassed` | captureFunctionalReadiness | `boolean` | sim | literal escalar (valor omitido) |
| 715 | `current` | captureFunctionalReadiness | `{ visibleControls: boolean[]; enabledFormControls: boolean[]; functionalReadinessReached: boolean; }` | sim | chamada snapshot |
| 726 | `styles` | summarizeStyleElements | `{ index: number; nonceState: string; textLength: number; attributeNames: string[]; parentTag: string; obser…` | sim | chamada page.locator("style").evaluateAll |
| 727 | `tracker` | summarizeStyleElements | `{ styleObservedAfterDOMContentLoaded: (style: HTMLStyleElement) => boolean; } \| undefined` | sim | propriedade __safeScriptLifecycleTracker |
| 729 | `style` | summarizeStyleElements | `HTMLStyleElement` | sim | alias element |
| 730 | `currentNonce` | summarizeStyleElements | `string \| undefined` | sim | propriedade nonce |
| 741 | `summary` | summarizeStyleElements | `{ styleElementCount: number; stylesMissingNonce: number; stylesWithDifferentNonce: number; stylesObservedAf…` | sim | objeto/configuração |
| 763 | `configuredFrameLimit` | waitForScriptDomStability | `60` | sim | literal escalar (valor omitido) |
| 764 | `configuredDeadlineMs` | waitForScriptDomStability | `5000` | sim | literal escalar (valor omitido) |
| 765 | `startedAt` | waitForScriptDomStability | `number` | sim | chamada performance.now |
| 766 | `mutationVersion` | waitForScriptDomStability | `number` | sim | literal escalar (valor omitido) |
| 767 | `previousMutationVersion` | waitForScriptDomStability | `number` | sim | PrefixUnaryExpression |
| 768 | `totalMutationCount` | waitForScriptDomStability | `number` | sim | literal escalar (valor omitido) |
| 769 | `relevantMutationCount` | waitForScriptDomStability | `number` | sim | literal escalar (valor omitido) |
| 770 | `lastObservedMutationCategory` | waitForScriptDomStability | `string` | sim | literal string (valor omitido) |
| 771 | `stableFrames` | waitForScriptDomStability | `number` | sim | literal escalar (valor omitido) |
| 772 | `framesObserved` | waitForScriptDomStability | `number` | sim | literal escalar (valor omitido) |
| 773 | `animationFrame` | waitForScriptDomStability | `number` | sim | literal escalar (valor omitido) |
| 774 | `finished` | waitForScriptDomStability | `boolean` | sim | literal escalar (valor omitido) |
| 775 | `state` | waitForScriptDomStability | `Window & { __safeScriptLifecycleTracker?: { loadEventObserved: (script: HTMLScriptElement) => boolean; erro…` | sim | alias window |
| 782 | `lifecycle` | waitForScriptDomStability | `{ loadEventObserved: (script: HTMLScriptElement) => boolean; errorEventObserved: (script: HTMLScriptElement…` | sim | propriedade __safeScriptLifecycleTracker |
| 783 | `supportsModules` | waitForScriptDomStability | `boolean` | sim | expressão in |
| 784 | `containsScript` | waitForScriptDomStability | `(node: Node) => boolean` | sim | função/callback |
| 786 | `observer` | waitForScriptDomStability | `MutationObserver` | sim | instância MutationObserver |
| 787 | `record` | waitForScriptDomStability | `MutationRecord` | não | sem inicializador |
| 789 | `relevant` | waitForScriptDomStability | `boolean` | sim | expressão \|\| |
| 797 | `snapshot` | waitForScriptDomStability | `() => { scripts: HTMLScriptElement[]; pending: HTMLScriptElement[]; }` | sim | função/callback |
| 798 | `scripts` | snapshot | `HTMLScriptElement[]` | sim | chamada Array.from |
| 799 | `pending` | snapshot | `HTMLScriptElement[]` | sim | chamada scripts.filter |
| 805 | `finish` | waitForScriptDomStability | `(stabilityExitReason: string) => void` | sim | função/callback |
| 811 | `scripts` | finish | `{ scripts: HTMLScriptElement[]; pending: HTMLScriptElement[]; }` | sim | chamada snapshot |
| 811 | `pending` | finish | `{ scripts: HTMLScriptElement[]; pending: HTMLScriptElement[]; }` | sim | chamada snapshot |
| 812 | `violations` | finish | `{ effectiveDirective: string; disposition: string; }[]` | sim | expressão ?? |
| 821 | `originCategory` | finish | `string` | sim | literal string (valor omitido) |
| 822 | `knownNextPath` | finish | `boolean` | sim | literal escalar (valor omitido) |
| 823 | `url` | finish | `URL` | sim | instância URL |
| 824 | `resource` | finish | `PerformanceResourceTiming \| undefined` | sim | chamada performance.getEntriesByName(script.src, "resource").at |
| 835 | `deadline` | waitForScriptDomStability | `NodeJS.Timeout` | sim | chamada setTimeout |
| 836 | `sampleFrame` | waitForScriptDomStability | `() => void` | sim | função/callback |
| 838 | `pending` | sampleFrame | `{ scripts: HTMLScriptElement[]; pending: HTMLScriptElement[]; }` | sim | chamada snapshot |
| 859 | `scriptStates` | verifyDocumentScripts | `{ index: number; scriptKind: string; policyRelevant: boolean; emptyInline: boolean; nextDevOverlayContainer…` | sim | chamada page.locator("script").evaluateAll |
| 860 | `classifyType` | verifyDocumentScripts | `(type: string) => "classic-js" \| "module-js" \| "import-map" \| "speculation-rules" \| "non-executable-or-…` | sim | função/callback |
| 861 | `normalized` | classifyType | `string` | sim | chamada type.trim().toLowerCase |
| 862 | `mimeEssence` | classifyType | `string` | sim | expressão ?? |
| 870 | `tracker` | verifyDocumentScripts | `{ mutationObserved: (script: HTMLScriptElement) => boolean; addedAfterDOMContentLoaded: (script: HTMLScript…` | sim | propriedade __safeScriptLifecycleTracker |
| 879 | `documentScripts` | verifyDocumentScripts | `HTMLScriptElement[]` | sim | chamada Array.from |
| 880 | `violations` | verifyDocumentScripts | `{ effectiveDirective: string; disposition: string; blockedScriptIndex: number \| null; resourceCategory: st…` | sim | chamada ((window as Window & { __safeCspViolations?: Array<{ effectiveDirectiv |
| 890 | `script` | verifyDocumentScripts | `HTMLScriptElement` | sim | alias element |
| 891 | `currentNonce` | verifyDocumentScripts | `string` | sim | expressão ?? |
| 892 | `scriptKind` | verifyDocumentScripts | `"classic-js" \| "module-js" \| "import-map" \| "speculation-rules" \| "non-executable-or-other"` | sim | chamada classifyType |
| 893 | `hasSource` | verifyDocumentScripts | `boolean` | sim | chamada script.hasAttribute |
| 894 | `isPolicyRelevant` | verifyDocumentScripts | `boolean` | sim | expressão !== |
| 895 | `origin` | verifyDocumentScripts | `string` | sim | condição derivada |
| 896 | `knownNextPath` | verifyDocumentScripts | `boolean` | sim | literal escalar (valor omitido) |
| 897 | `developmentLike` | verifyDocumentScripts | `boolean` | sim | literal escalar (valor omitido) |
| 898 | `inlineSource` | verifyDocumentScripts | `string` | sim | condição derivada |
| 899 | `nextRuntimeInlineHeuristic` | verifyDocumentScripts | `boolean` | sim | expressão && |
| 900 | `nextIconRelocationPattern` | verifyDocumentScripts | `boolean` | sim | expressão && |
| 907 | `url` | verifyDocumentScripts | `URL` | sim | instância URL |
| 916 | `parentTag` | verifyDocumentScripts | `string` | sim | expressão ?? |
| 917 | `parentHasNextId` | verifyDocumentScripts | `boolean` | sim | chamada Boolean |
| 918 | `parentIdCategory` | verifyDocumentScripts | `"next-root" \| "next-prefixed" \| "other-id" \| "no-id"` | sim | condição derivada |
| 925 | `nonceState` | verifyDocumentScripts | `"missing" \| "matches-document" \| "different"` | sim | condição derivada |
| 926 | `mutationObserved` | verifyDocumentScripts | `boolean` | sim | expressão ?? |
| 927 | `addedAfterDOMContentLoaded` | verifyDocumentScripts | `boolean` | sim | expressão ?? |
| 928 | `loadEventObserved` | verifyDocumentScripts | `boolean` | sim | expressão ?? |
| 929 | `errorEventObserved` | verifyDocumentScripts | `boolean` | sim | expressão ?? |
| 930 | `resourceEntry` | verifyDocumentScripts | `PerformanceResourceTiming \| undefined` | sim | condição derivada |
| 933 | `resourceInitiatorType` | verifyDocumentScripts | `string` | sim | expressão ?? |
| 934 | `scriptSourceViolationCount` | verifyDocumentScripts | `number` | sim | propriedade length |
| 937 | `unmatchedExternalScriptSourceViolation` | verifyDocumentScripts | `boolean` | sim | chamada violations.some |
| 942 | `emptyInline` | verifyDocumentScripts | `boolean` | sim | expressão && |
| 943 | `nextDevOverlayContainer` | verifyDocumentScripts | `boolean` | sim | expressão && |
| 946 | `documentInlineScriptSourceViolationCount` | verifyDocumentScripts | `number` | sim | propriedade length |
| 1001 | `policyRelevantScripts` | verifyDocumentScripts | `{ index: number; scriptKind: string; policyRelevant: boolean; emptyInline: boolean; nextDevOverlayContainer…` | sim | chamada scriptStates.filter |
| 1002 | `nonceReviewRecords` | verifyDocumentScripts | `{ index: number; scriptKind: string; policyRelevant: boolean; emptyInline: boolean; nextDevOverlayContainer…` | sim | chamada policyRelevantScripts.filter |
| 1003 | `summary` | verifyDocumentScripts | `{ scriptElementCount: number; policyRelevantScriptCount: number; inlineScriptCount: number; externalScriptC…` | sim | objeto/configuração |
| 1043 | `events` | captureCspViolations | `{ effectiveDirective: string; violatedDirective: string; disposition: string; blockedResource: string; sour…` | sim | chamada page.evaluate |
| 1045 | `scripts` | captureCspViolations | `HTMLScriptElement[]` | sim | chamada Array.from |
| 1060 | `grouped` | captureCspViolations | `Map<string, { effectiveDirective: string; violatedDirective: string; disposition: string; resourceCategory:…` | sim | instância Map |
| 1061 | `event` | captureCspViolations | `{ effectiveDirective: string; violatedDirective: string; disposition: string; blockedResource: string; sour…` | não | sem inicializador |
| 1062 | `key` | captureCspViolations | `string` | sim | chamada JSON.stringify |
| 1063 | `previous` | captureCspViolations | `{ effectiveDirective: string; violatedDirective: string; disposition: string; resourceCategory: string; sou…` | sim | chamada grouped.get |
| 1077 | `summary` | captureCspViolations | `{ effectiveDirective: string; violatedDirective: string; disposition: string; resourceCategory: string; sou…` | sim | lista |
| 1089 | `scriptSourceViolations` | expectDocumentScripts | `number` | sim | chamada violations .filter((violation) => violation.effectiveDirective.startsW |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 35 | `kind` | `string` | module |
| 35 | `status` | `number` | module |
| 35 | `contentType` | `string \| null` | module |
| 35 | `nosniff` | `string \| null` | module |
| 35 | `cspEnforced` | `boolean` | module |
| 35 | `cspReportOnly` | `boolean` | module |
| 36 | `kind` | `string` | module |
| 36 | `hydrationRelated` | `boolean \| undefined` | module |
| 36 | `cspRelated` | `boolean \| undefined` | module |
| 36 | `resourceType` | `string \| undefined` | module |
| 36 | `origin` | `string \| undefined` | module |
| 36 | `developmentLike` | `boolean \| undefined` | module |
| 41 | `effectiveDirective` | `string` | module |
| 42 | `violatedDirective` | `string` | module |
| 43 | `disposition` | `string` | module |
| 44 | `blockedResource` | `string` | module |
| 45 | `sourceCategory` | `string` | module |
| 46 | `lineNumber` | `number` | module |
| 47 | `columnNumber` | `number` | module |
| 48 | `blockedScriptElement` | `HTMLScriptElement \| null` | module |
| 51 | `__safeCspViolations` | `SafeViolation[] \| undefined` | module |
| 52 | `__safeScriptLifecycleTracker` | `{ mutationObserved: (script: HTMLScriptElement) => boolean; addedAfterDOMContentLoaded: (script: HTMLScript…` | module |
| 53 | `mutationObserved` | `(script: HTMLScriptElement) => boolean` | module |
| 54 | `addedAfterDOMContentLoaded` | `(script: HTMLScriptElement) => boolean` | module |
| 55 | `loadEventObserved` | `(script: HTMLScriptElement) => boolean` | module |
| 56 | `errorEventObserved` | `(script: HTMLScriptElement) => boolean` | module |
| 57 | `styleObservedAfterDOMContentLoaded` | `(style: HTMLStyleElement) => boolean` | module |
| 439 | `directive` | `string` | module |
| 439 | `reportOnly` | `boolean` | module |
| 439 | `violationType` | `string` | module |
| 439 | `resourceCategory` | `string` | module |
| 445 | `contentSecurityPolicyIssueDetails` | `{ violatedDirective?: string; isReportOnly?: boolean; contentSecurityPolicyViolationType?: string; blockedU…` | module |
| 446 | `violatedDirective` | `string \| undefined` | module |
| 447 | `isReportOnly` | `boolean \| undefined` | module |
| 448 | `contentSecurityPolicyViolationType` | `string \| undefined` | module |
| 449 | `blockedURL` | `string \| undefined` | module |
| 490 | `inlineScriptProbe` | `boolean \| undefined` | module |
| 491 | `nonceScriptProbe` | `boolean \| undefined` | module |
| 492 | `evalProbeFinished` | `boolean \| undefined` | module |
| 493 | `externalScriptProbe` | `boolean \| undefined` | module |
| 601 | `method` | `string` | module |
| 602 | `path` | `string` | module |
| 603 | `status` | `number` | module |
| 604 | `contentType` | `string \| null` | module |
| 605 | `redirected` | `boolean` | module |
| 606 | `cspReportOnly` | `boolean` | module |
| 607 | `cspEnforcement` | `boolean` | module |
| 608 | `securityHeaders` | `Record<string, boolean>` | module |
| 612 | `method` | `string` | responseDiagnostics |
| 613 | `path` | `string` | responseDiagnostics |
| 614 | `status` | `number` | responseDiagnostics |
| 615 | `contentType` | `string \| null` | responseDiagnostics |
| 616 | `redirected` | `boolean` | responseDiagnostics |
| 617 | `headers` | `Record<string, string>` | responseDiagnostics |
| 692 | `disposition` | `string` | expectNoEnforcedAppViolations |
| 727 | `__safeScriptLifecycleTracker` | `{ styleObservedAfterDOMContentLoaded: (style: HTMLStyleElement) => boolean; } \| undefined` | summarizeStyleElements |
| 727 | `styleObservedAfterDOMContentLoaded` | `(style: HTMLStyleElement) => boolean` | summarizeStyleElements |
| 754 | `documentReadyState` | `string` | waitForScriptDomStability |
| 754 | `framesObserved` | `number` | waitForScriptDomStability |
| 754 | `configuredFrameLimit` | `number` | waitForScriptDomStability |
| 755 | `elapsedMs` | `number` | waitForScriptDomStability |
| 755 | `configuredDeadlineMs` | `number` | waitForScriptDomStability |
| 755 | `stableForFrames` | `number` | waitForScriptDomStability |
| 756 | `totalMutationCount` | `number` | waitForScriptDomStability |
| 756 | `relevantMutationCount` | `number` | waitForScriptDomStability |
| 756 | `lastObservedMutationCategory` | `string` | waitForScriptDomStability |
| 757 | `pendingExternalScriptCount` | `number` | waitForScriptDomStability |
| 757 | `completionUnobservedScripts` | `Record<string, unknown>[]` | waitForScriptDomStability |
| 758 | `nonApplicableNomoduleScriptCount` | `number` | waitForScriptDomStability |
| 758 | `supportsModules` | `boolean` | waitForScriptDomStability |
| 759 | `observedScriptLoadCount` | `number` | waitForScriptDomStability |
| 759 | `observedScriptErrorCount` | `number` | waitForScriptDomStability |
| 759 | `documentScriptCount` | `number` | waitForScriptDomStability |
| 760 | `scriptSourceViolationCount` | `number` | waitForScriptDomStability |
| 760 | `reportOnlyViolationCount` | `number` | waitForScriptDomStability |
| 760 | `functionalReadinessReached` | `boolean` | waitForScriptDomStability |
| 761 | `timedOutAtFrameLimit` | `boolean` | waitForScriptDomStability |
| 761 | `stabilityExitReason` | `string` | waitForScriptDomStability |
| 776 | `__safeScriptLifecycleTracker` | `{ loadEventObserved: (script: HTMLScriptElement) => boolean; errorEventObserved: (script: HTMLScriptElement…` | waitForScriptDomStability |
| 777 | `loadEventObserved` | `(script: HTMLScriptElement) => boolean` | waitForScriptDomStability |
| 778 | `errorEventObserved` | `(script: HTMLScriptElement) => boolean` | waitForScriptDomStability |
| 780 | `__safeCspViolations` | `{ effectiveDirective: string; disposition: string; }[] \| undefined` | waitForScriptDomStability |
| 780 | `effectiveDirective` | `string` | waitForScriptDomStability |
| 780 | `disposition` | `string` | waitForScriptDomStability |
| 871 | `__safeCspViolations` | `{ effectiveDirective: string; violatedDirective: string; disposition: string; blockedResource: string; sour…` | verifyDocumentScripts |
| 871 | `effectiveDirective` | `string` | verifyDocumentScripts |
| 871 | `violatedDirective` | `string` | verifyDocumentScripts |
| 871 | `disposition` | `string` | verifyDocumentScripts |
| 871 | `blockedResource` | `string` | verifyDocumentScripts |
| 871 | `sourceCategory` | `string` | verifyDocumentScripts |
| 871 | `lineNumber` | `number` | verifyDocumentScripts |
| 871 | `columnNumber` | `number` | verifyDocumentScripts |
| 871 | `blockedScriptElement` | `HTMLScriptElement \| null` | verifyDocumentScripts |
| 872 | `__safeScriptLifecycleTracker` | `{ mutationObserved: (script: HTMLScriptElement) => boolean; addedAfterDOMContentLoaded: (script: HTMLScript…` | verifyDocumentScripts |
| 873 | `mutationObserved` | `(script: HTMLScriptElement) => boolean` | verifyDocumentScripts |
| 874 | `addedAfterDOMContentLoaded` | `(script: HTMLScriptElement) => boolean` | verifyDocumentScripts |
| 875 | `loadEventObserved` | `(script: HTMLScriptElement) => boolean` | verifyDocumentScripts |
| 876 | `errorEventObserved` | `(script: HTMLScriptElement) => boolean` | verifyDocumentScripts |
| 881 | `__safeCspViolations` | `{ effectiveDirective: string; violatedDirective: string; disposition: string; blockedResource: string; sour…` | verifyDocumentScripts |
| 881 | `effectiveDirective` | `string` | verifyDocumentScripts |
| 881 | `violatedDirective` | `string` | verifyDocumentScripts |
| 881 | `disposition` | `string` | verifyDocumentScripts |
| 881 | `blockedResource` | `string` | verifyDocumentScripts |
| 881 | `sourceCategory` | `string` | verifyDocumentScripts |
| 881 | `lineNumber` | `number` | verifyDocumentScripts |
| 881 | `columnNumber` | `number` | verifyDocumentScripts |
| 881 | `blockedScriptElement` | `HTMLScriptElement \| null` | verifyDocumentScripts |
| 1047 | `__safeCspViolations` | `{ effectiveDirective: string; violatedDirective: string; disposition: string; blockedResource: string; sour…` | captureCspViolations |
| 1047 | `effectiveDirective` | `string` | captureCspViolations |
| 1047 | `violatedDirective` | `string` | captureCspViolations |
| 1047 | `disposition` | `string` | captureCspViolations |
| 1047 | `blockedResource` | `string` | captureCspViolations |
| 1047 | `sourceCategory` | `string` | captureCspViolations |
| 1047 | `lineNumber` | `number` | captureCspViolations |
| 1047 | `columnNumber` | `number` | captureCspViolations |
| 1047 | `blockedScriptElement` | `HTMLScriptElement \| null` | captureCspViolations |
| 1060 | `effectiveDirective` | `string` | captureCspViolations |
| 1060 | `violatedDirective` | `string` | captureCspViolations |
| 1060 | `disposition` | `string` | captureCspViolations |
| 1060 | `resourceCategory` | `string` | captureCspViolations |
| 1060 | `sourceCategory` | `string` | captureCspViolations |
| 1060 | `lineNumber` | `number` | captureCspViolations |
| 1060 | `columnNumber` | `number` | captureCspViolations |
| 1060 | `blockedScriptIndex` | `number \| null` | captureCspViolations |
| 1060 | `count` | `number` | captureCspViolations |
| 1087 | `effectiveDirective` | `string` | expectDocumentScripts |
| 1087 | `disposition` | `string` | expectDocumentScripts |
| 1087 | `blockedScriptIndex` | `number \| null` | expectDocumentScripts |
| 1087 | `count` | `number` | expectDocumentScripts |
| 1105 | `kind` | `string` | attachBrowserDiagnostics |
| 1105 | `hydrationRelated` | `boolean \| undefined` | attachBrowserDiagnostics |
| 1105 | `cspRelated` | `boolean \| undefined` | attachBrowserDiagnostics |
| 1105 | `resourceType` | `string \| undefined` | attachBrowserDiagnostics |
| 1105 | `origin` | `string \| undefined` | attachBrowserDiagnostics |
| 1105 | `developmentLike` | `boolean \| undefined` | attachBrowserDiagnostics |

## tests/e2e/team-assignment-transfer.spec.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 9 | `connection` | module | `IsolatedConnectionPair` | não | sem inicializador |
| 10 | `db` | module | `NodePgDatabase<typeof schema>` | não | sem inicializador |
| 11 | `fixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 12 | `clientIds` | module | `string[]` | sim | lista |
| 13 | `dealId` | module | `string` | sim | literal string (valor omitido) |
| 14 | `taskId` | module | `string` | sim | literal string (valor omitido) |
| 15 | `archivedAt` | module | `Date` | não | sem inicializador |
| 19 | `timeout` | waitForRequestResponse | `NodeJS.Timeout \| undefined` | não | sem inicializador |
| 38 | `activeClient` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.clients).values([ { organizationId: fixture.organizat |
| 38 | `archivedClient` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.clients).values([ { organizationId: fixture.organizat |
| 43 | `deal` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.deals).values({ organizationId: fixture.organizationI |
| 51 | `task` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.tasks).values({ organizationId: fixture.organizationI |
| 63 | `errors` | module | `unknown[]` | sim | lista |
| 65 | `error` | module | `unknown` | não | sem inicializador |
| 67 | `userIds` | module | `string[]` | sim | chamada Object.values(fixture.actors).map |
| 68 | `residues` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 82 | `error` | module | `unknown` | não | sem inicializador |
| 87 | `client` | module | `PoolClient` | não | sem inicializador |
| 88 | `error` | module | `unknown` | não | sem inicializador |
| 90 | `poolResults` | module | `[PromiseSettledResult<void>, PromiseSettledResult<void>]` | sim | chamada Promise.allSettled |
| 91 | `result` | module | `PromiseSettledResult<void>` | não | sem inicializador |
| 100 | `identity` | openTeamAs | `{ userId: string; email: string; password: string; memberId: string; }` | sim | acesso indexado |
| 101 | `response` | openTeamAs | `APIResponse<any>` | sim | chamada signInWithRateLimitRetry |
| 110 | `source` | module | `Locator` | sim | chamada page.getByLabel |
| 111 | `destination` | module | `Locator` | sim | chamada page.getByLabel |
| 118 | `reviewButton` | module | `Locator` | sim | chamada page.getByRole |
| 120 | `dialog` | module | `Locator` | sim | chamada page.getByRole |
| 132 | `reopenedDialog` | module | `Locator` | sim | chamada page.getByRole |
| 133 | `confirmButton` | module | `Locator` | sim | chamada reopenedDialog.getByRole |
| 138 | `clients` | module | `{ id: string; ownerUserId: string \| null; deletedAt: Date \| null; }[]` | sim | chamada db.select({ id: schema.clients.id, ownerUserId: schema.clients.ownerUs |
| 153 | `releaseRequest` | module | `() => void` | sim | função/callback |
| 154 | `requestGate` | module | `Promise<void>` | sim | instância Promise |
| 155 | `actionRequestCount` | module | `number` | sim | literal escalar (valor omitido) |
| 156 | `actionRequest` | module | `Request \| undefined` | não | sem inicializador |
| 157 | `actionRequestSeen` | module | `Promise<Request>` | sim | chamada page.waitForRequest |
| 162 | `request` | module | `Request` | sim | chamada route.request |
| 172 | `dialog` | module | `Locator` | sim | chamada page.getByRole |
| 173 | `confirm` | module | `Locator` | sim | chamada dialog.getByRole |
| 176 | `pendingButton` | module | `Locator` | sim | chamada dialog.getByRole |
| 196 | `dialog` | module | `Locator` | sim | chamada page.getByRole |
| 213 | `transferError` | module | `Locator` | sim | chamada page.locator |
| 220 | `role` | module | `"member" \| "admin"` | não | sem inicializador |

## tests/e2e/team-role-rbac.spec.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 9 | `connection` | module | `IsolatedConnectionPair` | não | sem inicializador |
| 10 | `db` | module | `NodePgDatabase<typeof schema>` | não | sem inicializador |
| 11 | `fixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 25 | `identity` | openTeamAs | `{ userId: string; email: string; password: string; memberId: string; }` | sim | acesso indexado |
| 26 | `response` | openTeamAs | `APIResponse<any>` | sim | chamada signInWithRateLimitRetry |
| 36 | `editableActors` | module | `readonly ["admin", "member", "target"]` | sim | lista |
| 37 | `roleControls` | module | `Locator` | sim | chamada page.getByRole |
| 39 | `actor` | module | `"member" \| "admin" \| "target"` | não | sem inicializador |
| 40 | `accessibleName` | module | `string` | sim | TemplateExpression |
| 41 | `roleControl` | module | `Locator` | sim | chamada page.getByRole |
| 47 | `teamRegion` | module | `Locator` | sim | chamada page.getByRole |
| 48 | `targetRow` | module | `Locator` | sim | chamada teamRegion.getByRole("row").filter |
| 51 | `targetRoleControl` | module | `Locator` | sim | chamada targetRow.getByRole |
| 59 | `saveButton` | module | `Locator` | sim | chamada targetRow.getByRole |
| 65 | `roleBadge` | module | `Locator` | sim | chamada targetRow.locator |
| 68 | `persistedMembers` | module | `{ userId: string; role: string; }[]` | sim | chamada db.select({ userId: schema.member.userId, role: schema.member.role }) |
| 71 | `expectedRoles` | module | `Map<string, string>` | sim | instância Map |
| 78 | `person` | module | `{ userId: string; role: string; }` | não | sem inicializador |
| 79 | `roleAudit` | module | `{ organizationId: string; actorUserId: string; action: string; entityType: string; entityId: string; detail…` | sim | chamada db.select({ organizationId: schema.auditLogs.organizationId, actorUser |
| 99 | `role` | module | `"member" \| "admin"` | não | sem inicializador |

## tests/e2e/ux-visual-audit.spec.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 13 | `viewports` | module | `readonly [{ readonly width: 1440; readonly height: 900; }, { readonly width: 768; readonly height: 900; }, …` | sim | lista |
| 20 | `shellLinks` | module | `string[]` | sim | lista |
| 27 | `connection` | module | `IsolatedConnectionPair \| undefined` | não | sem inicializador |
| 28 | `db` | module | `NodePgDatabase<typeof schema> \| undefined` | não | sem inicializador |
| 29 | `fixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 30 | `companyClientId` | module | `string` | sim | literal string (valor omitido) |
| 31 | `openDealId` | module | `string` | sim | literal string (valor omitido) |
| 32 | `dealTitle` | module | `string` | sim | literal string (valor omitido) |
| 33 | `clientTitle` | module | `string` | sim | literal string (valor omitido) |
| 34 | `routes` | module | `AuditRoute[]` | sim | lista |
| 36 | `evidenceDirectory` | module | `string` | sim | chamada join |
| 44 | `suffix` | module | `string` | sim | chamada randomUUID().slice |
| 46 | `seededClients` | module | `{ id: string; kind: "person" \| "company"; }[]` | sim | chamada db.insert(schema.clients).values([ { organizationId: fixture.organizat |
| 67 | `company` | module | `{ id: string; kind: "person" \| "company"; } \| undefined` | sim | chamada seededClients.find |
| 80 | `dueDate` | module | `string` | sim | chamada new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice |
| 81 | `dealDefinitions` | module | `readonly [{ readonly stage: "new_lead"; readonly title: `UX Visual Lead ${string}`; readonly amount: "1200.…` | sim | lista |
| 89 | `dealRows` | module | `{ id: string; stage: "new_lead" \| "qualification" \| "proposal" \| "negotiation" \| "won" \| "lost"; title…` | sim | chamada db.insert(schema.deals).values(dealDefinitions.map((deal) => ({ ...dea |
| 95 | `openDeal` | module | `{ id: string; stage: "new_lead" \| "qualification" \| "proposal" \| "negotiation" \| "won" \| "lost"; title…` | sim | chamada dealRows.find |
| 100 | `now` | module | `number` | sim | chamada Date.now |
| 168 | `errors` | module | `unknown[]` | sim | lista |
| 171 | `error` | module | `unknown` | não | sem inicializador |
| 174 | `userIds` | module | `string[]` | sim | chamada Object.values(fixture.actors).map |
| 175 | `residues` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 189 | `error` | module | `unknown` | não | sem inicializador |
| 201 | `layoutEvidence` | module | `Record<string, unknown>[]` | sim | lista |
| 202 | `viewport` | module | `{ readonly width: 1440; readonly height: 900; } \| { readonly width: 768; readonly height: 900; } \| { read…` | não | sem inicializador |
| 210 | `layout` | module | `{ documentWidth: number; viewportWidth: number; bodyWidth: number; documentElement: { tagName: string; id: …` | sim | chamada measureLayout |
| 230 | `layoutEvidence` | module | `Record<string, unknown>[]` | sim | lista |
| 231 | `route` | module | `AuditRoute` | não | sem inicializador |
| 232 | `viewport` | module | `{ readonly width: 1440; readonly height: 900; } \| { readonly width: 768; readonly height: 900; } \| { read…` | não | sem inicializador |
| 239 | `control` | module | `ControlCheck` | não | sem inicializador |
| 240 | `scope` | module | `Page \| Locator` | sim | condição derivada |
| 243 | `locator` | module | `Locator` | sim | chamada scope.getByRole |
| 251 | `name` | module | `string` | não | sem inicializador |
| 256 | `brandName` | module | `"rota ." \| "rota . CRM COMERCIAL"` | sim | condição derivada |
| 257 | `brand` | module | `Locator` | sim | chamada page.getByRole |
| 262 | `layout` | module | `{ documentWidth: number; viewportWidth: number; bodyWidth: number; documentElement: { tagName: string; id: …` | sim | chamada measureLayout |
| 264 | `overflowDiagnostics` | module | `{ finalRestoration: { viewportWidth: number; htmlClientWidth: number; htmlScrollWidth: number; bodyClientWi…` | sim | chamada diagnoseDocumentOverflow |
| 271 | `tableRestorations` | module | `({ selector: string; present: boolean; before?: undefined; during?: undefined; internalScroll?: undefined; …` | sim | chamada [ overflowDiagnostics.tableIsolation, ...Object.values(overflowDiagnos |
| 275 | `experiment` | module | `{ selector: string; present: boolean; before?: undefined; during?: undefined; internalScroll?: undefined; a…` | não | sem inicializador |
| 276 | `restoration` | module | `{ originalStyles: { present: boolean; value: string \| null; }[]; stylesAfter: { present: boolean; value: s…` | sim | condição derivada |
| 286 | `isolation` | module | `{ selector: string; present: boolean; stages: Array<Record<string, unknown>>; }` | não | sem inicializador |
| 287 | `restoredStage` | module | `Record<string, unknown> \| undefined` | sim | chamada isolation.stages.find |
| 294 | `check` | module | `[string, boolean]` | não | sem inicializador |
| 294 | `passed` | module | `[string, boolean]` | não | sem inicializador |
| 302 | `screenshotPath` | module | `string` | sim | chamada join |
| 307 | `board` | module | `Locator` | sim | chamada page.locator |
| 308 | `boardMetrics` | module | `{ clientWidth: number; scrollWidth: number; }` | sim | chamada board.evaluate |
| 325 | `tables` | module | `Locator` | sim | chamada page.getByRole |
| 326 | `expectedTableCount` | module | `1 \| 2` | sim | condição derivada |
| 328 | `table` | module | `Locator` | não | sem inicializador |
| 335 | `tableContainers` | module | `{ className: string; accessibleName: string \| null; left: number; right: number; width: number; clientWidt…` | sim | chamada page.locator(".table-wrap").evaluateAll |
| 336 | `rect` | module | `DOMRect` | sim | chamada element.getBoundingClientRect |
| 337 | `style` | module | `CSSStyleDeclaration` | sim | chamada getComputedStyle |
| 361 | `captures` | module | `Record<string, unknown>[]` | sim | lista |
| 363 | `width` | module | `number` | não | sem inicializador |
| 364 | `mode` | module | `"with-contain" \| "without-contain"` | não | sem inicializador |
| 371 | `capture` | module | `Record<string, unknown>` | não | sem inicializador |
| 372 | `mode` | module | `string` | sim | chamada String |
| 373 | `width` | module | `number` | sim | chamada Number |
| 374 | `links` | module | `{ index: number; forward: { afterFrame: FocusMeasurement; }; reverse?: { afterFrame: FocusMeasurement; }; }[]` | sim | propriedade links |
| 382 | `initial` | module | `{ scrollLeft: number; overflowX: string; clientWidth: number; scrollWidth: number; }` | sim | propriedade initial |
| 388 | `link` | module | `{ index: number; forward: { afterFrame: FocusMeasurement; }; reverse?: { afterFrame: FocusMeasurement; }; }` | não | sem inicializador |
| 389 | `direction` | module | `{ afterFrame: FocusMeasurement; }` | não | sem inicializador |
| 416 | `axeRoutes` | module | `{ key: string; navigationName: string; heading: string; }[]` | sim | lista |
| 426 | `findings` | module | `Record<string, unknown>[]` | sim | lista |
| 427 | `scanSummary` | module | `{ page: string; theme: Theme; width: number; violations: number; }[]` | sim | lista |
| 429 | `width` | module | `number` | não | sem inicializador |
| 431 | `theme` | module | `"light" \| "dark"` | não | sem inicializador |
| 446 | `route` | module | `{ key: string; navigationName: string; heading: string; }` | não | sem inicializador |
| 451 | `results` | module | `axe.AxeResults` | sim | chamada new AxeBuilder({ page }).analyze |
| 453 | `violation` | module | `axe.Result` | não | sem inicializador |
| 470 | `reportPath` | module | `string` | sim | chamada join |
| 484 | `skipLink` | module | `Locator` | sim | chamada page.getByRole |
| 487 | `focusOutlineWidth` | module | `number` | sim | chamada skipLink.evaluate |
| 491 | `brand` | module | `Locator` | sim | chamada page.getByRole |
| 494 | `workspaceSwitcher` | module | `Locator` | sim | chamada page.locator |
| 499 | `workspaceOutlineWidth` | module | `number` | sim | chamada workspaceSwitcher.evaluate |
| 502 | `transitionDurationMs` | module | `number` | sim | chamada page.getByRole("link", { name: "Nova oportunidade" }).evaluate |
| 503 | `seconds` | module | `number[]` | sim | chamada getComputedStyle(element).transitionDuration.split(",").map |
| 508 | `mainNavLinks` | module | `Locator` | sim | chamada page.getByRole("navigation", { name: "Navegação principal" }).getByRol |
| 513 | `index` | module | `number` | sim | literal escalar (valor omitido) |
| 522 | `index` | module | `number` | sim | literal escalar (valor omitido) |
| 537 | `identity` | signInAsOwner | `{ userId: string; email: string; password: string; memberId: string; }` | sim | propriedade owner |
| 538 | `response` | signInAsOwner | `APIResponse<any>` | sim | chamada signInWithRateLimitRetry |
| 544 | `documentWidth` | measureLayout | `number` | sim | propriedade scrollWidth |
| 545 | `viewportWidth` | measureLayout | `number` | sim | propriedade clientWidth |
| 546 | `describe` | measureLayout | `(element: HTMLElement) => { tagName: string; id: string; className: string; accessibleName: string \| null;…` | sim | função/callback |
| 547 | `rect` | describe | `DOMRect` | sim | chamada element.getBoundingClientRect |
| 548 | `style` | describe | `CSSStyleDeclaration` | sim | chamada getComputedStyle |
| 567 | `scrollAreas` | measureLayout | `{ hasInternalHorizontalScroll: boolean; content: { tagName: string; id: string; className: string; accessib…` | sim | chamada Array.from(document.querySelectorAll<HTMLElement>(".board-scroll, .tab |
| 572 | `overflowCandidates` | measureLayout | `{ left: number; right: number; width: number; outsideLeft: boolean; outsideRight: boolean; ancestorChain: {…` | sim | chamada Array.from(document.body.querySelectorAll<HTMLElement>("*")) .flatMap( |
| 574 | `rect` | measureLayout | `DOMRect` | sim | chamada element.getBoundingClientRect |
| 576 | `ancestors` | measureLayout | `HTMLElement[]` | sim | lista |
| 577 | `clippingAncestor` | measureLayout | `HTMLElement \| null` | sim | null |
| 578 | `ancestor` | measureLayout | `HTMLElement \| null` | sim | propriedade parentElement |
| 579 | `ancestorStyle` | measureLayout | `CSSStyleDeclaration` | sim | chamada getComputedStyle |
| 585 | `ancestorRect` | measureLayout | `DOMRect` | sim | chamada ancestor.getBoundingClientRect |
| 600 | `bodyChildren` | measureLayout | `{ tagName: string; id: string; className: string; accessibleName: string \| null; left: number; right: numb…` | sim | chamada Array.from(document.body.children).map |
| 601 | `rootPseudoElements` | measureLayout | `{ selector: string; content: string; width: string; minWidth: string; maxWidth: string; display: string; po…` | sim | chamada ["html", "body"].flatMap |
| 602 | `style` | measureLayout | `CSSStyleDeclaration` | sim | chamada getComputedStyle |
| 622 | `html` | diagnoseDocumentOverflow | `HTMLElement` | sim | propriedade documentElement |
| 623 | `originalX` | diagnoseDocumentOverflow | `number` | sim | propriedade scrollX |
| 624 | `originalY` | diagnoseDocumentOverflow | `number` | sim | propriedade scrollY |
| 626 | `nextFrame` | diagnoseDocumentOverflow | `() => Promise<void>` | sim | função/callback |
| 627 | `readMetrics` | diagnoseDocumentOverflow | `() => { viewportWidth: number; htmlClientWidth: number; htmlScrollWidth: number; bodyClientWidth: number; b…` | sim | função/callback |
| 637 | `snapshotStyle` | diagnoseDocumentOverflow | `(element: HTMLElement) => { present: boolean; value: string \| null; }` | sim | função/callback |
| 641 | `createTemporaryRule` | diagnoseDocumentOverflow | `(selector: string, changes: Array<{ property: string; value: string; priority?: string; }>) => HTMLStyleEle…` | sim | função/callback |
| 642 | `styleElement` | createTemporaryRule | `HTMLStyleElement` | sim | chamada document.createElement |
| 648 | `runStyleExperiment` | diagnoseDocumentOverflow | `(selector: string, changes: Array<{ property: string; value: string; priority?: string; }>, testInternalScr…` | sim | função/callback |
| 653 | `element` | runStyleExperiment | `HTMLElement \| null` | sim | chamada document.querySelector |
| 655 | `originalNodes` | runStyleExperiment | `HTMLElement[]` | sim | lista |
| 656 | `originalStyles` | runStyleExperiment | `{ present: boolean; value: string \| null; }[]` | sim | chamada originalNodes.map |
| 657 | `originalScrollLeft` | runStyleExperiment | `number` | sim | propriedade scrollLeft |
| 658 | `before` | runStyleExperiment | `{ viewportWidth: number; htmlClientWidth: number; htmlScrollWidth: number; bodyClientWidth: number; bodyScr…` | sim | chamada readMetrics |
| 659 | `originalMarkup` | runStyleExperiment | `string` | sim | propriedade innerHTML |
| 660 | `tableStructureBefore` | runStyleExperiment | `{ tableCount: number; rowCount: number; cellCount: number; linkCount: number; }` | sim | objeto/configuração |
| 666 | `during` | runStyleExperiment | `Record<string, unknown>` | sim | objeto/configuração |
| 667 | `internalScroll` | runStyleExperiment | `Record<string, unknown> \| null` | sim | null |
| 668 | `thrown` | runStyleExperiment | `string \| null` | sim | null |
| 669 | `styleElement` | runStyleExperiment | `HTMLStyleElement \| undefined` | não | sem inicializador |
| 673 | `style` | runStyleExperiment | `CSSStyleDeclaration` | sim | chamada getComputedStyle |
| 696 | `maxScrollLeft` | runStyleExperiment | `number` | sim | chamada Math.max |
| 706 | `error` | runStyleExperiment | `unknown` | não | sem inicializador |
| 713 | `stylesAfter` | runStyleExperiment | `{ present: boolean; value: string \| null; }[]` | sim | chamada originalNodes.map |
| 714 | `structureAfter` | runStyleExperiment | `{ tableCount: number; rowCount: number; cellCount: number; linkCount: number; }` | sim | objeto/configuração |
| 720 | `restoration` | runStyleExperiment | `{ originalStyles: { present: boolean; value: string \| null; }[]; stylesAfter: { present: boolean; value: s…` | sim | objeto/configuração |
| 734 | `beforeScroll` | diagnoseDocumentOverflow | `{ viewportWidth: number; htmlClientWidth: number; htmlScrollWidth: number; bodyClientWidth: number; bodyScr…` | sim | chamada readMetrics |
| 735 | `afterScrollAttempt` | diagnoseDocumentOverflow | `{ viewportWidth: number; htmlClientWidth: number; htmlScrollWidth: number; bodyClientWidth: number; bodyScr…` | sim | alias beforeScroll |
| 736 | `afterScrollRestore` | diagnoseDocumentOverflow | `{ viewportWidth: number; htmlClientWidth: number; htmlScrollWidth: number; bodyClientWidth: number; bodyScr…` | sim | alias beforeScroll |
| 747 | `originalTableWrap` | diagnoseDocumentOverflow | `HTMLElement \| null` | sim | chamada document.querySelector |
| 748 | `originalTableNodes` | diagnoseDocumentOverflow | `HTMLElement[]` | sim | condição derivada |
| 751 | `originalTableStyles` | diagnoseDocumentOverflow | `{ present: boolean; value: string \| null; }[]` | sim | chamada originalTableNodes.map |
| 752 | `originalTableMarkup` | diagnoseDocumentOverflow | `string \| null` | sim | expressão ?? |
| 753 | `originalTableScrollLeft` | diagnoseDocumentOverflow | `number` | sim | expressão ?? |
| 754 | `originalDiagnosticStyleCount` | diagnoseDocumentOverflow | `number` | sim | propriedade length |
| 755 | `tableIsolation` | diagnoseDocumentOverflow | `{ selector: string; present: boolean; before?: undefined; during?: undefined; internalScroll?: undefined; a…` | sim | chamada runStyleExperiment |
| 756 | `tableExperiments` | diagnoseDocumentOverflow | `{ hideTable: { selector: string; present: boolean; before?: undefined; during?: undefined; internalScroll?:…` | sim | objeto/configuração |
| 765 | `tableWrap` | diagnoseDocumentOverflow | `HTMLElement \| null` | sim | chamada document.querySelector |
| 766 | `table` | diagnoseDocumentOverflow | `HTMLElement \| null` | sim | chamada document.querySelector |
| 767 | `tableWrapRect` | diagnoseDocumentOverflow | `DOMRect \| undefined` | sim | chamada tableWrap?.getBoundingClientRect |
| 768 | `tableDescendants` | diagnoseDocumentOverflow | `{ tagName: string; id: string; className: string; text: string; left: number; right: number; width: number;…` | sim | condição derivada |
| 771 | `rect` | diagnoseDocumentOverflow | `DOMRect` | sim | chamada element.getBoundingClientRect |
| 772 | `style` | diagnoseDocumentOverflow | `CSSStyleDeclaration` | sim | chamada getComputedStyle |
| 773 | `outsideWrap` | diagnoseDocumentOverflow | `boolean` | sim | expressão \|\| |
| 775 | `ancestorChain` | diagnoseDocumentOverflow | `Record<string, unknown>[]` | sim | lista |
| 776 | `ancestor` | diagnoseDocumentOverflow | `HTMLElement \| null` | sim | propriedade parentElement |
| 777 | `ancestorStyle` | diagnoseDocumentOverflow | `CSSStyleDeclaration` | sim | chamada getComputedStyle |
| 778 | `ancestorRect` | diagnoseDocumentOverflow | `DOMRect` | sim | chamada ancestor.getBoundingClientRect |
| 822 | `tablePseudoElements` | diagnoseDocumentOverflow | `{ selector: string; content: string; width: string; minWidth: string; position: string; left: string; right…` | sim | condição derivada |
| 825 | `style` | diagnoseDocumentOverflow | `CSSStyleDeclaration` | sim | chamada getComputedStyle |
| 840 | `isolateChildren` | diagnoseDocumentOverflow | `(selector: string) => Promise<{ selector: string; present: boolean; stages: Array<Record<string, unknown>>; }>` | sim | função/callback |
| 841 | `container` | isolateChildren | `HTMLElement \| null` | sim | chamada document.querySelector |
| 843 | `children` | isolateChildren | `HTMLElement[]` | sim | chamada Array.from(container.children).filter |
| 844 | `originalNodes` | isolateChildren | `HTMLElement[]` | sim | chamada children.flatMap |
| 845 | `originalStyles` | isolateChildren | `{ present: boolean; value: string \| null; }[]` | sim | chamada originalNodes.map |
| 846 | `stages` | isolateChildren | `Record<string, unknown>[]` | sim | lista |
| 847 | `styleElement` | isolateChildren | `HTMLStyleElement \| undefined` | não | sem inicializador |
| 849 | `index` | isolateChildren | `[number, HTMLElement]` | não | sem inicializador |
| 849 | `child` | isolateChildren | `[number, HTMLElement]` | não | sem inicializador |
| 850 | `rect` | isolateChildren | `DOMRect` | sim | chamada child.getBoundingClientRect |
| 851 | `style` | isolateChildren | `CSSStyleDeclaration` | sim | chamada getComputedStyle |
| 852 | `hiddenSelectors` | isolateChildren | `string[]` | sim | chamada children.slice(0, index + 1).map |
| 853 | `temporarySelector` | isolateChildren | `string` | sim | chamada hiddenSelectors.join |
| 876 | `stylesAfter` | isolateChildren | `{ present: boolean; value: string \| null; }[]` | sim | chamada originalNodes.map |
| 877 | `allOriginalStylesRestored` | isolateChildren | `boolean` | sim | chamada originalStyles.every |
| 887 | `progressiveMainIsolation` | diagnoseDocumentOverflow | `{ selector: string; present: boolean; stages: Array<Record<string, unknown>>; }` | sim | chamada isolateChildren |
| 888 | `shellIsolation` | diagnoseDocumentOverflow | `{ appFrame: { selector: string; present: boolean; stages: Array<Record<string, unknown>>; }; mainColumn: { …` | sim | objeto/configuração |
| 892 | `currentTableNodes` | diagnoseDocumentOverflow | `HTMLElement[]` | sim | condição derivada |
| 895 | `currentTableStyles` | diagnoseDocumentOverflow | `{ present: boolean; value: string \| null; }[]` | sim | chamada currentTableNodes.map |
| 896 | `finalDOMRestoration` | diagnoseDocumentOverflow | `{ tableNodesUnchanged: boolean; tableStyleAttributesUnchanged: boolean; tableMarkupUnchanged: boolean; tabl…` | sim | objeto/configuração |
| 905 | `viewportWidth` | diagnoseDocumentOverflow | `number` | sim | propriedade clientWidth |
| 906 | `elementCandidates` | diagnoseDocumentOverflow | `{ tagName: string; id: string; className: string; text: string; left: number; right: number; width: number;…` | sim | chamada Array.from(document.body.querySelectorAll<HTMLElement>("*")) .map((ele |
| 908 | `rect` | diagnoseDocumentOverflow | `DOMRect` | sim | chamada element.getBoundingClientRect |
| 909 | `style` | diagnoseDocumentOverflow | `CSSStyleDeclaration` | sim | chamada getComputedStyle |
| 910 | `ancestorChain` | diagnoseDocumentOverflow | `Record<string, unknown>[]` | sim | lista |
| 911 | `scrollableAncestor` | diagnoseDocumentOverflow | `HTMLElement \| null` | sim | null |
| 912 | `ancestor` | diagnoseDocumentOverflow | `HTMLElement \| null` | sim | propriedade parentElement |
| 913 | `ancestorStyle` | diagnoseDocumentOverflow | `CSSStyleDeclaration` | sim | chamada getComputedStyle |
| 930 | `outsideViewport` | diagnoseDocumentOverflow | `boolean` | sim | expressão \|\| |
| 931 | `hasOwnOverflow` | diagnoseDocumentOverflow | `boolean` | sim | expressão > |
| 932 | `insideScrollableAncestor` | diagnoseDocumentOverflow | `boolean` | sim | chamada Boolean |
| 965 | `pseudoElements` | diagnoseDocumentOverflow | `{ selector: string; content: string; width: string; minWidth: string; position: string; left: string; right…` | sim | chamada Array.from(document.querySelectorAll<HTMLElement>("body, body *")) .fl |
| 967 | `style` | diagnoseDocumentOverflow | `CSSStyleDeclaration` | sim | chamada getComputedStyle |
| 968 | `rect` | diagnoseDocumentOverflow | `DOMRect` | sim | chamada element.getBoundingClientRect |
| 983 | `result` | diagnoseDocumentOverflow | `{ route: "clients" \| "tasks"; beforeScroll: { viewportWidth: number; htmlClientWidth: number; htmlScrollWi…` | sim | objeto/configuração |
| 1000 | `hiddenWidth` | diagnoseDocumentOverflow | `number \| undefined` | sim | propriedade htmlScrollWidth |
| 1039 | `page` | runIsolatedClientKeyboardPass | `Page` | sim | chamada context.newPage |
| 1041 | `temporaryOverride` | runIsolatedClientKeyboardPass | `ElementHandle<Node> \| undefined` | não | sem inicializador |
| 1042 | `initialState` | runIsolatedClientKeyboardPass | `{ scrollLeft: number; htmlScrollWidth: number; windowScrollX: number; windowScrollY: number; styleAttribute…` | não | sem inicializador |
| 1043 | `result` | runIsolatedClientKeyboardPass | `Record<string, unknown>` | sim | objeto/configuração |
| 1049 | `wrapper` | runIsolatedClientKeyboardPass | `Locator` | sim | chamada page.locator |
| 1055 | `links` | runIsolatedClientKeyboardPass | `Locator[]` | sim | chamada page.getByRole("table").getByRole("link").all |
| 1056 | `search` | runIsolatedClientKeyboardPass | `Locator` | sim | chamada page.getByRole |
| 1057 | `status` | runIsolatedClientKeyboardPass | `Locator` | sim | chamada page.getByRole |
| 1058 | `filterButton` | runIsolatedClientKeyboardPass | `Locator` | sim | chamada page.getByRole |
| 1074 | `initial` | runIsolatedClientKeyboardPass | `{ scrollLeft: number; htmlScrollWidth: number; windowScrollX: number; windowScrollY: number; styleAttribute…` | sim | alias initialState |
| 1076 | `startScrollLeft` | runIsolatedClientKeyboardPass | `number` | sim | chamada wrapper.evaluate |
| 1078 | `keyboardOrder` | runIsolatedClientKeyboardPass | `Record<string, unknown>[]` | sim | lista |
| 1079 | `searchReached` | runIsolatedClientKeyboardPass | `boolean` | sim | literal escalar (valor omitido) |
| 1080 | `index` | runIsolatedClientKeyboardPass | `number` | sim | literal escalar (valor omitido) |
| 1082 | `active` | runIsolatedClientKeyboardPass | `{ tagName: string; role: string \| null; accessibleName: string; className: string; } \| null` | sim | chamada page.evaluate |
| 1083 | `element` | runIsolatedClientKeyboardPass | `Element \| null` | sim | propriedade activeElement |
| 1100 | `statusFocused` | runIsolatedClientKeyboardPass | `boolean` | sim | chamada status.evaluate |
| 1102 | `filterFocused` | runIsolatedClientKeyboardPass | `boolean` | sim | chamada filterButton.evaluate |
| 1104 | `measure` | runIsolatedClientKeyboardPass | `(link: Locator, method: string) => Promise<FocusMeasurement>` | sim | função/callback |
| 1105 | `scrollport` | measure | `HTMLElement \| null` | sim | chamada element.closest |
| 1107 | `rect` | measure | `DOMRect` | sim | chamada element.getBoundingClientRect |
| 1108 | `portRect` | measure | `DOMRect` | sim | chamada scrollport.getBoundingClientRect |
| 1109 | `portLeft` | measure | `number` | sim | expressão + |
| 1110 | `portRight` | measure | `number` | sim | expressão + |
| 1111 | `style` | measure | `CSSStyleDeclaration` | sim | chamada getComputedStyle |
| 1112 | `outlineWidth` | measure | `number` | sim | expressão \|\| |
| 1113 | `outlineOffset` | measure | `number` | sim | expressão \|\| |
| 1114 | `outlineBleed` | measure | `number` | sim | chamada Math.max |
| 1115 | `visibleLeft` | measure | `number` | sim | chamada Math.max |
| 1116 | `visibleRight` | measure | `number` | sim | chamada Math.min |
| 1117 | `visibleWidth` | measure | `number` | sim | chamada Math.max |
| 1118 | `row` | measure | `HTMLTableRowElement \| null` | sim | chamada element.closest |
| 1119 | `cell` | measure | `Element \| null` | sim | chamada element.closest |
| 1149 | `focusLink` | runIsolatedClientKeyboardPass | `(index: number, link: Locator, direction: "forward" \| "reverse") => Promise<FocusStep>` | sim | função/callback |
| 1150 | `scrollLeftBeforeFocus` | focusLink | `number` | sim | chamada wrapper.evaluate |
| 1152 | `immediate` | focusLink | `FocusMeasurement` | sim | chamada measure |
| 1154 | `afterFrame` | focusLink | `FocusMeasurement` | sim | chamada measure |
| 1155 | `resultForLink` | focusLink | `{ index: number; direction: "reverse" \| "forward"; scrollLeftBeforeFocus: number; scrollLeftImmediatelyAft…` | sim | objeto/configuração |
| 1156 | `focusIssue` | focusLink | `(measurement: FocusMeasurement) => boolean` | sim | função/callback |
| 1158 | `filename` | focusLink | `string` | sim | TemplateExpression |
| 1159 | `screenshotPath` | focusLink | `string` | sim | chamada join |
| 1166 | `forward` | runIsolatedClientKeyboardPass | `FocusStep[]` | sim | lista |
| 1167 | `index` | runIsolatedClientKeyboardPass | `[number, Locator]` | não | sem inicializador |
| 1167 | `link` | runIsolatedClientKeyboardPass | `[number, Locator]` | não | sem inicializador |
| 1168 | `reverse` | runIsolatedClientKeyboardPass | `FocusStep[]` | sim | lista |
| 1169 | `index` | runIsolatedClientKeyboardPass | `number` | sim | expressão - |
| 1171 | `returnToFilterButtonFocused` | runIsolatedClientKeyboardPass | `boolean` | sim | chamada filterButton.evaluate |
| 1193 | `restored` | runIsolatedClientKeyboardPass | `{ scrollLeft: number; styleAttributePresent: boolean; styleAttribute: string \| null; contain: string; link…` | sim | chamada page.locator(".client-list-table-wrap").evaluate((element) => ({ scrol |
| 1204 | `before` | runIsolatedClientKeyboardPass | `{ scrollLeft: number; htmlScrollWidth: number; windowScrollX: number; windowScrollY: number; styleAttribute…` | sim | alias initialState |
| 1205 | `finalWindowPosition` | runIsolatedClientKeyboardPass | `{ x: number; y: number; } \| { x: number; y: number; }` | sim | chamada page.evaluate(() => ({ x: window.scrollX, y: window.scrollY })).catch |
| 1222 | `diagnostics` | runIsolatedClientKeyboardPass | `Record<string, unknown>` | sim | alias result |
| 1223 | `initial` | runIsolatedClientKeyboardPass | `{ contain: string; htmlScrollWidth: number; } \| undefined` | sim | propriedade initial |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 23 | `role` | `AccessibleRole` | module |
| 23 | `name` | `string` | module |
| 23 | `enabled` | `boolean \| undefined` | module |
| 23 | `withinRowText` | `string \| undefined` | module |
| 24 | `key` | `string` | module |
| 24 | `path` | `string` | module |
| 24 | `heading` | `string` | module |
| 24 | `controls` | `ControlCheck[]` | module |
| 375 | `index` | `number` | module |
| 376 | `forward` | `{ afterFrame: FocusMeasurement; }` | module |
| 376 | `afterFrame` | `FocusMeasurement` | module |
| 377 | `reverse` | `{ afterFrame: FocusMeasurement; } \| undefined` | module |
| 377 | `afterFrame` | `FocusMeasurement` | module |
| 382 | `scrollLeft` | `number` | module |
| 382 | `overflowX` | `string` | module |
| 382 | `clientWidth` | `number` | module |
| 382 | `scrollWidth` | `number` | module |
| 427 | `page` | `string` | module |
| 427 | `theme` | `Theme` | module |
| 427 | `width` | `number` | module |
| 427 | `violations` | `number` | module |
| 641 | `property` | `string` | createTemporaryRule |
| 641 | `value` | `string` | createTemporaryRule |
| 641 | `priority` | `string \| undefined` | createTemporaryRule |
| 650 | `property` | `string` | runStyleExperiment |
| 650 | `value` | `string` | runStyleExperiment |
| 650 | `priority` | `string \| undefined` | runStyleExperiment |
| 1000 | `metrics` | `{ htmlScrollWidth?: number; } \| undefined` | diagnoseDocumentOverflow |
| 1000 | `htmlScrollWidth` | `number \| undefined` | diagnoseDocumentOverflow |
| 1013 | `method` | `string` | module |
| 1014 | `accessibleName` | `string` | module |
| 1015 | `href` | `string` | module |
| 1016 | `isActiveElement` | `boolean` | module |
| 1017 | `rowIndex` | `number` | module |
| 1018 | `cellIndex` | `number` | module |
| 1019 | `linkRect` | `{ left: number; right: number; top: number; bottom: number; width: number; height: number; }` | module |
| 1019 | `left` | `number` | module |
| 1019 | `right` | `number` | module |
| 1019 | `top` | `number` | module |
| 1019 | `bottom` | `number` | module |
| 1019 | `width` | `number` | module |
| 1019 | `height` | `number` | module |
| 1020 | `scrollport` | `{ left: number; right: number; width: number; clientWidth: number; scrollWidth: number; scrollLeft: number; }` | module |
| 1020 | `left` | `number` | module |
| 1020 | `right` | `number` | module |
| 1020 | `width` | `number` | module |
| 1020 | `clientWidth` | `number` | module |
| 1020 | `scrollWidth` | `number` | module |
| 1020 | `scrollLeft` | `number` | module |
| 1021 | `outlineWidth` | `string` | module |
| 1022 | `outlineOffset` | `string` | module |
| 1023 | `outlineStyle` | `string` | module |
| 1024 | `visibleIntersection` | `{ left: number; right: number; width: number; ratio: number; }` | module |
| 1024 | `left` | `number` | module |
| 1024 | `right` | `number` | module |
| 1024 | `width` | `number` | module |
| 1024 | `ratio` | `number` | module |
| 1025 | `outlineWithinScrollport` | `boolean` | module |
| 1028 | `index` | `number` | module |
| 1029 | `direction` | `"reverse" \| "forward"` | module |
| 1030 | `scrollLeftBeforeFocus` | `number` | module |
| 1031 | `scrollLeftImmediatelyAfterFocus` | `number` | module |
| 1032 | `scrollLeftAfterFrame` | `number` | module |
| 1033 | `immediate` | `FocusMeasurement` | module |
| 1034 | `afterFrame` | `FocusMeasurement` | module |
| 1035 | `screenshot` | `string \| undefined` | module |
| 1042 | `scrollLeft` | `number` | runIsolatedClientKeyboardPass |
| 1042 | `htmlScrollWidth` | `number` | runIsolatedClientKeyboardPass |
| 1042 | `windowScrollX` | `number` | runIsolatedClientKeyboardPass |
| 1042 | `windowScrollY` | `number` | runIsolatedClientKeyboardPass |
| 1042 | `styleAttributePresent` | `boolean` | runIsolatedClientKeyboardPass |
| 1042 | `styleAttribute` | `string \| null` | runIsolatedClientKeyboardPass |
| 1042 | `contain` | `string` | runIsolatedClientKeyboardPass |
| 1042 | `overflowX` | `string` | runIsolatedClientKeyboardPass |
| 1042 | `clientWidth` | `number` | runIsolatedClientKeyboardPass |
| 1042 | `scrollWidth` | `number` | runIsolatedClientKeyboardPass |
| 1042 | `rowCount` | `number` | runIsolatedClientKeyboardPass |
| 1042 | `cellCounts` | `number[]` | runIsolatedClientKeyboardPass |
| 1042 | `hrefs` | `string[]` | runIsolatedClientKeyboardPass |
| 1223 | `contain` | `string` | runIsolatedClientKeyboardPass |
| 1223 | `htmlScrollWidth` | `number` | runIsolatedClientKeyboardPass |

## tests/helpers/e2e-auth.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 3 | `signInPath` | module | `"/api/auth/sign-in/email"` | sim | literal string (valor omitido) |
| 4 | `maximumRateLimitRetries` | module | `3` | sim | literal escalar (valor omitido) |
| 5 | `schedulerMarginMs` | module | `100` | sim | literal escalar (valor omitido) |
| 11 | `retry` | retryAfterBetterAuthRateLimit | `number` | sim | literal escalar (valor omitido) |
| 12 | `response` | retryAfterBetterAuthRateLimit | `T` | sim | chamada send |
| 15 | `retryAfterSeconds` | retryAfterBetterAuthRateLimit | `number` | sim | chamada Number |
| 37 | `response` | submitSignInFormWithRateLimitRetry | `Promise<Response>` | sim | chamada page.waitForResponse |
| 38 | `url` | submitSignInFormWithRateLimitRetry | `URL` | sim | instância URL |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 26 | `email` | `string` | signInWithRateLimitRetry |
| 26 | `password` | `string` | signInWithRateLimitRetry |

## tests/helpers/team-rbac-fixture.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 11 | `suffix` | seedTeamRbacFixture | ``${string}-${string}-${string}-${string}-${string}`` | sim | chamada randomUUID |
| 12 | `organizationId` | seedTeamRbacFixture | `string` | sim | TemplateExpression |
| 13 | `actors` | seedTeamRbacFixture | `Record<RbacActor, { userId: string; email: string; password: string; memberId: string; }>` | sim | objeto/configuração |
| 17 | `rows` | seedTeamRbacFixture | `{ user: { id: string; name: string; email: string; emailVerified: boolean; }; account: { id: string; accoun…` | sim | chamada (Object.entries(actors) as [RbacActor, typeof actors.owner][]).map |
| 22 | `accounts` | seedTeamRbacFixture | `{ password: string; id: string; accountId: string; providerId: string; userId: string; }[]` | sim | chamada Promise.all |
| 34 | `userIds` | seedTeamRbacFixture | `string[]` | sim | chamada Object.values(actors).map |
| 58 | `response` | signInAndGetCookie | `Response` | sim | chamada post |
| 64 | `cookie` | signInAndGetCookie | `string \| undefined` | sim | chamada response.headers.getSetCookie().map((entry) => entry.split(";", 1)[0]) |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 13 | `userId` | `string` | seedTeamRbacFixture |
| 13 | `email` | `string` | seedTeamRbacFixture |
| 13 | `password` | `string` | seedTeamRbacFixture |
| 13 | `memberId` | `string` | seedTeamRbacFixture |
| 57 | `email` | `string` | signInAndGetCookie |
| 57 | `password` | `string` | signInAndGetCookie |

## tests/helpers/test-db.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 15 | `url` | parseDatabaseUrl | `URL` | não | sem inicializador |
| 20 | `host` | parseDatabaseUrl | `string` | sim | chamada url.hostname.toLowerCase().replace |
| 21 | `port` | parseDatabaseUrl | `number` | sim | condição derivada |
| 22 | `database` | parseDatabaseUrl | `string` | sim | chamada decodeURIComponent(url.pathname.slice(1)).toLowerCase |
| 23 | `username` | parseDatabaseUrl | `string` | sim | chamada decodeURIComponent |
| 24 | `password` | parseDatabaseUrl | `string` | sim | chamada decodeURIComponent |
| 32 | `test` | validateTestDatabaseIsolation | `ParsedDatabaseUrl` | sim | chamada parseDatabaseUrl |
| 36 | `crmValue` | validateTestDatabaseIsolation | `string \| undefined` | sim | propriedade DATABASE_URL |
| 38 | `crm` | validateTestDatabaseIsolation | `ParsedDatabaseUrl` | sim | chamada parseDatabaseUrl |
| 51 | `testUrl` | createIsolatedConnectionPair | `{ testUrl: string; }` | sim | chamada validateTestDatabaseIsolation |
| 52 | `poolA` | createIsolatedConnectionPair | `Pool` | sim | instância Pool |
| 53 | `poolB` | createIsolatedConnectionPair | `Pool` | sim | instância Pool |
| 54 | `clientA` | createIsolatedConnectionPair | `PoolClient \| undefined` | não | sem inicializador |
| 55 | `clientB` | createIsolatedConnectionPair | `PoolClient \| undefined` | não | sem inicializador |
| 59 | `identityA` | createIsolatedConnectionPair | `[QueryResult<{ database: string; username: string; port: number; }>, QueryResult<{ database: string; userna…` | sim | chamada Promise.all |
| 59 | `identityB` | createIsolatedConnectionPair | `[QueryResult<{ database: string; username: string; port: number; }>, QueryResult<{ database: string; userna…` | sim | chamada Promise.all |
| 63 | `identity` | createIsolatedConnectionPair | `{ database: string; username: string; port: number; }` | não | sem inicializador |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 4 | `poolA` | `Pool` | module |
| 5 | `poolB` | `Pool` | module |
| 6 | `clientA` | `PoolClient` | module |
| 7 | `clientB` | `PoolClient` | module |
| 8 | `cleanup` | `() => Promise<void>` | module |
| 11 | `url` | `URL` | module |
| 11 | `host` | `string` | module |
| 11 | `port` | `number` | module |
| 11 | `database` | `string` | module |
| 11 | `username` | `string` | module |
| 11 | `password` | `string` | module |
| 31 | `testUrl` | `string` | validateTestDatabaseIsolation |
| 60 | `database` | `string` | createIsolatedConnectionPair |
| 60 | `username` | `string` | createIsolatedConnectionPair |
| 60 | `port` | `number` | createIsolatedConnectionPair |
| 61 | `database` | `string` | createIsolatedConnectionPair |
| 61 | `username` | `string` | createIsolatedConnectionPair |
| 61 | `port` | `number` | createIsolatedConnectionPair |

## tests/integration/bootstrap-organization-transaction.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 11 | `runtime` | module | `{ db: NodePgDatabase<typeof schema> \| undefined; }` | sim | chamada vi.hoisted |
| 28 | `connection` | module | `IsolatedConnectionPair \| undefined` | não | sem inicializador |
| 29 | `db` | module | `NodePgDatabase<typeof schema>` | não | sem inicializador |
| 30 | `fixture` | module | `Fixture \| undefined` | não | sem inicializador |
| 31 | `postAuth` | module | `(request: Request) => Promise<Response>` | não | sem inicializador |
| 32 | `restoreEnvironment` | module | `(() => void) \| undefined` | não | sem inicializador |
| 41 | `oldSecret` | module | `string \| undefined` | sim | propriedade BETTER_AUTH_SECRET |
| 42 | `oldUrl` | module | `string \| undefined` | sim | propriedade BETTER_AUTH_URL |
| 55 | `suffix` | module | ``${string}-${string}-${string}-${string}-${string}`` | sim | chamada randomUUID |
| 56 | `userId` | module | `string` | sim | TemplateExpression |
| 57 | `baselineOrganizationId` | module | `string` | sim | TemplateExpression |
| 58 | `baselineMemberId` | module | `string` | sim | TemplateExpression |
| 59 | `password` | module | `string` | sim | TemplateExpression |
| 60 | `email` | module | `string` | sim | TemplateExpression |
| 70 | `passwordHash` | module | `string` | sim | chamada hashPassword |
| 95 | `current` | module | `Fixture \| undefined` | sim | alias fixture |
| 99 | `errors` | module | `unknown[]` | sim | lista |
| 108 | `error` | module | `unknown` | não | sem inicializador |
| 126 | `organizations` | assertFixtureRemoved | `{ id: string; }[]` | sim | chamada db.select({ id: schema.organization.id }).from(schema.organization) .w |
| 128 | `memberships` | assertFixtureRemoved | `{ id: string; }[]` | sim | chamada db.select({ id: schema.member.id }).from(schema.member) .where |
| 130 | `guards` | assertFixtureRemoved | `{ id: string; }[]` | sim | chamada db.select({ id: schema.organizationOwnerGuard.organizationId }).from(s |
| 132 | `users` | assertFixtureRemoved | `{ id: string; }[]` | sim | chamada db.select({ id: schema.user.id }).from(schema.user).where |
| 133 | `accounts` | assertFixtureRemoved | `{ id: string; }[]` | sim | chamada db.select({ id: schema.account.id }).from(schema.account).where |
| 134 | `sessions` | assertFixtureRemoved | `{ id: string; }[]` | sim | chamada db.select({ id: schema.session.id }).from(schema.session).where |
| 141 | `visited` | findPostgresError | `Set<object>` | sim | instância Set |
| 142 | `current` | findPostgresError | `unknown` | sim | alias error |
| 145 | `candidate` | findPostgresError | `{ code?: unknown; constraint?: unknown; cause?: unknown; }` | sim | alias current |
| 159 | `current` | module | `Fixture` | sim | chamada requireFixture |
| 160 | `organizationId` | module | ``${string}-${string}-${string}-${string}-${string}`` | sim | chamada randomUUID |
| 161 | `memberId` | module | ``${string}-${string}-${string}-${string}-${string}`` | sim | chamada randomUUID |
| 162 | `generatedIds` | module | ``${string}-${string}-${string}-${string}-${string}`[]` | sim | lista |
| 165 | `before` | module | `{ id: string; name: string; slug: string; logo: string \| null; metadata: string \| null; createdAt: Date; }[]` | sim | chamada db.select().from(schema.organization) .where |
| 167 | `created` | module | `{ organization: { id: string; name: string; createdAt: Date; slug: string; logo: string \| null; metadata: …` | sim | chamada createBootstrapOrganizationWithOwner |
| 189 | `current` | module | `Fixture` | sim | chamada requireFixture |
| 190 | `organizationId` | module | ``${string}-${string}-${string}-${string}-${string}`` | sim | chamada randomUUID |
| 193 | `generated` | module | `number` | sim | literal escalar (valor omitido) |
| 194 | `createId` | module | `() => string` | sim | função/callback |
| 199 | `thrown` | module | `unknown` | não | sem inicializador |
| 206 | `error` | module | `unknown` | não | sem inicializador |
| 221 | `current` | module | `Fixture` | sim | chamada requireFixture |
| 222 | `baseline` | module | `{ id: string; name: string; slug: string; logo: string \| null; metadata: string \| null; createdAt: Date; }[]` | sim | chamada db.select().from(schema.organization) .where |
| 224 | `attemptedOrganizationId` | module | ``${string}-${string}-${string}-${string}-${string}`` | sim | chamada randomUUID |
| 227 | `thrown` | module | `unknown` | não | sem inicializador |
| 234 | `error` | module | `unknown` | não | sem inicializador |
| 248 | `createId` | module | `Mock<() => `${string}-${string}-${string}-${string}-${string}`>` | sim | chamada vi.fn |
| 258 | `current` | module | `Fixture` | sim | chamada requireFixture |
| 259 | `cookie` | module | `string` | sim | chamada signInAndGetCookie |
| 260 | `slug` | module | `string` | sim | TemplateExpression |
| 261 | `response` | module | `Response` | sim | chamada postAuth |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 20 | `userId` | `string` | module |
| 21 | `email` | `string` | module |
| 22 | `password` | `string` | module |
| 23 | `baselineOrganizationId` | `string` | module |
| 24 | `baselineMemberId` | `string` | module |
| 25 | `organizationIds` | `string[]` | module |
| 140 | `code` | `string \| undefined` | findPostgresError |
| 140 | `constraint` | `string \| undefined` | findPostgresError |
| 145 | `code` | `unknown` | findPostgresError |
| 145 | `constraint` | `unknown` | findPostgresError |
| 145 | `cause` | `unknown` | findPostgresError |

## tests/integration/client-archive-integrity.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 9 | `runtime` | module | `{ db: NodePgDatabase<typeof schema> \| undefined; organizationId: string; userId: string; }` | sim | chamada vi.hoisted |
| 26 | `connection` | module | `IsolatedConnectionPair` | não | sem inicializador |
| 27 | `db` | module | `NodePgDatabase<typeof schema>` | não | sem inicializador |
| 28 | `orgId` | module | `string` | não | sem inicializador |
| 29 | `userId` | module | `string` | não | sem inicializador |
| 30 | `orgName` | module | `"Integration CRM"` | sim | literal string (valor omitido) |
| 47 | `setupError` | module | `unknown` | não | sem inicializador |
| 48 | `errors` | module | `unknown[]` | sim | lista |
| 49 | `cleanupError` | module | `unknown` | não | sem inicializador |
| 51 | `connectionError` | module | `unknown` | não | sem inicializador |
| 57 | `errors` | module | `unknown[]` | sim | lista |
| 58 | `error` | module | `unknown` | não | sem inicializador |
| 60 | `error` | module | `unknown` | não | sem inicializador |
| 66 | `organization` | cleanupFixture | `{ id: string; name: string; }[]` | sim | chamada tx.select({ id: schema.organization.id, name: schema.organization.name |
| 68 | `user` | cleanupFixture | `{ id: string; name: string; }[]` | sim | chamada tx.select({ id: schema.user.id, name: schema.user.name }).from(schema. |
| 87 | `client` | makeClient | `{ id: string; }[]` | sim | chamada db.insert(clients).values({ organizationId: orgId, kind, name: `Fixtur |
| 92 | `deal` | makeDeal | `{ id: string; }[]` | sim | chamada db.insert(deals).values({ organizationId: orgId, clientId, title: `Dea |
| 97 | `task` | makeTask | `{ id: string; }[]` | sim | chamada db.insert(tasks).values({ organizationId: orgId, title: `Task ${random |
| 102 | `auditBefore` | expectBlocked | `{ id: string; }[]` | sim | chamada db.select({ id: auditLogs.id }).from(auditLogs).where |
| 103 | `result` | expectBlocked | `ActionResult` | sim | chamada archiveClient |
| 105 | `auditAfter` | expectBlocked | `{ id: string; }[]` | sim | chamada db.select({ id: auditLogs.id }).from(auditLogs).where |
| 111 | `clientId` | module | `string` | sim | chamada makeClient |
| 117 | `clientId` | module | `string` | sim | chamada makeClient |
| 123 | `clientId` | module | `string` | sim | chamada makeClient |
| 130 | `clientId` | module | `string` | sim | chamada makeClient |
| 136 | `clientId` | module | `string` | sim | chamada makeClient |
| 137 | `dealId` | module | `string` | sim | chamada makeDeal |
| 143 | `clientId` | module | `string` | sim | chamada makeClient |
| 144 | `dealId` | module | `string` | sim | chamada makeDeal |
| 150 | `clientId` | module | `string` | sim | chamada makeClient |
| 157 | `clientId` | module | `string` | sim | chamada makeClient |
| 160 | `activity` | module | `{ id: string; }[]` | sim | chamada db.select({ id: activities.id }).from(activities).where |
| 165 | `clientId` | module | `string` | sim | chamada makeClient |
| 171 | `clientId` | module | `string` | sim | chamada makeClient |
| 172 | `dealId` | module | `string` | sim | chamada makeDeal |
| 182 | `clientId` | module | `string` | sim | chamada makeClient |
| 183 | `archiveResult` | module | `[ActionResult, { ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefin…` | sim | chamada Promise.all |
| 183 | `createResult` | module | `[ActionResult, { ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefin…` | sim | chamada Promise.all |
| 184 | `currentClient` | module | `{ deletedAt: Date \| null; }[]` | sim | chamada db.select({ deletedAt: clients.deletedAt }).from(clients).where |
| 185 | `activeContactRows` | module | `{ id: string; }[]` | sim | chamada db.select({ id: contacts.id }).from(contacts).where |
| 186 | `activeDealRows` | module | `{ id: string; }[]` | sim | chamada db.select({ id: deals.id }).from(deals).where |
| 187 | `taskRows` | module | `{ id: string; }[]` | sim | chamada db.select({ id: tasks.id }).from(tasks).where |
| 188 | `dependencyExists` | module | `boolean` | sim | expressão > |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 96 | `clientId` | `string \| undefined` | makeTask |
| 96 | `dealId` | `string \| undefined` | makeTask |
| 96 | `status` | `"todo" \| "in_progress" \| "done" \| "canceled" \| undefined` | makeTask |

## tests/integration/client-owner-reassignment.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 9 | `state` | module | `{ db: NodePgDatabase<typeof schema> \| undefined; role: string; orgId: string; actorId: string; }` | sim | chamada vi.hoisted |
| 18 | `connection` | module | `IsolatedConnectionPair` | não | sem inicializador |
| 19 | `db` | module | `NodePgDatabase<typeof schema>` | não | sem inicializador |
| 20 | `fixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 21 | `orgB` | module | `string` | não | sem inicializador |
| 21 | `userB` | module | `string` | não | sem inicializador |
| 21 | `noMembership` | module | `string` | não | sem inicializador |
| 21 | `clientA` | module | `string` | não | sem inicializador |
| 21 | `clientB` | module | `string` | não | sem inicializador |
| 22 | `reassign` | module | `(input: unknown) => Promise<ActionResult>` | não | sem inicializador |
| 35 | `a` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.clients).values({ organizationId: fixture.organizatio |
| 36 | `b` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.clients).values({ organizationId: orgB, kind: "person |
| 41 | `errors` | module | `unknown[]` | sim | lista |
| 43 | `id` | module | `string` | não | sem inicializador |
| 50 | `e` | module | `unknown` | não | sem inicializador |
| 51 | `e` | module | `unknown` | não | sem inicializador |
| 56 | `auditRows` | module | `() => Omit<PgSelectBase<"audit_logs", { id: PgColumn<{ name: "id"; tableName: "audit_logs"; dataType: "stri…` | sim | função/callback |
| 57 | `owner` | module | `(id?: string) => Promise<string \| null>` | sim | função/callback |
| 68 | `id` | module | `string` | não | sem inicializador |
| 77 | `rows` | module | `{ id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entityId: st…` | sim | chamada (await auditRows()).sort |
| 78 | `first` | module | `any` | sim | chamada JSON.parse |
| 78 | `second` | module | `any` | sim | chamada JSON.parse |

## tests/integration/deal-owner-reassignment.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 9 | `runtime` | module | `{ db: NodePgDatabase<typeof schema> \| undefined; role: string; organizationId: string; actorId: string; }` | sim | chamada vi.hoisted |
| 39 | `connection` | module | `IsolatedConnectionPair` | não | sem inicializador |
| 40 | `db` | module | `NodePgDatabase<typeof schema>` | não | sem inicializador |
| 41 | `fixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 42 | `organizationB` | module | `string` | sim | literal string (valor omitido) |
| 43 | `userB` | module | `string` | sim | literal string (valor omitido) |
| 44 | `userWithoutMembership` | module | `string` | sim | literal string (valor omitido) |
| 45 | `clientA` | module | `string` | sim | literal string (valor omitido) |
| 46 | `dealA` | module | `string` | sim | literal string (valor omitido) |
| 47 | `dealB` | module | `string` | sim | literal string (valor omitido) |
| 48 | `reassignDealOwner` | module | `(input: unknown) => Promise<{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; mess…` | não | sem inicializador |
| 70 | `aClient` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.clients).values({ organizationId: fixture!.organizati |
| 76 | `bClient` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.clients).values({ organizationId: organizationB, kind |
| 82 | `aDeal` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.deals).values({ organizationId: fixture!.organization |
| 89 | `bDeal` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.deals).values({ organizationId: organizationB, client |
| 105 | `errors` | module | `unknown[]` | sim | lista |
| 106 | `fixtureToClean` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | alias fixture |
| 124 | `residue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.organization.id }).from(schema.organization).wh |
| 126 | `users` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.user.id }).from(schema.user).where |
| 127 | `unmember` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.user.id }).from(schema.user).where |
| 130 | `error` | module | `unknown` | não | sem inicializador |
| 135 | `error` | module | `unknown` | não | sem inicializador |
| 140 | `organizationResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.organization.id }).from(schema.organization).wh |
| 141 | `memberUserIds` | module | `string[]` | sim | chamada Object.values(fixtureToClean.actors).map |
| 142 | `userResidue` | module | `{ id: string; }[][]` | sim | chamada Promise.all |
| 143 | `clientResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.clients.id }).from(schema.clients).where |
| 144 | `dealResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.deals.id }).from(schema.deals).where |
| 145 | `taskResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.tasks.id }).from(schema.tasks).where |
| 146 | `contactResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.contacts.id }).from(schema.contacts).where |
| 147 | `activityResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.activities.id }).from(schema.activities).where |
| 148 | `auditResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where |
| 149 | `membershipResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.member.id }).from(schema.member).where |
| 153 | `error` | module | `unknown` | não | sem inicializador |
| 201 | `value` | get | `any` | sim | chamada Reflect.get |
| 205 | `result` | get | `QueryResult<Record<string, unknown>>` | sim | chamada tx.execute |
| 206 | `row` | get | `{ pid: number \| string; } \| undefined` | sim | acesso indexado |
| 221 | `deadline` | waitForDealActionLock | `number` | sim | expressão + |
| 224 | `actionPid` | waitForDealActionLock | `number \| undefined` | sim | chamada getActionPid |
| 226 | `result` | waitForDealActionLock | `QueryResult<LockWaitSession>` | sim | chamada monitor.query |
| 245 | `actionPid` | waitForDealActionLock | `number \| undefined` | sim | chamada getActionPid |
| 246 | `monitorPid` | waitForDealActionLock | `number` | sim | propriedade pid |
| 247 | `diagnostic` | waitForDealActionLock | `QueryResult<LockWaitSession & { datname: string; usename: string; }>` | sim | chamada monitor.query |
| 276 | `insert` | get | `(target: unknown) => object` | sim | chamada Reflect.get |
| 277 | `builder` | get | `object` | sim | chamada insert.call |
| 282 | `valuesMethod` | get | `(row: Record<string, unknown>) => unknown` | sim | chamada Reflect.get |
| 288 | `value` | get | `any` | sim | chamada Reflect.get |
| 293 | `insert` | get | `(value: unknown) => unknown` | sim | chamada Reflect.get |
| 297 | `value` | get | `any` | sim | chamada Reflect.get |
| 306 | `seen` | findNotNullViolation | `Set<object>` | sim | instância Set |
| 307 | `current` | findNotNullViolation | `unknown` | sim | alias error |
| 310 | `candidate` | findNotNullViolation | `{ code?: unknown; table?: unknown; column?: unknown; cause?: unknown; }` | sim | alias current |
| 325 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 332 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 334 | `before` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; ownerUserId: string \| null; delete…` | sim | chamada currentDeal |
| 347 | `before` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; ownerUserId: string \| null; delete…` | sim | chamada currentDeal |
| 348 | `newUserId` | module | `string` | não | sem inicializador |
| 356 | `before` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; ownerUserId: string \| null; delete…` | sim | chamada currentDeal |
| 363 | `before` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; ownerUserId: string \| null; delete…` | sim | chamada currentDeal |
| 370 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 372 | `before` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; ownerUserId: string \| null; delete…` | sim | chamada currentDeal |
| 383 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 385 | `before` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; ownerUserId: string \| null; delete…` | sim | chamada currentDeal |
| 387 | `after` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; ownerUserId: string \| null; delete…` | sim | chamada currentDeal |
| 400 | `before` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; ownerUserId: string \| null; delete…` | sim | chamada currentDeal |
| 401 | `result` | module | `{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }` | sim | chamada reassignDealOwner |
| 402 | `after` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; ownerUserId: string \| null; delete…` | sim | chamada currentDeal |
| 426 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 427 | `before` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; ownerUserId: string \| null; delete…` | sim | chamada currentDeal |
| 428 | `realDb` | module | `NodePgDatabase<typeof schema>` | sim | propriedade db |
| 430 | `failure` | module | `unknown` | não | sem inicializador |
| 433 | `error` | module | `unknown` | não | sem inicializador |
| 445 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 446 | `initialOwner` | module | `string \| null \| undefined` | sim | propriedade ownerUserId |
| 447 | `externalDealBefore` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; ownerUserId: string \| null; delete…` | sim | chamada currentDeal |
| 448 | `firstResult` | module | `[{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }, { ok: f…` | sim | chamada Promise.all |
| 448 | `secondResult` | module | `[{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }, { ok: f…` | sim | chamada Promise.all |
| 454 | `rows` | module | `{ id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entityId: st…` | sim | chamada auditRows |
| 456 | `entries` | module | `{ row: { id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entit…` | sim | chamada rows.map |
| 457 | `first` | module | `{ row: { id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entit…` | sim | chamada entries.find |
| 459 | `second` | module | `{ row: { id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entit…` | sim | chamada entries.find |
| 468 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 469 | `beforeDeal` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; ownerUserId: string \| null; delete…` | sim | chamada currentDeal |
| 470 | `externalDealBefore` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; ownerUserId: string \| null; delete…` | sim | chamada currentDeal |
| 471 | `auditsBefore` | module | `{ id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entityId: st…` | sim | chamada auditRows |
| 472 | `pendingAction` | module | `Promise<{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }> …` | não | sem inicializador |
| 473 | `actionPid` | module | `number \| undefined` | não | sem inicializador |
| 474 | `actionSettled` | module | `boolean` | sim | literal escalar (valor omitido) |
| 476 | `controllerTransactionOpen` | module | `boolean` | sim | literal escalar (valor omitido) |
| 477 | `testFailure` | module | `unknown` | não | sem inicializador |
| 478 | `failed` | module | `boolean` | sim | literal escalar (valor omitido) |
| 479 | `cleanupErrors` | module | `unknown[]` | sim | lista |
| 481 | `lockedDeal` | module | `QueryResult<any>` | sim | chamada connection.clientB.query |
| 483 | `blockerPid` | module | `number` | sim | propriedade pid |
| 484 | `monitorPid` | module | `number` | sim | propriedade pid |
| 491 | `blockedAction` | module | `LockWaitSession` | sim | chamada waitForDealActionLock |
| 500 | `controllerState` | module | `QueryResult<{ xact_start: Date \| null; }>` | sim | chamada connection.clientA.query |
| 507 | `afterDeal` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; ownerUserId: string \| null; delete…` | sim | chamada currentDeal |
| 521 | `auditsAfter` | module | `{ id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entityId: st…` | sim | chamada auditRows |
| 533 | `error` | module | `unknown` | não | sem inicializador |
| 541 | `error` | module | `unknown` | não | sem inicializador |
| 547 | `timer` | module | `NodeJS.Timeout \| undefined` | não | sem inicializador |
| 548 | `settled` | module | `{ timedOut: false; results: [PromiseSettledResult<{ ok: false; message: string; id?: undefined; } \| { ok: …` | sim | chamada Promise.race |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 186 | `pid` | `number` | module |
| 187 | `state` | `string` | module |
| 188 | `wait_event_type` | `string \| null` | module |
| 189 | `wait_event` | `string \| null` | module |
| 190 | `blocking_pids` | `number[]` | module |
| 191 | `query` | `string` | module |
| 206 | `pid` | `string \| number` | get |
| 246 | `pid` | `number` | waitForDealActionLock |
| 247 | `datname` | `string` | waitForDealActionLock |
| 247 | `usename` | `string` | waitForDealActionLock |
| 305 | `code` | `string` | findNotNullViolation |
| 305 | `table` | `string \| undefined` | findNotNullViolation |
| 305 | `column` | `string \| undefined` | findNotNullViolation |
| 310 | `code` | `unknown` | findNotNullViolation |
| 310 | `table` | `unknown` | findNotNullViolation |
| 310 | `column` | `unknown` | findNotNullViolation |
| 310 | `cause` | `unknown` | findNotNullViolation |
| 456 | `fromUserId` | `string \| null` | module |
| 456 | `toUserId` | `string \| null` | module |
| 483 | `pid` | `number` | module |
| 484 | `pid` | `number` | module |
| 500 | `xact_start` | `Date \| null` | module |
| 550 | `timedOut` | `true` | module |

## tests/integration/member-assignment-integrity.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 6 | `enabled` | module | `boolean` | sim | expressão === |
| 7 | `fk` | module | `{ client: string; deal: string; task: string; }` | sim | objeto/configuração |
| 13 | `connection` | module | `IsolatedConnectionPair \| undefined` | não | sem inicializador |
| 14 | `db` | module | `PoolClient` | não | sem inicializador |
| 15 | `fixture` | module | `Fixture \| undefined` | não | sem inicializador |
| 16 | `transactionOpen` | module | `boolean` | sim | literal escalar (valor omitido) |
| 23 | `installed` | module | `QueryResult<any>` | sim | chamada db.query |
| 34 | `current` | module | `Fixture \| undefined` | sim | alias fixture |
| 41 | `result` | module | `QueryResult<any>` | sim | chamada db.query |
| 48 | `f` | module | `Fixture` | sim | chamada need |
| 54 | `f` | module | `Fixture` | sim | chamada need |
| 54 | `clientId` | module | `string` | sim | chamada addClient |
| 59 | `f` | module | `Fixture` | sim | chamada need |
| 64 | `f` | module | `Fixture` | sim | chamada need |
| 68 | `f` | module | `Fixture` | sim | chamada need |
| 68 | `clientId` | module | `string` | sim | chamada addClient |
| 74 | `f` | module | `Fixture` | sim | chamada need |
| 79 | `f` | module | `Fixture` | sim | chamada need |
| 79 | `id` | module | `string` | sim | chamada addClient |
| 84 | `f` | module | `Fixture` | sim | chamada need |
| 93 | `f` | module | `Fixture` | sim | chamada need |
| 96 | `id` | module | `string` | sim | chamada addClient |
| 104 | `f` | module | `Fixture` | sim | chamada need |
| 104 | `id` | module | `string` | sim | chamada addClient |
| 117 | `f` | module | `Fixture` | sim | chamada need |
| 117 | `id` | module | `string` | sim | chamada addClient |
| 117 | `other` | module | `string` | sim | chamada addClient |
| 125 | `f` | module | `Fixture` | sim | chamada need |
| 131 | `f` | module | `Fixture` | sim | chamada need |
| 131 | `concurrent` | module | `PoolClient` | sim | chamada connection!.poolB.connect |
| 132 | `deleteTransactionOpen` | module | `boolean` | sim | literal escalar (valor omitido) |
| 133 | `insertTransactionOpen` | module | `boolean` | sim | literal escalar (valor omitido) |
| 134 | `pendingInsert` | module | `Promise<{ kind: "inserted"; } \| { kind: "error"; error: unknown; }> \| undefined` | não | sem inicializador |
| 144 | `deletePid` | module | `number` | sim | propriedade pid |
| 151 | `insertPid` | module | `number` | sim | propriedade pid |
| 157 | `isBlockedByRemoval` | module | `boolean` | sim | literal escalar (valor omitido) |
| 158 | `deadline` | module | `number` | sim | expressão + |
| 160 | `observation` | module | `QueryResult<{ blockers: number[]; }>` | sim | chamada connection!.poolA.query |
| 170 | `insertResult` | module | `{ kind: "inserted"; } \| { kind: "error"; error: unknown; }` | sim | alias pendingInsert |
| 193 | `f` | module | `Fixture` | sim | chamada need |
| 193 | `id` | module | `string` | sim | chamada addClient |
| 194 | `audit` | module | `QueryResult<any>` | sim | chamada db.query |
| 195 | `activity` | module | `QueryResult<any>` | sim | chamada db.query |
| 202 | `f` | module | `Fixture` | sim | chamada need |
| 209 | `f` | module | `Fixture` | sim | chamada need |
| 212 | `error` | module | `unknown` | não | sem inicializador |
| 213 | `caught` | module | `unknown` | não | sem inicializador |
| 223 | `s` | seed | ``${string}-${string}-${string}-${string}-${string}`` | sim | chamada randomUUID |
| 224 | `f` | seed | `{ orgA: string; orgB: string; ownerA: string; ownerB: string; memberA: string; memberB: string; outsider: s…` | sim | objeto/configuração |
| 233 | `error` | fails | `unknown` | não | sem inicializador |
| 234 | `caught` | fails | `unknown` | não | sem inicializador |
| 239 | `result` | addClient | `QueryResult<any>` | sim | chamada db.query |
| 243 | `result` | count | `QueryResult<any>` | sim | chamada db.query |
| 247 | `result` | hasMember | `QueryResult<any>` | sim | chamada db.query |
| 252 | `open` | cleanup | `boolean` | sim | literal escalar (valor omitido) |
| 254 | `table` | cleanup | `string` | não | sem inicializador |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 12 | `orgA` | `string` | module |
| 12 | `orgB` | `string` | module |
| 12 | `ownerA` | `string` | module |
| 12 | `ownerB` | `string` | module |
| 12 | `memberA` | `string` | module |
| 12 | `memberB` | `string` | module |
| 12 | `outsider` | `string` | module |
| 134 | `kind` | `"inserted"` | module |
| 134 | `kind` | `"error"` | module |
| 134 | `error` | `unknown` | module |
| 160 | `blockers` | `number[]` | module |

## tests/integration/member-assignment-transfer-better-auth.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 9 | `runtime` | module | `{ db: NodePgDatabase<typeof schema> \| undefined; cookie: string; }` | sim | chamada vi.hoisted |
| 43 | `connection` | module | `IsolatedConnectionPair \| undefined` | não | sem inicializador |
| 44 | `db` | module | `NodePgDatabase<typeof schema>` | não | sem inicializador |
| 45 | `fixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 46 | `organizationB` | module | `string` | sim | literal string (valor omitido) |
| 47 | `userB` | module | `string` | sim | literal string (valor omitido) |
| 48 | `userWithoutMembership` | module | `string` | sim | literal string (valor omitido) |
| 49 | `records` | module | `Records` | não | sem inicializador |
| 50 | `postAuth` | module | `(request: Request) => Promise<Response>` | não | sem inicializador |
| 51 | `transferMemberAssignments` | module | `(input: unknown) => Promise<{ ok: true; counts: { clients: number; deals: number; tasks: number; total: num…` | não | sem inicializador |
| 52 | `restoreAuthEnvironment` | module | `(() => void) \| undefined` | não | sem inicializador |
| 60 | `previousSecret` | module | `string \| undefined` | sim | propriedade BETTER_AUTH_SECRET |
| 61 | `previousUrl` | module | `string \| undefined` | sim | propriedade BETTER_AUTH_URL |
| 71 | `route` | module | `typeof import("<projeto>/src/app/api/auth/[...all]/route")` | sim | chamada import |
| 83 | `sourceId` | module | `string` | sim | propriedade userId |
| 100 | `clientA` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.clients).values({ organizationId: fixture!.organizati |
| 106 | `dealA` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.deals).values({ organizationId: fixture!.organization |
| 113 | `taskA` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.tasks).values({ organizationId: fixture!.organization |
| 122 | `clientB` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.clients).values({ organizationId: organizationB, kind |
| 128 | `dealB` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.deals).values({ organizationId: organizationB, client |
| 135 | `taskB` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.tasks).values({ organizationId: organizationB, title: |
| 150 | `errors` | module | `unknown[]` | sim | lista |
| 152 | `fixtureToClean` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | alias fixture |
| 171 | `orgResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 171 | `userResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 171 | `memberResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 171 | `accountResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 171 | `sessionResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 171 | `clientResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 171 | `dealResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 171 | `taskResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 171 | `auditResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 185 | `error` | module | `unknown` | não | sem inicializador |
| 192 | `error` | module | `unknown` | não | sem inicializador |
| 198 | `orgId` | module | `string` | sim | propriedade organizationId |
| 199 | `userIds` | module | `string[]` | sim | chamada Object.values(fixtureToClean.actors).map |
| 200 | `orgResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 200 | `userResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 200 | `accountResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 200 | `sessionResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 200 | `clientResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 200 | `contactResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 200 | `dealResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 200 | `taskResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 200 | `activityResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 200 | `auditResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 200 | `memberResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 200 | `invitationResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 217 | `error` | module | `unknown` | não | sem inicializador |
| 240 | `cookie` | signIn | `string` | sim | chamada signInAndGetCookie |
| 246 | `organizationId` | stateA | `string` | sim | propriedade organizationId |
| 270 | `serialized` | expectNoTenantBDisclosure | `string` | sim | chamada JSON.stringify |
| 271 | `secret` | expectNoTenantBDisclosure | `string` | não | sem inicializador |
| 277 | `beforeA` | assertRejectedWithoutEffects | `AssignmentState` | sim | chamada stateA |
| 278 | `beforeB` | assertRejectedWithoutEffects | `AssignmentState` | sim | chamada stateB |
| 279 | `auditBefore` | assertRejectedWithoutEffects | `{ id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entityId: st…` | sim | chamada recordsAuditRows |
| 280 | `result` | assertRejectedWithoutEffects | `unknown` | não | sem inicializador |
| 281 | `threw` | assertRejectedWithoutEffects | `boolean` | sim | literal escalar (valor omitido) |
| 295 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 295 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 297 | `result` | module | `{ ok: true; counts: { clients: number; deals: number; tasks: number; total: number; }; archivedReferencesPe…` | sim | chamada transferMemberAssignments |
| 313 | `audits` | module | `{ id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entityId: st…` | sim | chamada recordsAuditRows |
| 323 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 323 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 325 | `result` | module | `{ ok: true; counts: { clients: number; deals: number; tasks: number; total: number; }; archivedReferencesPe…` | sim | chamada transferMemberAssignments |
| 331 | `audits` | module | `{ id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entityId: st…` | sim | chamada recordsAuditRows |
| 339 | `beforeA` | module | `AssignmentState` | sim | chamada stateA |
| 340 | `beforeB` | module | `AssignmentState` | sim | chamada stateB |
| 341 | `auditsBefore` | module | `{ id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entityId: st…` | sim | chamada recordsAuditRows |
| 349 | `beforeA` | module | `AssignmentState` | sim | chamada stateA |
| 350 | `beforeB` | module | `AssignmentState` | sim | chamada stateB |
| 359 | `cookie` | module | `string` | sim | chamada signIn |
| 360 | `response` | module | `Response` | sim | chamada postAuth |
| 371 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 371 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 374 | `beforeA` | module | `AssignmentState` | sim | chamada stateA |
| 375 | `beforeB` | module | `AssignmentState` | sim | chamada stateB |
| 383 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 385 | `session` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.session.id }).from(schema.session).where |
| 388 | `beforeA` | module | `AssignmentState` | sim | chamada stateA |
| 389 | `beforeB` | module | `AssignmentState` | sim | chamada stateB |
| 399 | `beforeA` | module | `AssignmentState` | sim | chamada stateA |
| 400 | `beforeB` | module | `AssignmentState` | sim | chamada stateB |
| 401 | `result` | module | `{ ok: true; counts: { clients: number; deals: number; tasks: number; total: number; }; archivedReferencesPe…` | sim | chamada transferMemberAssignments |
| 410 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 412 | `beforeA` | module | `AssignmentState` | sim | chamada stateA |
| 413 | `beforeB` | module | `AssignmentState` | sim | chamada stateB |
| 414 | `result` | module | `{ ok: true; counts: { clients: number; deals: number; tasks: number; total: number; }; archivedReferencesPe…` | sim | chamada transferMemberAssignments |
| 423 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 425 | `beforeA` | module | `AssignmentState` | sim | chamada stateA |
| 426 | `result` | module | `{ ok: true; counts: { clients: number; deals: number; tasks: number; total: number; }; archivedReferencesPe…` | sim | chamada transferMemberAssignments |
| 434 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 436 | `beforeA` | module | `AssignmentState` | sim | chamada stateA |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 30 | `clientA` | `string` | module |
| 31 | `dealA` | `string` | module |
| 32 | `taskA` | `string` | module |
| 33 | `clientB` | `string` | module |
| 34 | `dealB` | `string` | module |
| 35 | `taskB` | `string` | module |
| 38 | `clients` | `{ id: string; name: string; email: string \| null; createdAt: Date; updatedAt: Date; organizationId: string…` | module |
| 39 | `deals` | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; ownerUserId: string \| null; delete…` | module |
| 40 | `tasks` | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; status: "todo" \| "in_progress" \| …` | module |

## tests/integration/member-assignment-transfer.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 9 | `runtime` | module | `{ db: NodePgDatabase<typeof schema> \| undefined; organizationId: string; actorId: string; role: string; }` | sim | chamada vi.hoisted |
| 35 | `connection` | module | `IsolatedConnectionPair` | não | sem inicializador |
| 36 | `db` | module | `NodePgDatabase<typeof schema>` | não | sem inicializador |
| 37 | `dbB` | module | `NodePgDatabase<typeof schema>` | não | sem inicializador |
| 38 | `fixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 39 | `organizationB` | module | `string` | sim | literal string (valor omitido) |
| 40 | `userB` | module | `string` | sim | literal string (valor omitido) |
| 41 | `userWithoutMembership` | module | `string` | sim | literal string (valor omitido) |
| 42 | `ids` | module | `FixtureIds` | não | sem inicializador |
| 43 | `historicalAuditId` | module | `string` | sim | literal string (valor omitido) |
| 44 | `transferMemberAssignments` | module | `(input: unknown) => Promise<{ ok: true; counts: { clients: number; deals: number; tasks: number; total: num…` | não | sem inicializador |
| 45 | `reassignTaskAssignee` | module | `(input: unknown) => Promise<{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; mess…` | não | sem inicializador |
| 65 | `ownerId` | module | `string` | sim | propriedade userId |
| 66 | `sourceId` | module | `string` | sim | propriedade userId |
| 67 | `destinationId` | module | `string` | sim | propriedade userId |
| 75 | `activeClient` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.clients).values({ organizationId: fixture!.organizati |
| 76 | `archivedClient` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.clients).values({ organizationId: fixture!.organizati |
| 77 | `untouchedClient` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.clients).values({ organizationId: fixture!.organizati |
| 78 | `externalClient` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.clients).values({ organizationId: organizationB, kind |
| 80 | `activeDeal` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.deals).values({ organizationId: fixture!.organization |
| 81 | `archivedDeal` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.deals).values({ organizationId: fixture!.organization |
| 82 | `untouchedDeal` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.deals).values({ organizationId: fixture!.organization |
| 83 | `externalDeal` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.deals).values({ organizationId: organizationB, client |
| 85 | `activeTask` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.tasks).values({ organizationId: fixture!.organization |
| 86 | `archivedTask` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.tasks).values({ organizationId: fixture!.organization |
| 87 | `untouchedTask` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.tasks).values({ organizationId: fixture!.organization |
| 88 | `externalTask` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.tasks).values({ organizationId: organizationB, title: |
| 104 | `errors` | module | `unknown[]` | sim | lista |
| 105 | `fixtureToClean` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | alias fixture |
| 123 | `orgResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.organization.id }).from(schema.organization).wh |
| 124 | `userResidue` | module | `{ id: string; }[][]` | sim | chamada Promise.all |
| 127 | `error` | module | `unknown` | não | sem inicializador |
| 132 | `error` | module | `unknown` | não | sem inicializador |
| 137 | `orgId` | module | `string` | sim | propriedade organizationId |
| 138 | `orgResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.organization.id }).from(schema.organization).wh |
| 139 | `userIds` | module | `string[]` | sim | chamada Object.values(fixtureToClean.actors).map |
| 140 | `userResidue` | module | `{ id: string; }[][]` | sim | chamada Promise.all |
| 141 | `clientsResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.clients.id }).from(schema.clients).where |
| 142 | `dealsResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.deals.id }).from(schema.deals).where |
| 143 | `tasksResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.tasks.id }).from(schema.tasks).where |
| 144 | `auditResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where |
| 145 | `memberResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.member.id }).from(schema.member).where |
| 149 | `error` | module | `unknown` | não | sem inicializador |
| 172 | `organizationId` | snapshotA | `string` | sim | propriedade organizationId |
| 193 | `copy` | omitAssignmentAndUpdatedAt | `{ [x: string]: unknown; }` | sim | objeto/configuração |
| 200 | `organizationId` | sourceReferences | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 200 | `testActors` | sourceReferences | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 201 | `clients` | sourceReferences | `{ value: number; }[]` | sim | chamada db.select({ value: count() }).from(schema.clients).where |
| 202 | `deals` | sourceReferences | `{ value: number; }[]` | sim | chamada db.select({ value: count() }).from(schema.deals).where |
| 203 | `tasks` | sourceReferences | `{ value: number; }[]` | sim | chamada db.select({ value: count() }).from(schema.tasks).where |
| 208 | `organizationId` | archivedSourceReferences | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 208 | `testActors` | archivedSourceReferences | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 209 | `clients` | archivedSourceReferences | `{ value: number; }[]` | sim | chamada db.select({ value: count() }).from(schema.clients).where |
| 210 | `deals` | archivedSourceReferences | `{ value: number; }[]` | sim | chamada db.select({ value: count() }).from(schema.deals).where |
| 211 | `tasks` | archivedSourceReferences | `{ value: number; }[]` | sim | chamada db.select({ value: count() }).from(schema.tasks).where |
| 228 | `insert` | get | `(target: unknown) => object` | sim | chamada Reflect.get |
| 229 | `builder` | get | `object` | sim | chamada insert.call |
| 234 | `valuesMethod` | get | `(rows: unknown) => unknown` | sim | chamada Reflect.get |
| 235 | `invalidRows` | get | `{ action: null; }[] \| { action: null; }` | sim | condição derivada |
| 241 | `value` | get | `any` | sim | chamada Reflect.get |
| 246 | `insert` | get | `(target: unknown) => unknown` | sim | chamada Reflect.get |
| 250 | `value` | get | `any` | sim | chamada Reflect.get |
| 259 | `seen` | findNotNullViolation | `Set<object>` | sim | instância Set |
| 260 | `current` | findNotNullViolation | `unknown` | sim | alias error |
| 263 | `candidate` | findNotNullViolation | `{ code?: unknown; table?: unknown; column?: unknown; cause?: unknown; }` | sim | alias current |
| 288 | `value` | get | `any` | sim | chamada Reflect.get |
| 292 | `result` | get | `QueryResult<Record<string, unknown>>` | sim | chamada tx.execute |
| 293 | `row` | get | `{ pid: number \| string; } \| undefined` | sim | acesso indexado |
| 309 | `deadline` | waitForBlockedSession | `number` | sim | expressão + |
| 314 | `operationPid` | waitForBlockedSession | `number \| undefined` | sim | chamada getOperationPid |
| 316 | `result` | waitForBlockedSession | `QueryResult<LockWaitSession>` | sim | chamada monitor.query |
| 334 | `operationPid` | waitForBlockedSession | `number \| undefined` | sim | chamada getOperationPid |
| 335 | `diagnostic` | waitForBlockedSession | `QueryResult<LockWaitSession & { datname: string; usename: string; }>` | sim | chamada monitor.query |
| 357 | `testActors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 357 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 358 | `beforeA` | module | `TableRows` | sim | chamada snapshotA |
| 359 | `beforeB` | module | `TableRows` | sim | chamada snapshotB |
| 360 | `historyBefore` | module | `{ id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entityId: st…` | sim | chamada (await auditRows()).find |
| 362 | `result` | module | `{ ok: true; counts: { clients: number; deals: number; tasks: number; total: number; }; archivedReferencesPe…` | sim | chamada transfer |
| 369 | `afterA` | module | `TableRows` | sim | chamada snapshotA |
| 370 | `afterB` | module | `TableRows` | sim | chamada snapshotB |
| 371 | `id` | module | `string` | não | sem inicializador |
| 372 | `before` | module | `{ id: string; name: string; email: string \| null; createdAt: Date; updatedAt: Date; organizationId: string…` | sim | chamada beforeA.clients.find |
| 373 | `after` | module | `{ id: string; name: string; email: string \| null; createdAt: Date; updatedAt: Date; organizationId: string…` | sim | chamada afterA.clients.find |
| 377 | `id` | module | `string` | não | sem inicializador |
| 378 | `before` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; ownerUserId: string \| null; delete…` | sim | chamada beforeA.deals.find |
| 379 | `after` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; ownerUserId: string \| null; delete…` | sim | chamada afterA.deals.find |
| 383 | `id` | module | `string` | não | sem inicializador |
| 384 | `before` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; status: "todo" \| "in_progress" \| …` | sim | chamada beforeA.tasks.find |
| 385 | `after` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; status: "todo" \| "in_progress" \| …` | sim | chamada afterA.tasks.find |
| 397 | `transferredIds` | module | `string[]` | sim | lista |
| 398 | `expectedEntityType` | module | `Map<string, string>` | sim | instância Map |
| 403 | `rows` | module | `{ id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entityId: st…` | sim | chamada (await auditRows()).filter |
| 405 | `row` | module | `{ id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entityId: st…` | não | sem inicializador |
| 412 | `testActors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 412 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 413 | `beforeA` | module | `TableRows` | sim | chamada snapshotA |
| 414 | `result` | module | `{ ok: true; counts: { clients: number; deals: number; tasks: number; total: number; }; archivedReferencesPe…` | sim | chamada transfer |
| 416 | `afterA` | module | `TableRows` | sim | chamada snapshotA |
| 417 | `id` | module | `string` | não | sem inicializador |
| 418 | `id` | module | `string` | não | sem inicializador |
| 419 | `id` | module | `string` | não | sem inicializador |
| 420 | `table` | module | `"clients" \| "deals" \| "tasks"` | não | sem inicializador |
| 421 | `field` | module | `"assigneeUserId" \| "ownerUserId"` | sim | condição derivada |
| 422 | `id` | module | `string` | não | sem inicializador |
| 423 | `before` | module | `Record<string, unknown>` | sim | chamada beforeA[table].find |
| 424 | `after` | module | `Record<string, unknown>` | sim | chamada afterA[table].find |
| 428 | `transferRows` | module | `{ id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entityId: st…` | sim | chamada (await auditRows()).filter |
| 430 | `expectedEntityType` | module | `Map<string, string>` | sim | instância Map |
| 442 | `beforeA` | module | `TableRows` | sim | chamada snapshotA |
| 443 | `beforeB` | module | `TableRows` | sim | chamada snapshotB |
| 444 | `beforeAudit` | module | `{ id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entityId: st…` | sim | chamada auditRows |
| 453 | `beforeA` | module | `TableRows` | sim | chamada snapshotA |
| 454 | `beforeAudit` | module | `{ id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entityId: st…` | sim | chamada auditRows |
| 461 | `beforeA` | module | `TableRows` | sim | chamada snapshotA |
| 462 | `beforeB` | module | `TableRows` | sim | chamada snapshotB |
| 463 | `beforeAudit` | module | `{ id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entityId: st…` | sim | chamada auditRows |
| 464 | `source` | module | `string` | sim | propriedade userId |
| 465 | `destination` | module | `string` | sim | propriedade userId |
| 466 | `cases` | module | `{ fromUserId: string; toUserId: string \| null; }[]` | sim | lista |
| 477 | `input` | module | `{ fromUserId: string; toUserId: string \| null; }` | não | sem inicializador |
| 484 | `beforeA` | module | `TableRows` | sim | chamada snapshotA |
| 485 | `beforeAudit` | module | `{ id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entityId: st…` | sim | chamada auditRows |
| 486 | `result` | module | `{ ok: true; counts: { clients: number; deals: number; tasks: number; total: number; }; archivedReferencesPe…` | sim | chamada transfer |
| 493 | `beforeA` | module | `TableRows` | sim | chamada snapshotA |
| 494 | `beforeAudit` | module | `{ id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entityId: st…` | sim | chamada auditRows |
| 495 | `realDb` | module | `NodePgDatabase<typeof schema>` | sim | propriedade db |
| 497 | `failure` | module | `unknown` | não | sem inicializador |
| 500 | `error` | module | `unknown` | não | sem inicializador |
| 512 | `testActors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 513 | `first` | module | `[{ ok: true; counts: { clients: number; deals: number; tasks: number; total: number; }; archivedReferencesP…` | sim | chamada Promise.all |
| 513 | `second` | module | `[{ ok: true; counts: { clients: number; deals: number; tasks: number; total: number; }; archivedReferencesP…` | sim | chamada Promise.all |
| 519 | `firstTotal` | module | `number` | sim | condição derivada |
| 520 | `secondTotal` | module | `number` | sim | condição derivada |
| 522 | `destination` | module | `string` | sim | condição derivada |
| 524 | `state` | module | `TableRows` | sim | chamada snapshotA |
| 525 | `id` | module | `string` | não | sem inicializador |
| 526 | `id` | module | `string` | não | sem inicializador |
| 527 | `id` | module | `string` | não | sem inicializador |
| 528 | `expectedIds` | module | `string[]` | sim | lista |
| 529 | `transferRows` | module | `{ id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entityId: st…` | sim | chamada (await auditRows()).filter |
| 535 | `testActors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 536 | `beforeTask` | module | `{ id: string; organizationId: string; title: string; description: string \| null; priority: "low" \| "norma…` | sim | acesso indexado |
| 537 | `batchPromise` | module | `Promise<{ ok: true; counts: { clients: number; deals: number; tasks: number; total: number; }; archivedRefe…` | não | sem inicializador |
| 538 | `individualPromise` | module | `Promise<{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }> …` | não | sem inicializador |
| 539 | `lockTransactionOpen` | module | `boolean` | sim | literal escalar (valor omitido) |
| 540 | `transferPid` | module | `number \| undefined` | não | sem inicializador |
| 545 | `blocker` | module | `QueryResult<{ pid: number; }>` | sim | chamada connection.clientB.query |
| 546 | `blockerPid` | module | `number` | sim | propriedade pid |
| 547 | `monitorPid` | module | `number` | sim | propriedade pid |
| 552 | `batchWaiter` | module | `LockWaitSession` | sim | chamada waitForBlockedSession |
| 560 | `controllerState` | module | `QueryResult<{ xact_start: Date \| null; }>` | sim | chamada connection.clientA.query |
| 565 | `batchResult` | module | `{ ok: true; counts: { clients: number; deals: number; tasks: number; total: number; }; archivedReferencesPe…` | sim | alias batchPromise |
| 573 | `individualResult` | module | `{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }` | sim | alias individualPromise |
| 575 | `task` | module | `{ id: string; organizationId: string; title: string; description: string \| null; priority: "low" \| "norma…` | sim | acesso indexado |
| 578 | `taskAudit` | module | `{ id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entityId: st…` | sim | chamada (await auditRows()).filter |
| 584 | `cleanupErrors` | module | `unknown[]` | sim | lista |
| 589 | `error` | module | `unknown` | não | sem inicializador |
| 593 | `pending` | module | `PromiseSettledResult<{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: u…` | sim | chamada Promise.allSettled |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 32 | `clients` | `{ id: string; name: string; email: string \| null; createdAt: Date; updatedAt: Date; organizationId: string…` | module |
| 32 | `deals` | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; ownerUserId: string \| null; delete…` | module |
| 32 | `tasks` | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; status: "todo" \| "in_progress" \| …` | module |
| 33 | `source` | `{ clients: string[]; deals: string[]; tasks: string[]; }` | module |
| 33 | `clients` | `string[]` | module |
| 33 | `deals` | `string[]` | module |
| 33 | `tasks` | `string[]` | module |
| 33 | `untouched` | `{ clients: string; deals: string; tasks: string; }` | module |
| 33 | `clients` | `string` | module |
| 33 | `deals` | `string` | module |
| 33 | `tasks` | `string` | module |
| 33 | `tenantB` | `{ clients: string; deals: string; tasks: string; }` | module |
| 33 | `clients` | `string` | module |
| 33 | `deals` | `string` | module |
| 33 | `tasks` | `string` | module |
| 258 | `code` | `string` | findNotNullViolation |
| 258 | `table` | `string \| undefined` | findNotNullViolation |
| 258 | `column` | `string \| undefined` | findNotNullViolation |
| 263 | `code` | `unknown` | findNotNullViolation |
| 263 | `table` | `unknown` | findNotNullViolation |
| 263 | `column` | `unknown` | findNotNullViolation |
| 263 | `cause` | `unknown` | findNotNullViolation |
| 273 | `pid` | `number` | module |
| 274 | `state` | `string` | module |
| 275 | `wait_event_type` | `string \| null` | module |
| 276 | `wait_event` | `string \| null` | module |
| 277 | `blocking_pids` | `number[]` | module |
| 278 | `query` | `string` | module |
| 293 | `pid` | `string \| number` | get |
| 335 | `datname` | `string` | waitForBlockedSession |
| 335 | `usename` | `string` | waitForBlockedSession |
| 349 | `pid` | `number` | waitForBlockedSession |
| 466 | `fromUserId` | `string` | module |
| 466 | `toUserId` | `string \| null` | module |
| 545 | `pid` | `number` | module |
| 547 | `pid` | `number` | module |
| 560 | `xact_start` | `Date \| null` | module |

## tests/integration/multitenant-isolation.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 9 | `runtime` | module | `{ db: NodePgDatabase<typeof schema> \| undefined; role: string; orgId: string; userId: string; }` | sim | chamada vi.hoisted |
| 15 | `actual` | module | `typeof import("<projeto>/src/lib/workspace")` | sim | chamada importOriginal |
| 16 | `makeContext` | module | `(allowed: string[]) => { organization: { id: string; name: string; }; user: { id: string; name: string; ema…` | sim | função/callback |
| 33 | `connection` | module | `IsolatedConnectionPair` | não | sem inicializador |
| 34 | `db` | module | `NodePgDatabase<typeof schema>` | não | sem inicializador |
| 36 | `fixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 37 | `orgB` | module | `string` | não | sem inicializador |
| 38 | `userB` | module | `string` | não | sem inicializador |
| 39 | `ids` | module | `{ clientA: string; clientB: string; dealA: string; dealB: string; taskB: string; contactB: string; }` | não | sem inicializador |
| 40 | `actions` | module | `typeof import("<projeto>/src/modules/clients/actions") & typeof import("<caminho-local>` | não | sem inicializador |
| 54 | `createdFixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada seedTeamRbacFixture |
| 66 | `clientA` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.clients).values({ organizationId: createdFixture.orga |
| 67 | `clientB` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.clients).values({ organizationId: orgB, kind: "compan |
| 68 | `dealA` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.deals).values({ organizationId: createdFixture.organi |
| 69 | `dealB` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.deals).values({ organizationId: orgB, clientId: clien |
| 70 | `taskB` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.tasks).values({ organizationId: orgB, title: "B secre |
| 71 | `contactB` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.contacts).values({ organizationId: orgB, companyClien |
| 75 | `currentFixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | alias fixture |
| 76 | `tenantBId` | module | `string` | sim | alias orgB |
| 77 | `tenantBUserId` | module | `string` | sim | alias userB |
| 80 | `cleanupErrors` | module | `unknown[]` | sim | lista |
| 81 | `tenantBOrganizationRemoved` | module | `boolean` | sim | literal escalar (valor omitido) |
| 101 | `organizations` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 101 | `memberships` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 101 | `clients` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 101 | `deals` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 101 | `tasks` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 101 | `contacts` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 101 | `activities` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 101 | `audits` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 101 | `invitations` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 101 | `guards` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 116 | `error` | module | `unknown` | não | sem inicializador |
| 121 | `fixtureRemoved` | module | `boolean` | sim | literal escalar (valor omitido) |
| 125 | `organizations` | module | `[{ id: string; }[], { id: string; }[]]` | sim | chamada Promise.all |
| 125 | `memberships` | module | `[{ id: string; }[], { id: string; }[]]` | sim | chamada Promise.all |
| 133 | `error` | module | `unknown` | não | sem inicializador |
| 145 | `users` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[]]` | sim | chamada Promise.all |
| 145 | `accounts` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[]]` | sim | chamada Promise.all |
| 145 | `sessions` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[]]` | sim | chamada Promise.all |
| 151 | `error` | module | `unknown` | não | sem inicializador |
| 168 | `currentFixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 169 | `updateClient` | module | `typeof import("<projeto>/src/modules/clients/actions") & typeof import("<caminho-local>` | sim | alias actions |
| 170 | `result` | module | `ActionResult` | sim | chamada updateClient |
| 182 | `currentFixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 183 | `contact` | module | `{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }` | sim | chamada actions.createContact |
| 189 | `currentFixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 197 | `currentFixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 198 | `clientBefore` | module | `{ id: string; ownerUserId: string \| null; }[]` | sim | chamada db.select({ id: schema.clients.id, ownerUserId: schema.clients.ownerUs |
| 200 | `tenantBBefore` | module | `{ id: string; ownerUserId: string \| null; }[]` | sim | chamada db.select({ id: schema.clients.id, ownerUserId: schema.clients.ownerUs |
| 202 | `directError` | module | `unknown` | não | sem inicializador |
| 205 | `error` | module | `unknown` | não | sem inicializador |
| 216 | `result` | module | `ActionResult` | sim | chamada actions.createClient |
| 219 | `stored` | module | `{ id: string; organizationId: string; kind: "person" \| "company"; name: string; email: string \| null; pho…` | sim | chamada db.select().from(schema.clients).where |
| 226 | `currentFixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 227 | `activeMemberId` | module | `string` | sim | propriedade userId |
| 228 | `activeMemberClient` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.clients).values({ organizationId: currentFixture.orga |
| 233 | `removedAssignmentError` | module | `unknown` | não | sem inicializador |
| 236 | `error` | module | `unknown` | não | sem inicializador |
| 252 | `currentFixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 253 | `second` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.clients).values({ organizationId: currentFixture.orga |
| 254 | `inconsistentDeal` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.deals).values({ organizationId: currentFixture.organi |
| 255 | `catalog` | module | `QueryResult<Record<string, unknown>>` | sim | chamada db.execute |
| 263 | `integrityInstalled` | module | `boolean` | sim | chamada Boolean |
| 264 | `directInsertError` | module | `unknown` | não | sem inicializador |
| 267 | `error` | module | `unknown` | não | sem inicializador |
| 279 | `taskAuditBefore` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.auditLogs.id }).from(schema.auditLogs) .where |
| 289 | `currentFixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 290 | `constraint` | module | `QueryResult<Record<string, unknown>>` | sim | chamada db.execute |
| 296 | `clientA2` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.clients).values({ organizationId: currentFixture.orga |
| 297 | `activeTask` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.tasks).values({ organizationId: currentFixture.organi |
| 301 | `archivedTask` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.tasks).values({ organizationId: currentFixture.organi |
| 306 | `dealBefore` | module | `{ clientId: string; title: string; }[]` | sim | chamada db.select({ clientId: schema.deals.clientId, title: schema.deals.title |
| 308 | `tenantBBefore` | module | `{ deal: string; task: string \| null; }[]` | sim | chamada db.select({ deal: schema.deals.clientId, task: schema.tasks.clientId } |
| 311 | `auditBefore` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.auditLogs.id }).from(schema.auditLogs) .where |
| 314 | `rejected` | module | `DealLinkedTasksConflict \| { ok: false; message: string; id?: undefined; } \| { ok: true; id: string; messa…` | sim | chamada actions.updateDeal |
| 339 | `accepted` | module | `DealLinkedTasksConflict \| { ok: false; message: string; id?: undefined; } \| { ok: true; id: string; messa…` | sim | chamada actions.updateDeal |
| 350 | `currentFixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 351 | `clientA2` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.clients).values({ organizationId: currentFixture.orga |
| 352 | `task` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.tasks).values({ organizationId: currentFixture.organi |
| 357 | `blocker` | module | `PoolClient` | sim | propriedade clientA |
| 358 | `blockerTransactionOpen` | module | `boolean` | sim | literal escalar (valor omitido) |
| 359 | `actionResult` | module | `Promise<{ kind: "result"; value: Awaited<ReturnType<typeof actions.updateDeal>>; } \| { kind: "error"; erro…` | não | sem inicializador |
| 363 | `blockerPid` | module | `number` | sim | propriedade pid |
| 373 | `outcome` | module | `{ kind: "result"; value: Awaited<ReturnType<typeof actions.updateDeal>>; } \| { kind: "error"; error: unkno…` | sim | alias actionResult |
| 389 | `currentFixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 391 | `exportClients` | module | `typeof import("<projeto>/src/app/api/export/clients.csv/route")` | sim | chamada import |
| 392 | `response` | module | `Response` | sim | chamada exportClients |
| 402 | `seen` | findPostgresError | `Set<unknown>` | sim | instância Set |
| 403 | `candidate` | findPostgresError | `unknown` | sim | alias error |
| 404 | `fallback` | findPostgresError | `{ code?: string; constraint?: string; } \| undefined` | não | sem inicializador |
| 407 | `value` | findPostgresError | `{ code?: unknown; constraint?: unknown; cause?: unknown; }` | sim | alias candidate |
| 409 | `found` | findPostgresError | `{ code: string; constraint: string \| undefined; }` | sim | objeto/configuração |
| 422 | `deadline` | waitForBlockedDealUpdate | `number` | sim | expressão + |
| 424 | `waiting` | waitForBlockedDealUpdate | `QueryResult<{ pid: number; }>` | sim | chamada pool.query |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 39 | `clientA` | `string` | module |
| 39 | `clientB` | `string` | module |
| 39 | `dealA` | `string` | module |
| 39 | `dealB` | `string` | module |
| 39 | `taskB` | `string` | module |
| 39 | `contactB` | `string` | module |
| 263 | `installed` | `boolean \| undefined` | module |
| 294 | `validated` | `boolean \| undefined` | module |
| 359 | `kind` | `"result"` | module |
| 359 | `value` | `DealLinkedTasksConflict \| { ok: false; message: string; id?: undefined; } \| { ok: true; id: string; messa…` | module |
| 359 | `kind` | `"error"` | module |
| 359 | `error` | `unknown` | module |
| 363 | `pid` | `number` | module |
| 401 | `code` | `string \| undefined` | findPostgresError |
| 401 | `constraint` | `string \| undefined` | findPostgresError |
| 404 | `code` | `string \| undefined` | findPostgresError |
| 404 | `constraint` | `string \| undefined` | findPostgresError |
| 407 | `code` | `unknown` | findPostgresError |
| 407 | `constraint` | `unknown` | findPostgresError |
| 407 | `cause` | `unknown` | findPostgresError |
| 424 | `pid` | `number` | waitForBlockedDealUpdate |

## tests/integration/organization-creation-owner-invariant.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 9 | `runtime` | module | `{ db: NodePgDatabase<typeof schema> \| undefined; }` | sim | chamada vi.hoisted |
| 19 | `connection` | module | `IsolatedConnectionPair \| undefined` | não | sem inicializador |
| 20 | `db` | module | `NodePgDatabase<typeof schema>` | não | sem inicializador |
| 21 | `fixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 22 | `temporaryOrganizationIds` | module | `string[]` | sim | lista |
| 23 | `createBootstrapOrganizationWithOwner` | module | `(input: BootstrapOrganizationInput, createId?: () => string) => Promise<{ organization: { id: string; name:…` | não | sem inicializador |
| 39 | `current` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | alias fixture |
| 40 | `organizationIds` | module | `string[]` | sim | lista |
| 43 | `errors` | module | `unknown[]` | sim | lista |
| 52 | `organizations` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[]]` | sim | chamada Promise.all |
| 52 | `memberships` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[]]` | sim | chamada Promise.all |
| 52 | `guards` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[]]` | sim | chamada Promise.all |
| 61 | `error` | module | `unknown` | não | sem inicializador |
| 69 | `organizations` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[]]` | sim | chamada Promise.all |
| 69 | `memberships` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[]]` | sim | chamada Promise.all |
| 69 | `guards` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[]]` | sim | chamada Promise.all |
| 78 | `error` | module | `unknown` | não | sem inicializador |
| 97 | `visited` | findPostgresError | `Set<object>` | sim | instância Set |
| 98 | `current` | findPostgresError | `unknown` | sim | alias error |
| 101 | `candidate` | findPostgresError | `{ code?: unknown; constraint?: unknown; cause?: unknown; }` | sim | alias current |
| 114 | `thrown` | expectOwnerConstraintFailure | `unknown` | não | sem inicializador |
| 117 | `error` | expectOwnerConstraintFailure | `unknown` | não | sem inicializador |
| 124 | `thrown` | expectForeignKeyFailure | `unknown` | não | sem inicializador |
| 127 | `error` | expectForeignKeyFailure | `unknown` | não | sem inicializador |
| 134 | `organizations` | expectNoOrganizationState | `[{ id: string; }[], { id: string; }[], { id: string; }[]]` | sim | chamada Promise.all |
| 134 | `memberships` | expectNoOrganizationState | `[{ id: string; }[], { id: string; }[], { id: string; }[]]` | sim | chamada Promise.all |
| 134 | `guards` | expectNoOrganizationState | `[{ id: string; }[], { id: string; }[], { id: string; }[]]` | sim | chamada Promise.all |
| 144 | `id` | newOrganizationId | `string` | sim | TemplateExpression |
| 150 | `deadline` | waitForBlockedSession | `number` | sim | expressão + |
| 151 | `lastState` | waitForBlockedSession | `unknown` | não | sem inicializador |
| 156 | `result` | waitForBlockedSession | `QueryResult<{ pid: number; state: string; wait_event_type: string \| null; wait_event: string \| null; bloc…` | sim | chamada connection!.poolB.query |
| 170 | `row` | waitForBlockedSession | `{ pid: number; state: string; wait_event_type: string \| null; wait_event: string \| null; blocking_pids: n…` | sim | acesso indexado |
| 179 | `organizationId` | module | `string` | sim | chamada newOrganizationId |
| 187 | `organizationId` | module | `string` | sim | chamada newOrganizationId |
| 201 | `organizationId` | module | `string` | sim | chamada newOrganizationId |
| 202 | `ownerUserId` | module | `string` | sim | propriedade userId |
| 220 | `organizationId` | module | `string` | sim | chamada newOrganizationId |
| 234 | `current` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 235 | `organizationId` | module | `string` | sim | chamada newOrganizationId |
| 236 | `beforeOrganization` | module | `{ id: string; name: string; slug: string; logo: string \| null; metadata: string \| null; createdAt: Date; }[]` | sim | chamada db.select().from(schema.organization).where |
| 237 | `beforeOwners` | module | `{ userId: string; role: string; }[]` | sim | chamada db.select({ userId: schema.member.userId, role: schema.member.role }). |
| 251 | `organizationId` | module | `string` | sim | chamada newOrganizationId |
| 260 | `organizationId` | module | `string` | sim | chamada newOrganizationId |
| 261 | `memberId` | module | `string` | sim | TemplateExpression |
| 262 | `generatedIds` | module | `string[]` | sim | lista |
| 263 | `result` | module | `{ organization: { id: string; name: string; createdAt: Date; slug: string; logo: string \| null; metadata: …` | sim | chamada createBootstrapOrganizationWithOwner |
| 276 | `organizationId` | module | `string` | sim | chamada newOrganizationId |
| 277 | `ownerUserId` | module | `string` | sim | propriedade userId |
| 278 | `memberId` | module | `string` | sim | TemplateExpression |
| 297 | `current` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 298 | `organizationId` | module | `string` | sim | chamada newOrganizationId |
| 299 | `originalMemberId` | module | `string` | sim | TemplateExpression |
| 300 | `replacementMemberId` | module | `string` | sim | TemplateExpression |
| 311 | `clientA` | module | `PoolClient` | sim | propriedade clientA |
| 312 | `clientB` | module | `PoolClient` | sim | propriedade clientB |
| 313 | `transactionAOpen` | module | `boolean` | sim | literal escalar (valor omitido) |
| 314 | `transactionBOpen` | module | `boolean` | sim | literal escalar (valor omitido) |
| 315 | `replacementInsert` | module | `Promise<unknown> \| undefined` | não | sem inicializador |
| 319 | `blockerPid` | module | `{ pid: number; }[]` | sim | propriedade rows |
| 330 | `blockedPid` | module | `{ pid: number; }[]` | sim | propriedade rows |
| 337 | `observed` | module | `{ pid: number; state: string; wait_event_type: string \| null; wait_event: string \| null; blocking_pids: n…` | sim | chamada waitForBlockedSession |
| 341 | `commitError` | module | `unknown` | não | sem inicializador |
| 345 | `error` | module | `unknown` | não | sem inicializador |
| 362 | `cleanupErrors` | module | `unknown[]` | sim | lista |
| 364 | `error` | module | `unknown` | não | sem inicializador |
| 367 | `settled` | module | `[PromiseSettledResult<unknown>]` | sim | chamada Promise.allSettled |
| 368 | `rejection` | module | `PromiseRejectedResult \| undefined` | sim | chamada settled.find |
| 372 | `error` | module | `unknown` | não | sem inicializador |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 96 | `code` | `string \| undefined` | findPostgresError |
| 96 | `constraint` | `string \| undefined` | findPostgresError |
| 101 | `code` | `unknown` | findPostgresError |
| 101 | `constraint` | `unknown` | findPostgresError |
| 101 | `cause` | `unknown` | findPostgresError |
| 157 | `pid` | `number` | waitForBlockedSession |
| 158 | `state` | `string` | waitForBlockedSession |
| 159 | `wait_event_type` | `string \| null` | waitForBlockedSession |
| 160 | `wait_event` | `string \| null` | waitForBlockedSession |
| 161 | `blocking_pids` | `number[]` | waitForBlockedSession |
| 162 | `query` | `string` | waitForBlockedSession |
| 319 | `pid` | `number` | module |
| 330 | `pid` | `number` | module |

## tests/integration/organization-deletion-disabled.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 14 | `runtime` | module | `{ db: NodePgDatabase<typeof schema> \| undefined; }` | sim | chamada vi.hoisted |
| 23 | `connection` | module | `IsolatedConnectionPair \| undefined` | não | sem inicializador |
| 24 | `db` | module | `NodePgDatabase<typeof schema>` | não | sem inicializador |
| 25 | `fixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 26 | `extraOrganization` | module | `ExtraOrganization \| undefined` | não | sem inicializador |
| 27 | `commercial` | module | `CommercialFixture \| undefined` | não | sem inicializador |
| 28 | `postAuth` | module | `(request: Request) => Promise<Response>` | não | sem inicializador |
| 29 | `restoreEnvironment` | module | `(() => void) \| undefined` | não | sem inicializador |
| 37 | `oldSecret` | module | `string \| undefined` | sim | propriedade BETTER_AUTH_SECRET |
| 38 | `oldUrl` | module | `string \| undefined` | sim | propriedade BETTER_AUTH_URL |
| 56 | `error` | module | `unknown` | não | sem inicializador |
| 64 | `errors` | module | `unknown[]` | sim | lista |
| 65 | `currentExtra` | module | `ExtraOrganization \| undefined` | sim | alias extraOrganization |
| 70 | `error` | module | `unknown` | não | sem inicializador |
| 72 | `currentFixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | alias fixture |
| 76 | `error` | module | `unknown` | não | sem inicializador |
| 112 | `organizationId` | seedCommercialFixture | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 112 | `actors` | seedCommercialFixture | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 114 | `activeClient` | seedCommercialFixture | `{ id: string; }[]` | sim | chamada tx.insert(schema.clients).values([ { organizationId, kind: "company", |
| 114 | `archivedClient` | seedCommercialFixture | `{ id: string; }[]` | sim | chamada tx.insert(schema.clients).values([ { organizationId, kind: "company", |
| 118 | `activeDeal` | seedCommercialFixture | `{ id: string; }[]` | sim | chamada tx.insert(schema.deals).values([ { organizationId, clientId: activeCli |
| 118 | `archivedDeal` | seedCommercialFixture | `{ id: string; }[]` | sim | chamada tx.insert(schema.deals).values([ { organizationId, clientId: activeCli |
| 122 | `activeTask` | seedCommercialFixture | `{ id: string; }[]` | sim | chamada tx.insert(schema.tasks).values([ { organizationId, title: `Deletion ac |
| 122 | `archivedTask` | seedCommercialFixture | `{ id: string; }[]` | sim | chamada tx.insert(schema.tasks).values([ { organizationId, title: `Deletion ac |
| 127 | `parents` | seedCommercialFixture | `({ entityType: string; entityId: string; actorUserId: string; parent: { clientId: string; dealId?: undefine…` | sim | lista |
| 135 | `audits` | seedCommercialFixture | `{ id: string; }[]` | sim | chamada tx.insert(schema.auditLogs).values(parents.map((row) => ({ organizatio |
| 139 | `activities` | seedCommercialFixture | `{ id: string; }[]` | sim | chamada tx.insert(schema.activities).values(parents.map((row) => ({ organizati |
| 150 | `organization` | captureSnapshot | `[{ id: string; name: string; slug: string; logo: string \| null; metadata: string \| null; createdAt: Date;…` | sim | chamada Promise.all |
| 150 | `memberships` | captureSnapshot | `[{ id: string; name: string; slug: string; logo: string \| null; metadata: string \| null; createdAt: Date;…` | sim | chamada Promise.all |
| 150 | `users` | captureSnapshot | `[{ id: string; name: string; slug: string; logo: string \| null; metadata: string \| null; createdAt: Date;…` | sim | chamada Promise.all |
| 150 | `accounts` | captureSnapshot | `[{ id: string; name: string; slug: string; logo: string \| null; metadata: string \| null; createdAt: Date;…` | sim | chamada Promise.all |
| 150 | `sessions` | captureSnapshot | `[{ id: string; name: string; slug: string; logo: string \| null; metadata: string \| null; createdAt: Date;…` | sim | chamada Promise.all |
| 150 | `clients` | captureSnapshot | `[{ id: string; name: string; slug: string; logo: string \| null; metadata: string \| null; createdAt: Date;…` | sim | chamada Promise.all |
| 150 | `deals` | captureSnapshot | `[{ id: string; name: string; slug: string; logo: string \| null; metadata: string \| null; createdAt: Date;…` | sim | chamada Promise.all |
| 150 | `tasks` | captureSnapshot | `[{ id: string; name: string; slug: string; logo: string \| null; metadata: string \| null; createdAt: Date;…` | sim | chamada Promise.all |
| 150 | `activities` | captureSnapshot | `[{ id: string; name: string; slug: string; logo: string \| null; metadata: string \| null; createdAt: Date;…` | sim | chamada Promise.all |
| 150 | `audits` | captureSnapshot | `[{ id: string; name: string; slug: string; logo: string \| null; metadata: string \| null; createdAt: Date;…` | sim | chamada Promise.all |
| 166 | `organizationId` | expectDeletionDisabled | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 166 | `actors` | expectDeletionDisabled | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 167 | `cookie` | expectDeletionDisabled | `string` | sim | chamada signIn |
| 168 | `userIds` | expectDeletionDisabled | `string[]` | sim | chamada Object.values(actors).map |
| 169 | `before` | expectDeletionDisabled | `{ organization: { id: string; name: string; slug: string; logo: string \| null; metadata: string \| null; c…` | sim | chamada captureSnapshot |
| 170 | `response` | expectDeletionDisabled | `Response` | sim | chamada request |
| 171 | `body` | expectDeletionDisabled | `{ code?: string; message?: string; }` | sim | chamada response.json |
| 198 | `organizations` | assertOrganizationRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 198 | `memberships` | assertOrganizationRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 198 | `clients` | assertOrganizationRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 198 | `contacts` | assertOrganizationRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 198 | `deals` | assertOrganizationRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 198 | `tasks` | assertOrganizationRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 198 | `activities` | assertOrganizationRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 198 | `audits` | assertOrganizationRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 198 | `invitations` | assertOrganizationRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 209 | `authRows` | assertOrganizationRemoved | `number[]` | sim | condição derivada |
| 210 | `users` | assertOrganizationRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[]]` | sim | chamada Promise.all |
| 210 | `accounts` | assertOrganizationRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[]]` | sim | chamada Promise.all |
| 210 | `sessions` | assertOrganizationRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[]]` | sim | chamada Promise.all |
| 228 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 228 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 229 | `userIds` | module | `string[]` | sim | chamada Object.values(actors).map |
| 230 | `before` | module | `{ organization: { id: string; name: string; slug: string; logo: string \| null; metadata: string \| null; c…` | sim | chamada captureSnapshot |
| 231 | `response` | module | `Response` | sim | chamada request |
| 237 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 237 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 238 | `cookie` | module | `string` | sim | chamada signIn |
| 239 | `signOut` | module | `Response` | sim | chamada postAuth |
| 243 | `userIds` | module | `string[]` | sim | chamada Object.values(actors).map |
| 244 | `before` | module | `{ organization: { id: string; name: string; slug: string; logo: string \| null; metadata: string \| null; c…` | sim | chamada captureSnapshot |
| 245 | `response` | module | `Response` | sim | chamada request |
| 251 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 252 | `id` | module | `string` | sim | TemplateExpression |
| 253 | `userId` | module | `string` | sim | TemplateExpression |
| 255 | `foreignData` | module | `{ clientId: string; auditId: string; }` | sim | chamada db.transaction |
| 259 | `client` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.clients).values({ organizationId: id, kind: "company" |
| 260 | `audit` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.auditLogs).values({ organizationId: id, actorUserId: |
| 264 | `cookie` | module | `string` | sim | chamada signIn |
| 265 | `beforeA` | module | `{ organization: { id: string; name: string; slug: string; logo: string \| null; metadata: string \| null; c…` | sim | chamada captureSnapshot |
| 266 | `foreignRecords` | module | `{ clientIds: string[]; dealIds: never[]; taskIds: never[]; activityIds: never[]; auditIds: string[]; }` | sim | objeto/configuração |
| 267 | `beforeB` | module | `{ organization: { id: string; name: string; slug: string; logo: string \| null; metadata: string \| null; c…` | sim | chamada captureSnapshot |
| 268 | `response` | module | `Response` | sim | chamada request |
| 272 | `afterB` | module | `{ organization: { id: string; name: string; slug: string; logo: string \| null; metadata: string \| null; c…` | sim | chamada captureSnapshot |
| 282 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 282 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 283 | `cookie` | module | `string` | sim | chamada signIn |
| 284 | `response` | module | `Response` | sim | chamada postAuth |
| 297 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 297 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 298 | `cookie` | module | `string` | sim | chamada signIn |
| 299 | `response` | module | `Response` | sim | chamada postAuth |
| 313 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 313 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 314 | `cookie` | module | `string` | sim | chamada signIn |
| 315 | `response` | module | `Response` | sim | chamada postAuth |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 11 | `id` | `string` | module |
| 11 | `userId` | `string` | module |
| 12 | `clientIds` | `string[]` | module |
| 12 | `dealIds` | `string[]` | module |
| 12 | `taskIds` | `string[]` | module |
| 12 | `activityIds` | `string[]` | module |
| 12 | `auditIds` | `string[]` | module |
| 171 | `code` | `string \| undefined` | expectDeletionDisabled |
| 171 | `message` | `string \| undefined` | expectDeletionDisabled |
| 270 | `code` | `string \| undefined` | module |

## tests/integration/organization-last-owner-concurrency.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 9 | `runtime` | module | `{ db: NodePgDatabase<typeof schema> \| undefined; }` | sim | chamada vi.hoisted |
| 21 | `connection` | module | `IsolatedConnectionPair \| undefined` | não | sem inicializador |
| 22 | `db` | module | `NodePgDatabase<typeof schema>` | não | sem inicializador |
| 23 | `fixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 24 | `secondaryOrganizationId` | module | `string \| undefined` | não | sem inicializador |
| 25 | `postAuth` | module | `(request: Request) => Promise<Response>` | não | sem inicializador |
| 26 | `restoreEnvironment` | module | `(() => void) \| undefined` | não | sem inicializador |
| 37 | `oldSecret` | module | `string \| undefined` | sim | propriedade BETTER_AUTH_SECRET |
| 38 | `oldUrl` | module | `string \| undefined` | sim | propriedade BETTER_AUTH_URL |
| 55 | `current` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | alias fixture |
| 56 | `secondaryId` | module | `string \| undefined` | sim | alias secondaryOrganizationId |
| 59 | `errors` | module | `unknown[]` | sim | lista |
| 65 | `remaining` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.organization.id }).from(schema.organization) .w |
| 68 | `error` | module | `unknown` | não | sem inicializador |
| 74 | `error` | module | `unknown` | não | sem inicializador |
| 111 | `row` | ownerCount | `{ total: number; }[]` | sim | chamada db.select({ total: count() }).from(schema.member).where |
| 122 | `visited` | findPostgresError | `Set<object>` | sim | instância Set |
| 123 | `current` | findPostgresError | `unknown` | sim | alias error |
| 126 | `candidate` | findPostgresError | `{ code?: unknown; constraint?: unknown; cause?: unknown; }` | sim | alias current |
| 139 | `client` | expectInvariantFailureAtCommit | `PoolClient` | sim | chamada connection!.poolB.connect |
| 140 | `failure` | expectInvariantFailureAtCommit | `unknown` | não | sem inicializador |
| 146 | `error` | expectInvariantFailureAtCommit | `unknown` | não | sem inicializador |
| 150 | `error` | expectInvariantFailureAtCommit | `unknown` | não | sem inicializador |
| 156 | `postgresError` | expectInvariantFailureAtCommit | `{ code?: string; constraint?: string; } \| undefined` | sim | chamada findPostgresError |
| 165 | `client` | beginOwnerDeleteGate | `PoolClient` | sim | propriedade clientB |
| 168 | `pidResult` | beginOwnerDeleteGate | `QueryResult<{ pid: number; }>` | sim | chamada client.query |
| 169 | `organizationId` | beginOwnerDeleteGate | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 169 | `actors` | beginOwnerDeleteGate | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 170 | `locked` | beginOwnerDeleteGate | `QueryResult<{ id: string; }>` | sim | chamada client.query |
| 176 | `error` | beginOwnerDeleteGate | `unknown` | não | sem inicializador |
| 185 | `deadline` | waitForBlockedOwnerDeletes | `number` | sim | expressão + |
| 186 | `latest` | waitForBlockedOwnerDeletes | `BlockedSession[]` | sim | lista |
| 191 | `result` | waitForBlockedOwnerDeletes | `QueryResult<BlockedSession>` | sim | chamada connection!.poolB.query |
| 210 | `orgRows` | assertFixtureRemoved | `{ id: string; }[]` | sim | chamada db.select({ id: schema.organization.id }).from(schema.organization).wh |
| 211 | `memberRows` | assertFixtureRemoved | `{ id: string; }[]` | sim | chamada db.select({ id: schema.member.id }).from(schema.member).where |
| 212 | `guardRows` | assertFixtureRemoved | `{ id: string; }[]` | sim | chamada db.select({ id: schema.organizationOwnerGuard.organizationId }).from(s |
| 214 | `ids` | assertFixtureRemoved | `string[]` | sim | chamada Object.values(current.actors).map |
| 215 | `userRows` | assertFixtureRemoved | `{ id: string; }[]` | sim | chamada db.select({ id: schema.user.id }).from(schema.user).where |
| 216 | `accountRows` | assertFixtureRemoved | `{ id: string; }[]` | sim | chamada db.select({ id: schema.account.id }).from(schema.account).where |
| 217 | `sessionRows` | assertFixtureRemoved | `{ id: string; }[]` | sim | chamada db.select({ id: schema.session.id }).from(schema.session).where |
| 224 | `current` | runControlledRace | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 225 | `cookieA` | runControlledRace | `string` | sim | chamada signIn |
| 226 | `cookieB` | runControlledRace | `string` | sim | chamada signIn |
| 227 | `gate` | runControlledRace | `{ client: PoolClient; pid: number; }` | sim | chamada beginOwnerDeleteGate |
| 228 | `operations` | runControlledRace | `Promise<Response>[]` | sim | lista |
| 230 | `observationError` | runControlledRace | `unknown` | não | sem inicializador |
| 231 | `releaseError` | runControlledRace | `unknown` | não | sem inicializador |
| 248 | `error` | runControlledRace | `unknown` | não | sem inicializador |
| 253 | `error` | runControlledRace | `unknown` | não | sem inicializador |
| 256 | `results` | runControlledRace | `PromiseSettledResult<Response>[]` | sim | chamada Promise.allSettled |
| 258 | `rejected` | runControlledRace | `PromiseRejectedResult[]` | sim | chamada results.filter |
| 269 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 269 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 271 | `before` | module | `{ id: string; organizationId: string; userId: string; role: string; createdAt: Date; }[]` | sim | chamada membershipSnapshot |
| 272 | `organizationBefore` | module | `{ id: string; name: string; slug: string; logo: string \| null; metadata: string \| null; createdAt: Date; }[]` | sim | chamada db.select().from(schema.organization).where |
| 274 | `responses` | module | `Response[]` | sim | chamada runControlledRace |
| 276 | `successfulResponses` | module | `Response[]` | sim | chamada responses.filter |
| 277 | `rejectedResponses` | module | `Response[]` | sim | chamada responses.filter |
| 282 | `response` | module | `Response` | não | sem inicializador |
| 285 | `body` | module | `any` | sim | chamada response.json |
| 290 | `internalDetails` | module | `string` | sim | chamada JSON.stringify(body).replace |
| 294 | `ownersRemaining` | module | `number` | sim | chamada ownerCount |
| 295 | `after` | module | `{ id: string; organizationId: string; userId: string; role: string; createdAt: Date; }[]` | sim | chamada membershipSnapshot |
| 307 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 307 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 309 | `cookie` | module | `string` | sim | chamada signIn |
| 310 | `leaveResponse` | module | `Response` | sim | chamada leaveRequest |
| 313 | `removeResponse` | module | `Response` | sim | chamada removeRequest |
| 324 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 324 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 344 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 344 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 351 | `memberships` | module | `{ id: string; organizationId: string; userId: string; role: string; createdAt: Date; }[]` | sim | chamada membershipSnapshot |
| 359 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 359 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 360 | `client` | module | `PoolClient` | sim | chamada connection!.poolB.connect |
| 365 | `error` | module | `unknown` | não | sem inicializador |
| 373 | `memberships` | module | `{ id: string; organizationId: string; userId: string; role: string; createdAt: Date; }[]` | sim | chamada membershipSnapshot |
| 380 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 380 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 381 | `suffix` | module | `string` | sim | chamada randomBytes(12).toString |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 121 | `code` | `string \| undefined` | findPostgresError |
| 121 | `constraint` | `string \| undefined` | findPostgresError |
| 126 | `code` | `unknown` | findPostgresError |
| 126 | `constraint` | `unknown` | findPostgresError |
| 126 | `cause` | `unknown` | findPostgresError |
| 168 | `pid` | `number` | beginOwnerDeleteGate |
| 170 | `id` | `string` | beginOwnerDeleteGate |
| 182 | `pid` | `number` | module |
| 182 | `state` | `string` | module |
| 182 | `wait_event_type` | `string \| null` | module |
| 182 | `wait_event` | `string \| null` | module |
| 182 | `blocking_pids` | `number[]` | module |
| 182 | `query` | `string` | module |
| 312 | `message` | `string \| undefined` | module |
| 315 | `message` | `string \| undefined` | module |

## tests/integration/reassignment-actions-better-auth.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 9 | `runtime` | module | `{ db: NodePgDatabase<typeof schema> \| undefined; cookie: string; }` | sim | chamada vi.hoisted |
| 34 | `operations` | module | `readonly ["client", "deal", "task"]` | sim | lista |
| 35 | `actors` | module | `readonly ["admin", "member"]` | sim | lista |
| 37 | `connection` | module | `IsolatedConnectionPair` | não | sem inicializador |
| 38 | `db` | module | `NodePgDatabase<typeof schema>` | não | sem inicializador |
| 39 | `fixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 40 | `organizationB` | module | `string` | sim | literal string (valor omitido) |
| 41 | `userB` | module | `string` | sim | literal string (valor omitido) |
| 42 | `userWithoutMembership` | module | `string` | sim | literal string (valor omitido) |
| 43 | `records` | module | `Record<Operation, OperationRecord>` | não | sem inicializador |
| 44 | `postAuth` | module | `(request: Request) => Promise<Response>` | não | sem inicializador |
| 45 | `restoreAuthEnvironment` | module | `(() => void) \| undefined` | não | sem inicializador |
| 53 | `previousSecret` | module | `string \| undefined` | sim | propriedade BETTER_AUTH_SECRET |
| 54 | `previousUrl` | module | `string \| undefined` | sim | propriedade BETTER_AUTH_URL |
| 64 | `route` | module | `typeof import("<projeto>/src/app/api/auth/[...all]/route")` | sim | chamada import |
| 82 | `clientA` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.clients).values({ organizationId: fixture!.organizati |
| 88 | `dealA` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.deals).values({ organizationId: fixture!.organization |
| 95 | `taskA` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.tasks).values({ organizationId: fixture!.organization |
| 104 | `clientB` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.clients).values({ organizationId: organizationB, kind |
| 110 | `dealB` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.deals).values({ organizationId: organizationB, client |
| 117 | `taskB` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.tasks).values({ organizationId: organizationB, title: |
| 136 | `errors` | module | `unknown[]` | sim | lista |
| 137 | `fixtureToClean` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | alias fixture |
| 157 | `organizationResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.organization.id }).from(schema.organization).wh |
| 158 | `userResidue` | module | `{ id: string; }[][]` | sim | chamada Promise.all |
| 159 | `authResidue` | module | `number[]` | sim | chamada Promise.all |
| 160 | `accounts` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.account.id }).from(schema.account).where |
| 161 | `sessions` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.session.id }).from(schema.session).where |
| 166 | `error` | module | `unknown` | não | sem inicializador |
| 172 | `error` | module | `unknown` | não | sem inicializador |
| 178 | `orgId` | module | `string` | sim | propriedade organizationId |
| 179 | `organizationResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.organization.id }).from(schema.organization).wh |
| 180 | `userIds` | module | `string[]` | sim | chamada Object.values(fixtureToClean.actors).map |
| 181 | `userResidue` | module | `{ id: string; }[][]` | sim | chamada Promise.all |
| 182 | `authResidue` | module | `number[]` | sim | chamada Promise.all |
| 183 | `accounts` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.account.id }).from(schema.account).where |
| 184 | `sessions` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.session.id }).from(schema.session).where |
| 187 | `clientResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.clients.id }).from(schema.clients).where |
| 188 | `dealResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.deals.id }).from(schema.deals).where |
| 189 | `taskResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.tasks.id }).from(schema.tasks).where |
| 190 | `activityResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.activities.id }).from(schema.activities).where |
| 191 | `auditResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where |
| 192 | `memberResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.member.id }).from(schema.member).where |
| 196 | `error` | module | `unknown` | não | sem inicializador |
| 228 | `input` | runAction | `{ organizationId?: string \| undefined; clientId: string; newUserId: string \| null; } \| { organizationId?…` | sim | chamada inputFor |
| 230 | `reassignClientOwner` | runAction | `typeof import("<projeto>/src/modules/clients/actions")` | sim | chamada import |
| 234 | `reassignDealOwner` | runAction | `typeof import("<projeto>/src/modules/deals/actions")` | sim | chamada import |
| 237 | `reassignTaskAssignee` | runAction | `typeof import("<projeto>/src/modules/tasks/actions")` | sim | chamada import |
| 242 | `cookie` | signIn | `string` | sim | chamada signInAndGetCookie |
| 268 | `rows` | databaseSessionId | `{ id: string; }[]` | sim | chamada db.select({ id: schema.session.id }).from(schema.session).where |
| 275 | `testActors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 275 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 292 | `before` | module | `unknown` | sim | chamada currentRecord |
| 301 | `before` | module | `unknown` | sim | chamada currentRecord |
| 309 | `testActors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 310 | `staleCookie` | module | `string` | sim | chamada signIn |
| 311 | `revokeResponse` | module | `Response` | sim | chamada postAuth |
| 318 | `before` | module | `unknown` | sim | chamada currentRecord |
| 325 | `testActors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 325 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 336 | `before` | module | `unknown` | sim | chamada currentRecord |
| 343 | `testActors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 345 | `sessionId` | module | `string` | sim | chamada databaseSessionId |
| 347 | `beforeA` | module | `unknown` | sim | chamada currentRecord |
| 348 | `beforeB` | module | `unknown` | sim | chamada currentRecord |
| 358 | `testActors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 360 | `clientId` | module | `string` | sim | chamada record |
| 361 | `before` | module | `unknown` | sim | chamada currentRecord |
| 362 | `realDb` | module | `NodePgDatabase<typeof schema>` | sim | propriedade db |
| 364 | `failure` | module | `unknown` | não | sem inicializador |
| 367 | `error` | module | `unknown` | não | sem inicializador |
| 387 | `insert` | get | `(target: unknown) => object` | sim | chamada Reflect.get |
| 388 | `builder` | get | `object` | sim | chamada insert.call |
| 393 | `valuesMethod` | get | `(row: Record<string, unknown>) => unknown` | sim | chamada Reflect.get |
| 397 | `value` | get | `any` | sim | chamada Reflect.get |
| 402 | `insert` | get | `(value: unknown) => unknown` | sim | chamada Reflect.get |
| 406 | `value` | get | `any` | sim | chamada Reflect.get |
| 415 | `seen` | findNotNullViolation | `Set<object>` | sim | instância Set |
| 416 | `current` | findNotNullViolation | `unknown` | sim | alias error |
| 419 | `candidate` | findNotNullViolation | `{ code?: unknown; table?: unknown; column?: unknown; cause?: unknown; }` | sim | alias current |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 32 | `aId` | `string` | module |
| 32 | `bId` | `string` | module |
| 32 | `entityType` | `string` | module |
| 414 | `code` | `string` | findNotNullViolation |
| 414 | `table` | `string \| undefined` | findNotNullViolation |
| 414 | `column` | `string \| undefined` | findNotNullViolation |
| 419 | `code` | `unknown` | findNotNullViolation |
| 419 | `table` | `unknown` | findNotNullViolation |
| 419 | `column` | `unknown` | findNotNullViolation |
| 419 | `cause` | `unknown` | findNotNullViolation |

## tests/integration/sec-01b-audit-workspace.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 9 | `runtime` | module | `{ db: NodePgDatabase<typeof schema> \| undefined; cookie: string; }` | sim | chamada vi.hoisted |
| 27 | `connection` | module | `IsolatedConnectionPair` | não | sem inicializador |
| 28 | `db` | module | `NodePgDatabase<typeof schema>` | não | sem inicializador |
| 29 | `fixtureA` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 30 | `fixtureB` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 31 | `fixtureC` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 32 | `postAuth` | module | `(request: Request) => Promise<Response>` | não | sem inicializador |
| 33 | `updateMemberRole` | module | `(memberId: string, role: string) => Promise<void>` | não | sem inicializador |
| 34 | `createClient` | module | `(input: unknown) => Promise<ActionResult>` | não | sem inicializador |
| 35 | `createDeal` | module | `(input: unknown) => Promise<{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; mess…` | não | sem inicializador |
| 36 | `createTask` | module | `(input: unknown) => Promise<{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; mess…` | não | sem inicializador |
| 37 | `selectWorkspace` | module | `(formData: FormData) => Promise<void>` | não | sem inicializador |
| 38 | `exportClients` | module | `(request: Request) => Promise<Response>` | não | sem inicializador |
| 39 | `requireApiWorkspaceRole` | module | `(allowed: WorkspaceRole[]) => Promise<{ user: { id: string; name: string; email: string; }; organization: {…` | não | sem inicializador |
| 40 | `WorkspaceAuthenticationError` | module | `typeof WorkspaceAuthenticationError` | não | sem inicializador |
| 41 | `WorkspaceSelectionRequiredError` | module | `typeof WorkspaceSelectionRequiredError` | não | sem inicializador |
| 42 | `restoreAuthEnvironment` | module | `(() => void) \| undefined` | não | sem inicializador |
| 50 | `previousSecret` | module | `string \| undefined` | sim | propriedade BETTER_AUTH_SECRET |
| 51 | `previousUrl` | module | `string \| undefined` | sim | propriedade BETTER_AUTH_URL |
| 61 | `route` | module | `typeof import("<projeto>/src/app/api/auth/[...all]/route")` | sim | chamada import |
| 79 | `fixtures` | module | `({ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; mem…` | sim | lista |
| 83 | `fixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 95 | `current` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireA |
| 97 | `tenantBMembersBefore` | module | `{ userId: string; role: string; }[]` | sim | chamada db.select({ userId: schema.member.userId, role: schema.member.role }) |
| 99 | `targetMemberId` | module | `string` | sim | propriedade memberId |
| 100 | `initialTarget` | module | `{ role: string; }[]` | sim | chamada db.select({ role: schema.member.role }).from(schema.member) .where |
| 104 | `realDb` | module | `NodePgDatabase<typeof schema> \| undefined` | sim | propriedade db |
| 107 | `injectedFailure` | module | `{ triggered: boolean; }` | sim | objeto/configuração |
| 109 | `thrown` | module | `unknown` | não | sem inicializador |
| 112 | `error` | module | `unknown` | não | sem inicializador |
| 123 | `target` | module | `{ role: string; }[]` | sim | chamada db.select({ role: schema.member.role }).from(schema.member) .where |
| 125 | `owner` | module | `{ role: string; }[]` | sim | chamada db.select({ role: schema.member.role }).from(schema.member) .where |
| 127 | `ownerPeer` | module | `{ role: string; }[]` | sim | chamada db.select({ role: schema.member.role }).from(schema.member) .where |
| 129 | `audits` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where |
| 144 | `current` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireA |
| 145 | `targetMemberId` | module | `string` | sim | propriedade memberId |
| 150 | `target` | module | `{ role: string; }[]` | sim | chamada db.select({ role: schema.member.role }).from(schema.member) .where |
| 152 | `audits` | module | `{ organizationId: string; actorUserId: string; action: string; entityType: string; entityId: string; detail…` | sim | chamada db.select({ organizationId: schema.auditLogs.organizationId, actorUser |
| 177 | `current` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireA |
| 179 | `sessionRow` | module | `{ id: string; activeOrganizationId: string \| null; }[]` | sim | chamada db.select({ id: schema.session.id, activeOrganizationId: schema.sessio |
| 184 | `selected` | module | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: Wo…` | sim | chamada requireApiWorkspaceRole |
| 186 | `storedSession` | module | `{ activeOrganizationId: string \| null; }[]` | sim | chamada db.select({ activeOrganizationId: schema.session.activeOrganizationId |
| 192 | `current` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireA |
| 196 | `membershipInB` | module | `string` | sim | TemplateExpression |
| 206 | `multiSessionRow` | module | `{ id: string; activeOrganizationId: string \| null; }[]` | sim | chamada db.select({ id: schema.session.id, activeOrganizationId: schema.sessio |
| 212 | `noContextClientName` | module | `string` | sim | TemplateExpression |
| 214 | `existingClient` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.clients).values({ organizationId: current.organizatio |
| 220 | `beforeNoContext` | module | `{ organizationId: string; clients: number; deals: number; tasks: number; }[]` | sim | chamada workspaceEntityCounts |
| 221 | `beforeNoContextAudits` | module | `{ id: string; organizationId: string; }[]` | sim | chamada db.select({ id: schema.auditLogs.id, organizationId: schema.auditLogs. |
| 233 | `unselectedExport` | module | `Response` | sim | chamada exportClients |
| 240 | `activeB` | module | `{ user: { id: string; name: string; email: string; }; organization: { id: string; name: string; }; role: Wo…` | sim | chamada requireApiWorkspaceRole |
| 246 | `sessionAfterSwitch` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.session.id }).from(schema.session) .where |
| 255 | `invalidExport` | module | `Response` | sim | chamada exportClients |
| 258 | `deniedName` | module | `string` | sim | TemplateExpression |
| 259 | `beforeInvalidContext` | module | `{ organizationId: string; clients: number; deals: number; tasks: number; }[]` | sim | chamada workspaceEntityCounts |
| 260 | `beforeInvalidAudits` | module | `{ id: string; organizationId: string; }[]` | sim | chamada db.select({ id: schema.auditLogs.id, organizationId: schema.auditLogs. |
| 282 | `removedExport` | module | `Response` | sim | chamada exportClients |
| 286 | `signOut` | module | `Response` | sim | chamada postAuth |
| 296 | `formData` | organizationIdForm | `FormData` | sim | instância FormData |
| 306 | `sessionRow` | storedActiveOrganization | `{ activeOrganizationId: string \| null; }[]` | sim | chamada db.select({ activeOrganizationId: schema.session.activeOrganizationId |
| 313 | `clientCount` | workspaceEntityCounts | `[{ value: number; }[], { value: number; }[], { value: number; }[]]` | sim | chamada Promise.all |
| 313 | `dealCount` | workspaceEntityCounts | `[{ value: number; }[], { value: number; }[], { value: number; }[]]` | sim | chamada Promise.all |
| 313 | `taskCount` | workspaceEntityCounts | `[{ value: number; }[], { value: number; }[], { value: number; }[]]` | sim | chamada Promise.all |
| 342 | `transaction` | get | `(callback: (tx: TestTransaction) => Promise<unknown>, ...args: unknown[]) => Promise<unknown>` | sim | chamada Reflect.get |
| 351 | `value` | get | `any` | sim | chamada Reflect.get |
| 368 | `insert` | get | `(value: unknown) => unknown` | sim | chamada Reflect.get |
| 372 | `value` | get | `any` | sim | chamada Reflect.get |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 337 | `triggered` | `boolean` | failOnlyAuditLogInsertInTransaction |
| 357 | `triggered` | `boolean` | failOnlyAuditLogInsert |

## tests/integration/sec-01b-rate-limit.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 5 | `connection` | module | `IsolatedConnectionPair \| undefined` | não | sem inicializador |
| 6 | `postAuth` | module | `(request: Request) => Promise<Response>` | não | sem inicializador |
| 7 | `restoreEnvironment` | module | `(() => void) \| undefined` | não | sem inicializador |
| 13 | `previous` | module | `{ nodeEnv: "development" \| "production" \| "test"; secret: string \| undefined; url: string \| undefined; …` | sim | objeto/configuração |
| 39 | `route` | module | `typeof import("<projeto>/src/app/api/auth/[...all]/route")` | sim | chamada import |
| 49 | `syntheticIp` | module | `string` | sim | TemplateExpression |
| 50 | `statuses` | module | `number[]` | sim | lista |
| 51 | `attempt` | module | `number` | sim | literal escalar (valor omitido) |
| 52 | `response` | module | `Response` | sim | chamada postAuth |

## tests/integration/task-assignee-reassignment.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 9 | `runtime` | module | `{ db: NodePgDatabase<typeof schema> \| undefined; role: string; organizationId: string; actorId: string; }` | sim | chamada vi.hoisted |
| 39 | `connection` | module | `IsolatedConnectionPair` | não | sem inicializador |
| 40 | `db` | module | `NodePgDatabase<typeof schema>` | não | sem inicializador |
| 41 | `fixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 42 | `organizationB` | module | `string` | sim | literal string (valor omitido) |
| 43 | `userB` | module | `string` | sim | literal string (valor omitido) |
| 44 | `userWithoutMembership` | module | `string` | sim | literal string (valor omitido) |
| 45 | `clientA` | module | `string` | sim | literal string (valor omitido) |
| 46 | `dealA` | module | `string` | sim | literal string (valor omitido) |
| 47 | `taskA` | module | `string` | sim | literal string (valor omitido) |
| 48 | `taskB` | module | `string` | sim | literal string (valor omitido) |
| 49 | `reassignTaskAssignee` | module | `(input: unknown) => Promise<{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; mess…` | não | sem inicializador |
| 73 | `aClient` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.clients).values({ organizationId: fixture!.organizati |
| 79 | `aDeal` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.deals).values({ organizationId: fixture!.organization |
| 86 | `bClient` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.clients).values({ organizationId: organizationB, kind |
| 92 | `bDeal` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.deals).values({ organizationId: organizationB, client |
| 99 | `aTask` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.tasks).values({ organizationId: fixture!.organization |
| 110 | `bTask` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.tasks).values({ organizationId: organizationB, title: |
| 131 | `errors` | module | `unknown[]` | sim | lista |
| 132 | `fixtureToClean` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | alias fixture |
| 150 | `organizationResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.organization.id }).from(schema.organization).wh |
| 151 | `userResidue` | module | `{ id: string; }[][]` | sim | chamada Promise.all |
| 154 | `error` | module | `unknown` | não | sem inicializador |
| 160 | `error` | module | `unknown` | não | sem inicializador |
| 166 | `orgId` | module | `string` | sim | propriedade organizationId |
| 167 | `organizationResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.organization.id }).from(schema.organization).wh |
| 168 | `userIds` | module | `string[]` | sim | chamada Object.values(fixtureToClean.actors).map |
| 169 | `userResidue` | module | `{ id: string; }[][]` | sim | chamada Promise.all |
| 170 | `clientResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.clients.id }).from(schema.clients).where |
| 171 | `dealResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.deals.id }).from(schema.deals).where |
| 172 | `taskResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.tasks.id }).from(schema.tasks).where |
| 173 | `contactResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.contacts.id }).from(schema.contacts).where |
| 174 | `activityResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.activities.id }).from(schema.activities).where |
| 175 | `auditResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).where |
| 176 | `membershipResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.member.id }).from(schema.member).where |
| 180 | `error` | module | `unknown` | não | sem inicializador |
| 229 | `value` | get | `any` | sim | chamada Reflect.get |
| 233 | `result` | get | `QueryResult<Record<string, unknown>>` | sim | chamada tx.execute |
| 234 | `row` | get | `{ pid: number \| string; } \| undefined` | sim | acesso indexado |
| 249 | `deadline` | waitForTaskActionLock | `number` | sim | expressão + |
| 254 | `actionPid` | waitForTaskActionLock | `number \| undefined` | sim | chamada getActionPid |
| 256 | `result` | waitForTaskActionLock | `QueryResult<LockWaitSession>` | sim | chamada monitor.query |
| 275 | `actionPid` | waitForTaskActionLock | `number \| undefined` | sim | chamada getActionPid |
| 276 | `monitorPid` | waitForTaskActionLock | `number` | sim | propriedade pid |
| 277 | `diagnostic` | waitForTaskActionLock | `QueryResult<LockWaitSession & { datname: string; usename: string; }>` | sim | chamada monitor.query |
| 306 | `insert` | get | `(target: unknown) => object` | sim | chamada Reflect.get |
| 307 | `builder` | get | `object` | sim | chamada insert.call |
| 312 | `valuesMethod` | get | `(row: Record<string, unknown>) => unknown` | sim | chamada Reflect.get |
| 316 | `value` | get | `any` | sim | chamada Reflect.get |
| 321 | `insert` | get | `(value: unknown) => unknown` | sim | chamada Reflect.get |
| 325 | `value` | get | `any` | sim | chamada Reflect.get |
| 334 | `seen` | findNotNullViolation | `Set<object>` | sim | instância Set |
| 335 | `current` | findNotNullViolation | `unknown` | sim | alias error |
| 338 | `candidate` | findNotNullViolation | `{ code?: unknown; table?: unknown; column?: unknown; cause?: unknown; }` | sim | alias current |
| 353 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 367 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 369 | `before` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; status: "todo" \| "in_progress" \| …` | sim | chamada currentTask |
| 382 | `before` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; status: "todo" \| "in_progress" \| …` | sim | chamada currentTask |
| 383 | `newUserId` | module | `string` | não | sem inicializador |
| 391 | `before` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; status: "todo" \| "in_progress" \| …` | sim | chamada currentTask |
| 398 | `before` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; status: "todo" \| "in_progress" \| …` | sim | chamada currentTask |
| 405 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 407 | `before` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; status: "todo" \| "in_progress" \| …` | sim | chamada currentTask |
| 414 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 416 | `before` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; status: "todo" \| "in_progress" \| …` | sim | chamada currentTask |
| 418 | `after` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; status: "todo" \| "in_progress" \| …` | sim | chamada currentTask |
| 434 | `before` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; status: "todo" \| "in_progress" \| …` | sim | chamada currentTask |
| 436 | `after` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; status: "todo" \| "in_progress" \| …` | sim | chamada currentTask |
| 467 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 468 | `before` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; status: "todo" \| "in_progress" \| …` | sim | chamada currentTask |
| 469 | `realDb` | module | `NodePgDatabase<typeof schema>` | sim | propriedade db |
| 471 | `failure` | module | `unknown` | não | sem inicializador |
| 474 | `error` | module | `unknown` | não | sem inicializador |
| 487 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 488 | `initialAssignee` | module | `string \| null \| undefined` | sim | propriedade assigneeUserId |
| 489 | `commercialFields` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; status: "todo" \| "in_progress" \| …` | sim | chamada currentTask |
| 490 | `externalTaskBefore` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; status: "todo" \| "in_progress" \| …` | sim | chamada currentTask |
| 491 | `firstResult` | module | `[{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }, { ok: f…` | sim | chamada Promise.all |
| 491 | `secondResult` | module | `[{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }, { ok: f…` | sim | chamada Promise.all |
| 497 | `rows` | module | `{ id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entityId: st…` | sim | chamada auditRows |
| 499 | `entries` | module | `{ row: { id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entit…` | sim | chamada rows.map |
| 500 | `first` | module | `{ row: { id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entit…` | sim | chamada entries.find |
| 502 | `second` | module | `{ row: { id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entit…` | sim | chamada entries.find |
| 505 | `finalTask` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; status: "todo" \| "in_progress" \| …` | sim | chamada currentTask |
| 521 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 522 | `beforeTask` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; status: "todo" \| "in_progress" \| …` | sim | chamada currentTask |
| 523 | `externalTaskBefore` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; status: "todo" \| "in_progress" \| …` | sim | chamada currentTask |
| 524 | `auditsBefore` | module | `{ id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entityId: st…` | sim | chamada auditRows |
| 525 | `pendingAction` | module | `Promise<{ ok: false; message: string; id?: undefined; } \| { ok: true; id: string; message?: undefined; }> …` | não | sem inicializador |
| 526 | `actionPid` | module | `number \| undefined` | não | sem inicializador |
| 527 | `actionSettled` | module | `boolean` | sim | literal escalar (valor omitido) |
| 529 | `controllerTransactionOpen` | module | `boolean` | sim | literal escalar (valor omitido) |
| 530 | `testFailure` | module | `unknown` | não | sem inicializador |
| 531 | `failed` | module | `boolean` | sim | literal escalar (valor omitido) |
| 532 | `cleanupErrors` | module | `unknown[]` | sim | lista |
| 535 | `blockerPid` | module | `number` | sim | propriedade pid |
| 536 | `monitorPid` | module | `number` | sim | propriedade pid |
| 542 | `blockedAction` | module | `LockWaitSession` | sim | chamada waitForTaskActionLock |
| 551 | `controllerState` | module | `QueryResult<{ xact_start: Date \| null; }>` | sim | chamada connection.clientA.query |
| 558 | `afterTask` | module | `{ id: string; createdAt: Date; updatedAt: Date; organizationId: string; status: "todo" \| "in_progress" \| …` | sim | chamada currentTask |
| 580 | `error` | module | `unknown` | não | sem inicializador |
| 588 | `error` | module | `unknown` | não | sem inicializador |
| 594 | `timer` | module | `NodeJS.Timeout \| undefined` | não | sem inicializador |
| 595 | `settled` | module | `{ timedOut: false; results: [PromiseSettledResult<{ ok: false; message: string; id?: undefined; } \| { ok: …` | sim | chamada Promise.race |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 214 | `pid` | `number` | module |
| 215 | `state` | `string` | module |
| 216 | `wait_event_type` | `string \| null` | module |
| 217 | `wait_event` | `string \| null` | module |
| 218 | `blocking_pids` | `number[]` | module |
| 219 | `query` | `string` | module |
| 234 | `pid` | `string \| number` | get |
| 276 | `pid` | `number` | waitForTaskActionLock |
| 277 | `datname` | `string` | waitForTaskActionLock |
| 277 | `usename` | `string` | waitForTaskActionLock |
| 333 | `code` | `string` | findNotNullViolation |
| 333 | `table` | `string \| undefined` | findNotNullViolation |
| 333 | `column` | `string \| undefined` | findNotNullViolation |
| 338 | `code` | `unknown` | findNotNullViolation |
| 338 | `table` | `unknown` | findNotNullViolation |
| 338 | `column` | `unknown` | findNotNullViolation |
| 338 | `cause` | `unknown` | findNotNullViolation |
| 499 | `fromUserId` | `string \| null` | module |
| 499 | `toUserId` | `string \| null` | module |
| 535 | `pid` | `number` | module |
| 536 | `pid` | `number` | module |
| 551 | `xact_start` | `Date \| null` | module |
| 597 | `timedOut` | `true` | module |

## tests/integration/task-deal-client-integrity.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 6 | `enabled` | module | `boolean` | sim | expressão === |
| 7 | `consistencyFk` | module | `"tasks_deal_client_consistency_fk"` | sim | literal string (valor omitido) |
| 8 | `m01TaskFk` | module | `"tasks_assignee_member_assignment_fk"` | sim | literal string (valor omitido) |
| 14 | `connection` | module | `IsolatedConnectionPair \| undefined` | não | sem inicializador |
| 15 | `db` | module | `PoolClient` | não | sem inicializador |
| 16 | `fixture` | module | `Fixture \| undefined` | não | sem inicializador |
| 17 | `transactionOpen` | module | `boolean` | sim | literal escalar (valor omitido) |
| 24 | `names` | module | `string[]` | sim | lista |
| 25 | `constraints` | module | `QueryResult<{ conname: string; convalidated: boolean; }>` | sim | chamada db.query |
| 40 | `current` | module | `Fixture \| undefined` | sim | alias fixture |
| 48 | `remaining` | module | `QueryResult<{ total: number; }>` | sim | chamada db.query |
| 58 | `f` | module | `Fixture` | sim | chamada need |
| 59 | `taskId` | module | ``${string}-${string}-${string}-${string}-${string}`` | sim | chamada insertTask |
| 60 | `row` | module | `QueryResult<any>` | sim | chamada db.query |
| 65 | `f` | module | `Fixture` | sim | chamada need |
| 71 | `rows` | module | `QueryResult<any>` | sim | chamada db.query |
| 76 | `f` | module | `Fixture` | sim | chamada need |
| 94 | `f` | module | `Fixture` | sim | chamada need |
| 95 | `noLinks` | module | ``${string}-${string}-${string}-${string}-${string}`` | sim | chamada insertTask |
| 96 | `clientOnly` | module | ``${string}-${string}-${string}-${string}-${string}`` | sim | chamada insertTask |
| 97 | `dealOnly` | module | ``${string}-${string}-${string}-${string}-${string}`` | sim | chamada insertTask |
| 98 | `rows` | module | `QueryResult<any>` | sim | chamada db.query |
| 109 | `f` | module | `Fixture` | sim | chamada need |
| 110 | `taskId` | module | ``${string}-${string}-${string}-${string}-${string}`` | sim | chamada insertTask |
| 112 | `row` | module | `QueryResult<any>` | sim | chamada db.query |
| 117 | `f` | module | `Fixture` | sim | chamada need |
| 118 | `activeTaskId` | module | ``${string}-${string}-${string}-${string}-${string}`` | sim | chamada insertTask |
| 125 | `f` | module | `Fixture` | sim | chamada need |
| 126 | `archivedTaskId` | module | ``${string}-${string}-${string}-${string}-${string}`` | sim | chamada insertTask |
| 134 | `f` | module | `Fixture` | sim | chamada need |
| 135 | `activeTaskId` | module | ``${string}-${string}-${string}-${string}-${string}`` | sim | chamada insertTask |
| 136 | `archivedTaskId` | module | ``${string}-${string}-${string}-${string}-${string}`` | sim | chamada insertTask |
| 150 | `f` | module | `Fixture` | sim | chamada need |
| 151 | `dealOnlyTaskId` | module | ``${string}-${string}-${string}-${string}-${string}`` | sim | chamada insertTask |
| 159 | `f` | module | `Fixture` | sim | chamada need |
| 160 | `taskId` | module | ``${string}-${string}-${string}-${string}-${string}`` | sim | chamada insertTask |
| 162 | `row` | module | `QueryResult<any>` | sim | chamada db.query |
| 167 | `f` | module | `Fixture` | sim | chamada need |
| 168 | `archivedTaskId` | module | ``${string}-${string}-${string}-${string}-${string}`` | sim | chamada insertTask |
| 169 | `archivedDealOnlyTaskId` | module | ``${string}-${string}-${string}-${string}-${string}`` | sim | chamada insertTask |
| 174 | `archivedDealTaskId` | module | ``${string}-${string}-${string}-${string}-${string}`` | sim | chamada insertTask |
| 185 | `f` | module | `Fixture` | sim | chamada need |
| 187 | `row` | module | `QueryResult<any>` | sim | chamada db.query |
| 192 | `f` | module | `Fixture` | sim | chamada need |
| 193 | `clientId` | module | ``${string}-${string}-${string}-${string}-${string}`` | sim | chamada randomUUID |
| 195 | `taskId` | module | ``${string}-${string}-${string}-${string}-${string}`` | sim | chamada insertTask |
| 201 | `f` | module | `Fixture` | sim | chamada need |
| 205 | `otherTenant` | module | `QueryResult<any>` | sim | chamada db.query |
| 210 | `f` | module | `Fixture` | sim | chamada need |
| 212 | `error` | module | `unknown` | não | sem inicializador |
| 216 | `caught` | module | `unknown` | não | sem inicializador |
| 225 | `f` | module | `Fixture` | sim | chamada need |
| 230 | `remaining` | module | `QueryResult<any>` | sim | chamada db.query |
| 235 | `f` | module | `Fixture` | sim | chamada need |
| 239 | `updater` | module | `PoolClient` | sim | alias db |
| 240 | `inserter` | module | `PoolClient` | sim | chamada connection!.poolB.connect |
| 241 | `updateOpen` | module | `boolean` | sim | literal escalar (valor omitido) |
| 242 | `insertOpen` | module | `boolean` | sim | literal escalar (valor omitido) |
| 243 | `pendingInsert` | module | `Promise<{ kind: "inserted"; } \| { kind: "error"; error: unknown; }> \| undefined` | não | sem inicializador |
| 249 | `updaterPid` | module | `number` | sim | propriedade pid |
| 256 | `inserterPid` | module | `number` | sim | propriedade pid |
| 285 | `key` | seed | ``${string}-${string}-${string}-${string}-${string}`` | sim | chamada randomUUID |
| 286 | `f` | seed | `Fixture` | sim | objeto/configuração |
| 315 | `id` | insertTask | ``${string}-${string}-${string}-${string}-${string}`` | sim | chamada randomUUID |
| 325 | `error` | fails | `unknown` | não | sem inicializador |
| 326 | `caught` | fails | `unknown` | não | sem inicializador |
| 334 | `error` | failsWithAnyConstraint | `unknown` | não | sem inicializador |
| 335 | `caught` | failsWithAnyConstraint | `unknown` | não | sem inicializador |
| 343 | `deadline` | waitForBlocker | `number` | sim | expressão + |
| 345 | `result` | waitForBlocker | `QueryResult<{ blockers: number[]; }>` | sim | chamada pool.query |
| 354 | `open` | cleanup | `boolean` | sim | literal escalar (valor omitido) |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 10 | `orgA` | `string` | module |
| 10 | `orgB` | `string` | module |
| 10 | `ownerA` | `string` | module |
| 10 | `ownerB` | `string` | module |
| 10 | `outsider` | `string` | module |
| 11 | `clientA1` | `string` | module |
| 11 | `clientA2` | `string` | module |
| 11 | `clientB` | `string` | module |
| 11 | `dealA1` | `string` | module |
| 11 | `dealA2` | `string` | module |
| 11 | `dealB` | `string` | module |
| 25 | `conname` | `string` | module |
| 25 | `convalidated` | `boolean` | module |
| 48 | `total` | `number` | module |
| 243 | `kind` | `"inserted"` | module |
| 243 | `kind` | `"error"` | module |
| 243 | `error` | `unknown` | module |
| 249 | `pid` | `number` | module |
| 256 | `pid` | `number` | module |
| 337 | `constraint` | `unknown` | failsWithAnyConstraint |
| 345 | `blockers` | `number[]` | waitForBlocker |

## tests/integration/team-assignment-summary.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 9 | `runtime` | module | `{ db: NodePgDatabase<typeof schema> \| undefined; cookie: string; }` | sim | chamada vi.hoisted |
| 28 | `connection` | module | `IsolatedConnectionPair \| undefined` | não | sem inicializador |
| 29 | `db` | module | `NodePgDatabase<typeof schema>` | não | sem inicializador |
| 30 | `fixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 31 | `organizationB` | module | `string` | sim | literal string (valor omitido) |
| 32 | `userB` | module | `string` | sim | literal string (valor omitido) |
| 33 | `ids` | module | `RecordIds` | não | sem inicializador |
| 34 | `getMemberAssignmentSummary` | module | `() => Promise<MemberAssignmentSummary[]>` | não | sem inicializador |
| 35 | `postAuth` | module | `(request: Request) => Promise<Response>` | não | sem inicializador |
| 36 | `restoreAuthEnvironment` | module | `(() => void) \| undefined` | não | sem inicializador |
| 44 | `previousSecret` | module | `string \| undefined` | sim | propriedade BETTER_AUTH_SECRET |
| 45 | `previousUrl` | module | `string \| undefined` | sim | propriedade BETTER_AUTH_URL |
| 55 | `authRoute` | module | `typeof import("<projeto>/src/app/api/auth/[...all]/route")` | sim | chamada import |
| 66 | `sourceUserId` | module | `string` | sim | propriedade userId |
| 71 | `activeClientA` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.clients).values({ organizationId: fixture!.organizati |
| 72 | `archivedClientA` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.clients).values({ organizationId: fixture!.organizati |
| 73 | `activeDealA` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.deals).values({ organizationId: fixture!.organization |
| 74 | `archivedDealA` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.deals).values({ organizationId: fixture!.organization |
| 75 | `activeTaskA` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.tasks).values({ organizationId: fixture!.organization |
| 76 | `archivedTaskA` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.tasks).values({ organizationId: fixture!.organization |
| 78 | `clientB` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.clients).values({ organizationId: organizationB, kind |
| 79 | `dealB` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.deals).values({ organizationId: organizationB, client |
| 80 | `taskB` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.tasks).values({ organizationId: organizationB, title: |
| 95 | `errors` | module | `unknown[]` | sim | lista |
| 97 | `fixtureToClean` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | alias fixture |
| 115 | `residue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.organization.id }).from(schema.organization).wh |
| 116 | `userResidue` | module | `{ id: string; }[]` | sim | chamada db.select({ id: schema.user.id }).from(schema.user).where |
| 118 | `error` | module | `unknown` | não | sem inicializador |
| 125 | `error` | module | `unknown` | não | sem inicializador |
| 131 | `orgId` | module | `string` | sim | propriedade organizationId |
| 132 | `userIds` | module | `string[]` | sim | chamada Object.values(fixtureToClean.actors).map |
| 133 | `orgResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 133 | `usersResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 133 | `membersResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 133 | `clientsResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 133 | `dealsResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 133 | `tasksResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 133 | `activitiesResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 133 | `auditsResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 133 | `accountsResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 133 | `sessionsResidue` | module | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 148 | `error` | module | `unknown` | não | sem inicializador |
| 171 | `cookie` | signIn | `string` | sim | chamada signInAndGetCookie |
| 182 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 182 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 184 | `summary` | module | `MemberAssignmentSummary[]` | sim | chamada getMemberAssignmentSummary |
| 185 | `source` | module | `MemberAssignmentSummary \| undefined` | sim | chamada summary.find |
| 186 | `memberWithoutAssignments` | module | `MemberAssignmentSummary \| undefined` | sim | chamada summary.find |
| 224 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 231 | `summary` | module | `MemberAssignmentSummary[]` | sim | chamada getMemberAssignmentSummary |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 26 | `clientsA` | `string[]` | module |
| 26 | `dealsA` | `string[]` | module |
| 26 | `tasksA` | `string[]` | module |
| 26 | `clientsB` | `string[]` | module |
| 26 | `dealsB` | `string[]` | module |
| 26 | `tasksB` | `string[]` | module |

## tests/integration/team-member-leave-protection.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 9 | `runtime` | module | `{ db: NodePgDatabase<typeof schema> \| undefined; cookie: string; }` | sim | chamada vi.hoisted |
| 29 | `connection` | module | `IsolatedConnectionPair \| undefined` | não | sem inicializador |
| 30 | `db` | module | `NodePgDatabase<typeof schema>` | não | sem inicializador |
| 31 | `fixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 32 | `extraTenant` | module | `ExtraTenant \| undefined` | não | sem inicializador |
| 33 | `postAuth` | module | `(request: Request) => Promise<Response>` | não | sem inicializador |
| 34 | `transferMemberAssignments` | module | `(input: unknown) => Promise<{ ok: true; counts: { clients: number; deals: number; tasks: number; total: num…` | não | sem inicializador |
| 35 | `restoreAuthEnvironment` | module | `(() => void) \| undefined` | não | sem inicializador |
| 43 | `previousSecret` | module | `string \| undefined` | sim | propriedade BETTER_AUTH_SECRET |
| 44 | `previousUrl` | module | `string \| undefined` | sim | propriedade BETTER_AUTH_URL |
| 65 | `errors` | module | `unknown[]` | sim | lista |
| 71 | `error` | module | `unknown` | não | sem inicializador |
| 73 | `currentFixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | alias fixture |
| 77 | `error` | module | `unknown` | não | sem inicializador |
| 96 | `cookie` | signIn | `string` | sim | chamada signInAndGetCookie |
| 110 | `response` | getSession | `Response` | sim | chamada postAuth |
| 115 | `rows` | memberExists | `{ id: string; }[]` | sim | chamada db.select({ id: schema.member.id }).from(schema.member).where |
| 122 | `organizationId` | seedAssignment | `string` | sim | propriedade organizationId |
| 123 | `deletedAt` | seedAssignment | `Date \| null` | sim | condição derivada |
| 125 | `clientId` | seedAssignment | `string \| undefined` | não | sem inicializador |
| 126 | `entityId` | seedAssignment | `string` | não | sem inicializador |
| 128 | `client` | seedAssignment | `{ id: string; }[]` | sim | chamada tx.insert(schema.clients).values({ organizationId, kind: "company", na |
| 134 | `updated` | seedAssignment | `{ id: string; }[]` | sim | chamada tx.update(schema.clients).set({ deletedAt }).where(eq(schema.clients.i |
| 137 | `deal` | seedAssignment | `{ id: string; }[]` | sim | chamada tx.insert(schema.deals).values({ organizationId, clientId, title: `Lea |
| 143 | `task` | seedAssignment | `{ id: string; }[]` | sim | chamada tx.insert(schema.tasks).values({ organizationId, title: `Leave task ${ |
| 150 | `audit` | seedAssignment | `{ id: string; }[]` | sim | chamada tx.insert(schema.auditLogs).values({ organizationId, actorUserId: user |
| 154 | `activity` | seedAssignment | `{ id: string; }[]` | sim | chamada tx.insert(schema.activities).values({ organizationId, type: "note", su |
| 171 | `organizationId` | historyRows | `string` | sim | propriedade organizationId |
| 172 | `audits` | historyRows | `[{ id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entityId: s…` | sim | chamada Promise.all |
| 172 | `activities` | historyRows | `[{ id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entityId: s…` | sim | chamada Promise.all |
| 182 | `beforeOrganization` | expectBlockedLeave | `{ id: string; name: string; slug: string; logo: string \| null; metadata: string \| null; createdAt: Date; }[]` | sim | chamada db.select().from(schema.organization).where |
| 183 | `beforeRows` | expectBlockedLeave | `({ id: string; organizationId: string; kind: "person" \| "company"; name: string; email: string \| null; ph…` | sim | chamada Promise.all |
| 184 | `beforeHistory` | expectBlockedLeave | `{ audits: { id: string; organizationId: string; actorUserId: string; action: string; entityType: string; en…` | sim | chamada historyRows |
| 185 | `response` | expectBlockedLeave | `Response` | sim | chamada leave |
| 186 | `body` | expectBlockedLeave | `{ code?: string; message?: string; }` | sim | chamada response.json |
| 199 | `organizationId` | makeTenantB | `string` | sim | TemplateExpression |
| 200 | `userId` | makeTenantB | `string` | sim | TemplateExpression |
| 201 | `memberId` | makeTenantB | `string` | sim | TemplateExpression |
| 202 | `sharedActorId` | makeTenantB | `string \| undefined` | sim | propriedade userId |
| 203 | `fixtureOwnerId` | makeTenantB | `string` | sim | propriedade userId |
| 204 | `assignmentClientId` | makeTenantB | `string \| undefined` | não | sem inicializador |
| 209 | `members` | makeTenantB | `{ id: string; organizationId: string; userId: string; role: string; }[]` | sim | lista |
| 216 | `client` | makeTenantB | `{ id: string; }[]` | sim | chamada tx.insert(schema.clients).values({ organizationId, kind: "company", na |
| 244 | `orgs` | assertTenantRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 244 | `members` | assertTenantRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 244 | `clients` | assertTenantRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 244 | `deals` | assertTenantRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 244 | `tasks` | assertTenantRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 244 | `activities` | assertTenantRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 244 | `audits` | assertTenantRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 244 | `invitations` | assertTenantRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 254 | `authResidue` | assertTenantRemoved | `number[]` | sim | condição derivada |
| 255 | `users` | assertTenantRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[]]` | sim | chamada Promise.all |
| 255 | `accounts` | assertTenantRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[]]` | sim | chamada Promise.all |
| 255 | `sessions` | assertTenantRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[]]` | sim | chamada Promise.all |
| 272 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 272 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 273 | `assignment` | module | `Assignment` | sim | chamada seedAssignment |
| 274 | `cookie` | module | `string` | sim | chamada signIn |
| 279 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 279 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 280 | `assignments` | module | `[Assignment, Assignment, Assignment]` | sim | chamada Promise.all |
| 285 | `body` | module | `{ code?: string; message?: string; }` | sim | chamada expectBlockedLeave |
| 292 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 292 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 293 | `selected` | module | `{ userId: string; email: string; password: string; memberId: string; }` | sim | acesso indexado |
| 294 | `historicAudit` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.auditLogs).values({ organizationId, actorUserId: sele |
| 297 | `historicClient` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.clients).values({ organizationId, kind: "company", na |
| 298 | `historicActivity` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.activities).values({ organizationId, type: "note", su |
| 301 | `cookie` | module | `string` | sim | chamada signIn |
| 302 | `response` | module | `Response` | sim | chamada leave |
| 314 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 314 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 315 | `cookie` | module | `string` | sim | chamada signIn |
| 316 | `response` | module | `Response` | sim | chamada leave |
| 324 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 324 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 326 | `cookie` | module | `string` | sim | chamada signIn |
| 327 | `response` | module | `Response` | sim | chamada leave |
| 328 | `body` | module | `{ code?: string; message?: string; }` | sim | chamada response.json |
| 337 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 337 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 338 | `response` | module | `Response` | sim | chamada leave |
| 344 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 344 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 345 | `cookie` | module | `string` | sim | chamada signIn |
| 346 | `signOut` | module | `Response` | sim | chamada postAuth |
| 348 | `response` | module | `Response` | sim | chamada leave |
| 354 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 354 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 355 | `cookie` | module | `string` | sim | chamada signIn |
| 356 | `response` | module | `Response` | sim | chamada leave |
| 363 | `orgA` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 363 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 364 | `orgB` | module | `{ organizationId: string; userId: string; memberId: string; assignmentClientId: string \| undefined; }` | sim | chamada makeTenantB |
| 365 | `client` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.clients).values({ organizationId: orgB.organizationId |
| 367 | `cookie` | module | `string` | sim | chamada signIn |
| 370 | `response` | module | `Response` | sim | chamada leave |
| 371 | `body` | module | `{ code?: string; message?: string; }` | sim | chamada response.json |
| 382 | `orgA` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 382 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 383 | `orgB` | module | `{ organizationId: string; userId: string; memberId: string; assignmentClientId: string \| undefined; }` | sim | chamada makeTenantB |
| 384 | `cookie` | module | `string` | sim | chamada signIn |
| 386 | `response` | module | `Response` | sim | chamada leave |
| 387 | `body` | module | `string` | sim | chamada response.text |
| 400 | `orgA` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 400 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 401 | `orgB` | module | `{ organizationId: string; userId: string; memberId: string; assignmentClientId: string \| undefined; }` | sim | chamada makeTenantB |
| 402 | `cookie` | module | `string` | sim | chamada signIn |
| 405 | `response` | module | `Response` | sim | chamada leave |
| 413 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 413 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 414 | `assignments` | module | `[Assignment, Assignment, Assignment]` | sim | chamada Promise.all |
| 419 | `ownerCookie` | module | `string` | sim | chamada signIn |
| 421 | `transfer` | module | `{ ok: true; counts: { clients: number; deals: number; tasks: number; total: number; }; archivedReferencesPe…` | sim | chamada transferMemberAssignments |
| 423 | `item` | module | `Assignment` | não | sem inicializador |
| 424 | `row` | module | `{ ownerUserId?: string \| null; assigneeUserId?: string \| null; deletedAt: Date \| null; }` | sim | chamada getAssignment |
| 429 | `targetCookie` | module | `string` | sim | chamada signIn |
| 430 | `response` | module | `Response` | sim | chamada leave |
| 434 | `row` | module | `{ ownerUserId?: string \| null; assigneeUserId?: string \| null; }` | sim | chamada getAssignment |
| 437 | `history` | module | `{ audits: { id: string; organizationId: string; actorUserId: string; action: string; entityType: string; en…` | sim | chamada historyRows |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 26 | `entity` | `Entity` | module |
| 26 | `id` | `string` | module |
| 26 | `clientId` | `string \| undefined` | module |
| 26 | `deletedAt` | `Date \| null` | module |
| 26 | `activityId` | `string` | module |
| 26 | `auditId` | `string` | module |
| 27 | `organizationId` | `string` | module |
| 27 | `userIds` | `string[]` | module |
| 111 | `session` | `{ activeOrganizationId?: string \| null; } \| undefined` | getSession |
| 111 | `activeOrganizationId` | `string \| null \| undefined` | getSession |
| 111 | `user` | `{ id: string; } \| undefined` | getSession |
| 111 | `id` | `string` | getSession |
| 186 | `code` | `string \| undefined` | expectBlockedLeave |
| 186 | `message` | `string \| undefined` | expectBlockedLeave |
| 198 | `userId` | `string` | makeTenantB |
| 198 | `role` | `string` | makeTenantB |
| 328 | `code` | `string \| undefined` | module |
| 328 | `message` | `string \| undefined` | module |
| 371 | `code` | `string \| undefined` | module |
| 371 | `message` | `string \| undefined` | module |
| 424 | `ownerUserId` | `string \| null \| undefined` | module |
| 424 | `assigneeUserId` | `string \| null \| undefined` | module |
| 424 | `deletedAt` | `Date \| null` | module |
| 434 | `ownerUserId` | `string \| null \| undefined` | module |
| 434 | `assigneeUserId` | `string \| null \| undefined` | module |

## tests/integration/team-member-removal-protection.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 9 | `runtime` | module | `{ db: NodePgDatabase<typeof schema> \| undefined; cookie: string; }` | sim | chamada vi.hoisted |
| 28 | `connection` | module | `IsolatedConnectionPair \| undefined` | não | sem inicializador |
| 29 | `db` | module | `NodePgDatabase<typeof schema>` | não | sem inicializador |
| 30 | `fixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 31 | `extraTenant` | module | `ExtraTenant \| undefined` | não | sem inicializador |
| 32 | `postAuth` | module | `(request: Request) => Promise<Response>` | não | sem inicializador |
| 33 | `transferMemberAssignments` | module | `(input: unknown) => Promise<{ ok: true; counts: { clients: number; deals: number; tasks: number; total: num…` | não | sem inicializador |
| 34 | `restoreAuthEnvironment` | module | `(() => void) \| undefined` | não | sem inicializador |
| 42 | `previousSecret` | module | `string \| undefined` | sim | propriedade BETTER_AUTH_SECRET |
| 43 | `previousUrl` | module | `string \| undefined` | sim | propriedade BETTER_AUTH_URL |
| 53 | `route` | module | `typeof import("<projeto>/src/app/api/auth/[...all]/route")` | sim | chamada import |
| 65 | `errors` | module | `unknown[]` | sim | lista |
| 72 | `error` | module | `unknown` | não | sem inicializador |
| 77 | `currentFixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | alias fixture |
| 81 | `error` | module | `unknown` | não | sem inicializador |
| 103 | `cookie` | signIn | `string` | sim | chamada signInAndGetCookie |
| 125 | `deadline` | waitForBlockedMembershipDelete | `number` | sim | expressão + |
| 126 | `latest` | waitForBlockedMembershipDelete | `unknown[]` | sim | lista |
| 129 | `result` | waitForBlockedMembershipDelete | `QueryResult<{ pid: number; query: string; }>` | sim | chamada connection!.poolB.query |
| 152 | `organizationId` | seedAssignment | `string` | sim | propriedade organizationId |
| 153 | `deletedAt` | seedAssignment | `Date \| null` | sim | condição derivada |
| 155 | `clientId` | seedAssignment | `string \| undefined` | não | sem inicializador |
| 156 | `dealId` | seedAssignment | `string \| undefined` | não | sem inicializador |
| 158 | `client` | seedAssignment | `{ id: string; }[]` | sim | chamada tx.insert(schema.clients).values({ organizationId, kind: "company", na |
| 168 | `deal` | seedAssignment | `{ id: string; }[]` | sim | chamada tx.insert(schema.deals).values({ organizationId, clientId: clientId!, |
| 179 | `task` | seedAssignment | `{ id: string; }[]` | sim | chamada tx.insert(schema.tasks).values({ organizationId, title: `Removal prote |
| 189 | `entityId` | seedAssignment | `string` | sim | condição derivada |
| 190 | `audit` | seedAssignment | `{ id: string; }[]` | sim | chamada tx.insert(schema.auditLogs).values({ organizationId, actorUserId: targ |
| 198 | `activity` | seedAssignment | `{ id: string; }[]` | sim | chamada tx.insert(schema.activities).values({ organizationId, type: "note", su |
| 213 | `created` | seedAllAssignments | `Assignment[]` | sim | lista |
| 214 | `entity` | seedAllAssignments | `"deal" \| "task" \| "client"` | não | sem inicializador |
| 233 | `ids` | historyRows | `string[]` | sim | chamada items.map |
| 234 | `organizationId` | historyRows | `string` | sim | propriedade organizationId |
| 235 | `audits` | historyRows | `[{ id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entityId: s…` | sim | chamada Promise.all |
| 235 | `activities` | historyRows | `[{ id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entityId: s…` | sim | chamada Promise.all |
| 243 | `target` | expectProtectedRemoval | `{ userId: string; email: string; password: string; memberId: string; }` | sim | propriedade target |
| 244 | `organizationId` | expectProtectedRemoval | `string` | sim | propriedade organizationId |
| 245 | `beforeRows` | expectProtectedRemoval | `({ id: string; organizationId: string; kind: "person" \| "company"; name: string; email: string \| null; ph…` | sim | chamada Promise.all |
| 246 | `index` | expectProtectedRemoval | `number` | sim | literal escalar (valor omitido) |
| 249 | `beforeHistory` | expectProtectedRemoval | `{ audits: { id: string; organizationId: string; actorUserId: string; action: string; entityType: string; en…` | sim | chamada historyRows |
| 250 | `response` | expectProtectedRemoval | `Response` | sim | chamada removeMember |
| 251 | `body` | expectProtectedRemoval | `{ code?: string; message?: string; }` | sim | chamada response.json |
| 281 | `orgs` | assertTenantRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 281 | `members` | assertTenantRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 281 | `clients` | assertTenantRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 281 | `contacts` | assertTenantRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 281 | `deals` | assertTenantRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 281 | `tasks` | assertTenantRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 281 | `activities` | assertTenantRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 281 | `audits` | assertTenantRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 281 | `invitations` | assertTenantRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 281 | `accounts` | assertTenantRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 281 | `sessions` | assertTenantRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 281 | `users` | assertTenantRemoved | `[{ id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: string; }[], { id: strin…` | sim | chamada Promise.all |
| 305 | `current` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 306 | `target` | module | `{ userId: string; email: string; password: string; memberId: string; }` | sim | propriedade target |
| 307 | `cookie` | module | `string` | sim | chamada signIn |
| 308 | `gate` | module | `PoolClient` | sim | propriedade clientB |
| 309 | `gateTransactionOpen` | module | `boolean` | sim | literal escalar (valor omitido) |
| 310 | `pendingRequest` | module | `Promise<{ kind: "response"; response: Response; } \| { kind: "error"; error: unknown; }> \| undefined` | não | sem inicializador |
| 315 | `gatePid` | module | `number` | sim | propriedade pid |
| 316 | `locked` | module | `QueryResult<any>` | sim | chamada gate.query |
| 322 | `request` | module | `Promise<Response>` | sim | condição derivada |
| 332 | `assignmentResult` | module | `QueryResult<{ id: string; }>` | sim | chamada gate.query |
| 336 | `assignment` | module | `{ id: string; }` | sim | acesso indexado |
| 340 | `result` | module | `{ kind: "response"; response: Response; } \| { kind: "error"; error: unknown; }` | sim | alias pendingRequest |
| 344 | `body` | module | `any` | sim | chamada result.response.json |
| 368 | `assignment` | module | `Assignment` | sim | chamada seedAssignment |
| 369 | `cookie` | module | `string` | sim | chamada signIn |
| 374 | `created` | module | `Assignment[]` | sim | chamada seedAllAssignments |
| 375 | `cookie` | module | `string` | sim | chamada signIn |
| 376 | `body` | module | `{ code?: string; message?: string; }` | sim | chamada expectProtectedRemoval |
| 383 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 383 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 384 | `historicAudit` | module | `{ id: string; }[]` | sim | chamada db.insert(schema.auditLogs).values({ organizationId, actorUserId: acto |
| 392 | `cookie` | module | `string` | sim | chamada signIn |
| 393 | `response` | module | `Response` | sim | chamada removeMember |
| 401 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 401 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 402 | `cookie` | module | `string` | sim | chamada signIn |
| 403 | `response` | module | `Response` | sim | chamada removeMember |
| 409 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 409 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 410 | `cookie` | module | `string` | sim | chamada signIn |
| 411 | `response` | module | `Response` | sim | chamada removeMember |
| 417 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 417 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 418 | `response` | module | `Response` | sim | chamada removeMember |
| 424 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 424 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 425 | `cookie` | module | `string` | sim | chamada signIn |
| 426 | `signOut` | module | `Response` | sim | chamada postAuth |
| 430 | `response` | module | `Response` | sim | chamada removeMember |
| 436 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 437 | `organizationId` | module | `string` | sim | TemplateExpression |
| 438 | `targetUserId` | module | `string` | sim | TemplateExpression |
| 439 | `targetMemberId` | module | `string` | sim | TemplateExpression |
| 449 | `tenantBClient` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.clients).values({ organizationId, kind: "company", na |
| 454 | `cookie` | module | `string` | sim | chamada signIn |
| 455 | `response` | module | `Response` | sim | chamada removeMember |
| 456 | `body` | module | `{ code?: string; message?: string; }` | sim | chamada response.json |
| 467 | `activeOrganizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 467 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 468 | `organizationId` | module | `string` | sim | TemplateExpression |
| 469 | `targetUserId` | module | `string` | sim | TemplateExpression |
| 470 | `targetMemberId` | module | `string` | sim | TemplateExpression |
| 479 | `privateClient` | module | `{ id: string; }[]` | sim | chamada tx.insert(schema.clients).values({ organizationId, kind: "company", na |
| 484 | `cookie` | module | `string` | sim | chamada signIn |
| 486 | `sessionResponse` | module | `Response` | sim | chamada postAuth |
| 487 | `sessionBody` | module | `{ session?: { activeOrganizationId?: string \| null; }; }` | sim | chamada sessionResponse.json |
| 489 | `response` | module | `Response` | sim | chamada removeMember |
| 490 | `body` | module | `string` | sim | chamada response.text |
| 501 | `organizationId` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 501 | `actors` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | sim | chamada requireFixture |
| 502 | `created` | module | `Assignment[]` | sim | chamada seedAllAssignments |
| 503 | `cookie` | module | `string` | sim | chamada signIn |
| 504 | `transfer` | module | `{ ok: true; counts: { clients: number; deals: number; tasks: number; total: number; }; archivedReferencesPe…` | sim | chamada transferMemberAssignments |
| 506 | `item` | module | `Assignment` | não | sem inicializador |
| 508 | `response` | module | `Response` | sim | chamada removeMember |
| 511 | `auditRows` | module | `{ id: string; organizationId: string; actorUserId: string; action: string; entityType: string; entityId: st…` | sim | chamada db.select().from(schema.auditLogs).where |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 25 | `entity` | `Entity` | module |
| 25 | `id` | `string` | module |
| 25 | `supportClientId` | `string \| undefined` | module |
| 25 | `deletedAt` | `Date \| null` | module |
| 25 | `activityId` | `string` | module |
| 25 | `auditId` | `string` | module |
| 26 | `organizationId` | `string` | module |
| 26 | `userIds` | `string[]` | module |
| 26 | `clientIds` | `string[] \| undefined` | module |
| 129 | `pid` | `number` | waitForBlockedMembershipDelete |
| 129 | `query` | `string` | waitForBlockedMembershipDelete |
| 251 | `code` | `string \| undefined` | expectProtectedRemoval |
| 251 | `message` | `string \| undefined` | expectProtectedRemoval |
| 310 | `kind` | `"response"` | module |
| 310 | `response` | `Response` | module |
| 310 | `kind` | `"error"` | module |
| 310 | `error` | `unknown` | module |
| 315 | `pid` | `number` | module |
| 332 | `id` | `string` | module |
| 456 | `code` | `string \| undefined` | module |
| 456 | `message` | `string \| undefined` | module |
| 487 | `session` | `{ activeOrganizationId?: string \| null; } \| undefined` | module |
| 487 | `activeOrganizationId` | `string \| null \| undefined` | module |

## tests/integration/team-role-rbac.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 11 | `runtime` | module | `{ db: NodePgDatabase<typeof schema> \| undefined; }` | sim | chamada vi.hoisted |
| 19 | `connection` | module | `IsolatedConnectionPair` | não | sem inicializador |
| 20 | `db` | module | `NodePgDatabase<typeof schema>` | não | sem inicializador |
| 21 | `fixture` | module | `{ organizationId: string; actors: Record<RbacActor, { userId: string; email: string; password: string; memb…` | não | sem inicializador |
| 22 | `post` | module | `(request: Request) => Promise<Response>` | não | sem inicializador |
| 31 | `route` | module | `typeof import("<projeto>/src/app/api/auth/[...all]/route")` | sim | chamada import |
| 49 | `cookie` | updateAs | `string` | sim | chamada signInAndGetCookie |
| 58 | `row` | storedRole | `{ role: string; }[]` | sim | chamada db.select({ role: member.role }).from(member).where |
| 66 | `response` | module | `Response` | sim | chamada updateAs |
| 72 | `response` | module | `Response` | sim | chamada updateAs |
| 76 | `audits` | module | `{ organizationId: string; actorUserId: string; action: string; entityType: string; entityId: string; detail…` | sim | chamada db.select({ organizationId: schema.auditLogs.organizationId, actorUser |
| 99 | `cookie` | module | `string` | sim | chamada signInAndGetCookie |
| 100 | `response` | module | `Response` | sim | chamada post |
| 110 | `response` | module | `Response` | sim | chamada updateAs |
| 122 | `response` | module | `Response` | sim | chamada updateAs |
| 128 | `response` | module | `Response` | sim | chamada updateAs |

## tests/unit/actions/archive-client-rules.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 6 | `result` | module | `{ canArchive: boolean; reason?: string; }` | sim | chamada evaluateClientArchivalEligibility |
| 16 | `result` | module | `{ canArchive: boolean; reason?: string; }` | sim | chamada evaluateClientArchivalEligibility |
| 26 | `result` | module | `{ canArchive: boolean; reason?: string; }` | sim | chamada evaluateClientArchivalEligibility |
| 36 | `result` | module | `{ canArchive: boolean; reason?: string; }` | sim | chamada evaluateClientArchivalEligibility |

## tests/unit/actions/team-role-authorization.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 3 | `state` | module | `{ role: string; rows: Array<Record<string, unknown> \| undefined>; updateMemberRoleWithAudit: Mock<Procedur…` | sim | chamada vi.hoisted |

## tests/unit/actions/team-role-endpoint.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 3 | `state` | module | `{ actorRole: string; rows: Array<Record<string, unknown> \| undefined>; delegated: Mock<Procedure>; }` | sim | chamada vi.hoisted |
| 23 | `makeRequest` | module | `() => Request` | sim | função/callback |
| 38 | `response` | module | `Response` | sim | chamada POST |
| 45 | `response` | module | `Response` | sim | chamada POST |

## tests/unit/actions/workspace-api-errors.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 10 | `membershipA` | module | `{ organizationId: string; organizationName: string; role: string; }` | sim | objeto/configuração |
| 11 | `membershipB` | module | `{ organizationId: string; organizationName: string; role: string; }` | sim | objeto/configuração |
| 17 | `response` | module | `Response` | sim | chamada workspaceApiErrorResponse |
| 24 | `response` | module | `Response` | sim | chamada workspaceApiErrorResponse |
| 41 | `response` | module | `Response` | sim | chamada workspaceApiErrorResponse |
| 52 | `log` | module | `Mock<{ (...data: any[]): void; (message?: any, ...optionalParams: any[]): void; }>` | sim | chamada vi.spyOn(console, "error").mockImplementation |
| 53 | `response` | module | `Response` | sim | chamada workspaceApiErrorResponse |
| 56 | `body` | module | `string` | sim | chamada response.text |

## tests/unit/components/assignment-transfer-utils.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 5 | `members` | module | `MemberAssignmentSummary[]` | sim | lista |

## tests/unit/helpers/test-db.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 3 | `poolInstances` | module | `{ poolInstances: Array<{ connect: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn>; client: { releas…` | sim | chamada vi.hoisted |
| 3 | `identityRows` | module | `{ poolInstances: Array<{ connect: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn>; client: { releas…` | sim | chamada vi.hoisted |
| 20 | `validUrl` | module | `"<URL PostgreSQL omitida>"` | sim | literal string (valor omitido) |
| 57 | `message` | module | `string` | sim | literal string (valor omitido) |
| 58 | `error` | module | `unknown` | não | sem inicializador |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 4 | `connect` | `Mock<Procedure \| Constructable>` | module |
| 4 | `end` | `Mock<Procedure \| Constructable>` | module |
| 4 | `client` | `{ release: ReturnType<typeof vi.fn>; query: ReturnType<typeof vi.fn>; }` | module |
| 4 | `release` | `Mock<Procedure \| Constructable>` | module |
| 4 | `query` | `Mock<Procedure \| Constructable>` | module |
| 5 | `database` | `string` | module |
| 5 | `username` | `string` | module |
| 5 | `port` | `number` | module |
| 10 | `index` | `number` | module |
| 11 | `client` | `{ release: Mock<Procedure>; query: Mock<Procedure>; }` | module |
| 12 | `connect` | `Mock<Procedure>` | module |
| 13 | `end` | `Mock<Procedure>` | module |

## tests/unit/lib/deal-linked-tasks-error.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 4 | `publicConflict` | module | `{ ok: boolean; code: string; message: string; }` | sim | objeto/configuração |
| 16 | `error` | module | `Error` | sim | instância Error |
| 23 | `error` | module | `Error` | sim | instância Error |
| 42 | `error` | module | `{ code: string; constraint: string; cause?: unknown; }` | sim | objeto/configuração |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 42 | `code` | `string` | module |
| 42 | `constraint` | `string` | module |
| 42 | `cause` | `unknown` | module |

## tests/unit/lib/member-assignment-integrity-error.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 5 | `constraints` | module | `readonly ["clients_owner_member_assignment_fk", "deals_owner_member_assignment_fk", "tasks_assignee_member_…` | sim | lista |
| 11 | `publicConflict` | module | `{ code: string; message: string; }` | sim | objeto/configuração |
| 22 | `error` | module | `Error` | sim | instância Error |
| 32 | `error` | module | `Error` | sim | instância Error |
| 51 | `error` | module | `{ code: string; constraint: string; cause?: unknown; }` | sim | objeto/configuração |
| 62 | `response` | module | `Response` | sim | chamada handleAuthRequestWithMappedErrors |
| 73 | `response` | module | `Response` | sim | chamada handleAuthRequestWithMappedErrors |
| 83 | `response` | module | `Response` | sim | chamada handleAuthRequestWithMappedErrors |
| 92 | `error` | module | `Error` | sim | instância Error |
| 98 | `response` | module | `Response` | sim | chamada handleAuthRequestWithMappedErrors |
| 108 | `original` | module | `Error` | sim | instância Error |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 51 | `code` | `string` | module |
| 51 | `constraint` | `string` | module |
| 51 | `cause` | `unknown` | module |

## tests/unit/lib/organization-owner-invariant-error.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 7 | `error` | module | `Error` | sim | instância Error |
| 16 | `mapped` | module | `OrganizationOwnerConflict \| undefined` | sim | chamada mapOrganizationRequiresOwnerError |
| 33 | `error` | module | `{ code: string; constraint: string; cause?: unknown; }` | sim | objeto/configuração |
| 43 | `postgresError` | module | `Error & { code: string; constraint: string; }` | sim | chamada Object.assign |
| 47 | `response` | module | `Response` | sim | chamada handleAuthRequestWithMappedErrors |
| 60 | `unrelatedDatabaseError` | module | `Error & { code: string; constraint: string; }` | sim | chamada Object.assign |
| 64 | `preservedServerError` | module | `Response` | sim | chamada handleAuthRequestWithMappedErrors |
| 74 | `unrelatedRoute` | module | `Response` | sim | chamada handleAuthRequestWithMappedErrors |
| 86 | `postgresError` | module | `Error` | sim | instância Error |
| 92 | `response` | module | `Response` | sim | chamada handleAuthRequestWithMappedErrors |
| 102 | `original` | module | `Error` | sim | instância Error |

**Propriedades declaradas**

| Linha | Nome | Tipo | Contexto |
|---:|---|---|---|
| 33 | `code` | `string` | module |
| 33 | `constraint` | `string` | module |
| 33 | `cause` | `unknown` | module |

## tests/unit/schemas/client-schema.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 6 | `valid` | module | `{ kind: string; name: string; email: string; phone: string; status: string; source: string; notes: string; }` | sim | objeto/configuração |
| 15 | `parsed` | module | `ZodSafeParseResult<{ kind: "person" \| "company"; name: string; status: "active" \| "prospect" \| "inactive…` | sim | chamada clientSchema.safeParse |
| 20 | `invalid` | module | `{ kind: string; name: string; status: string; }` | sim | objeto/configuração |
| 25 | `parsed` | module | `ZodSafeParseResult<{ kind: "person" \| "company"; name: string; status: "active" \| "prospect" \| "inactive…` | sim | chamada clientSchema.safeParse |
| 30 | `validWithEmptyEmail` | module | `{ kind: string; name: string; email: string; status: string; }` | sim | objeto/configuração |
| 36 | `parsed` | module | `ZodSafeParseResult<{ kind: "person" \| "company"; name: string; status: "active" \| "prospect" \| "inactive…` | sim | chamada clientSchema.safeParse |
| 41 | `invalidEmail` | module | `{ kind: string; name: string; email: string; status: string; }` | sim | objeto/configuração |
| 47 | `parsed` | module | `ZodSafeParseResult<{ kind: "person" \| "company"; name: string; status: "active" \| "prospect" \| "inactive…` | sim | chamada clientSchema.safeParse |
| 52 | `invalidStatus` | module | `{ kind: string; name: string; status: string; }` | sim | objeto/configuração |
| 57 | `parsed` | module | `ZodSafeParseResult<{ kind: "person" \| "company"; name: string; status: "active" \| "prospect" \| "inactive…` | sim | chamada clientSchema.safeParse |

## tests/unit/schemas/deal-schema.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 4 | `dealSchema` | module | `z.ZodObject<{ clientId: z.ZodUUID; title: z.ZodString; amount: z.ZodString; expectedCloseAt: z.ZodOptional<…` | sim | chamada z.object |
| 11 | `stageSchema` | module | `z.ZodObject<{ dealId: z.ZodUUID; stage: z.ZodEnum<{ new_lead: "new_lead"; qualification: "qualification"; p…` | sim | chamada z.object({ dealId: z.uuid(), stage: z.enum(["new_lead", "qualification |
| 27 | `valid` | module | `{ clientId: string; title: string; amount: string; expectedCloseAt: string; }` | sim | objeto/configuração |
| 33 | `parsed` | module | `z.ZodSafeParseResult<{ clientId: string; title: string; amount: string; expectedCloseAt?: string \| undefin…` | sim | chamada dealSchema.safeParse |
| 58 | `withoutReason` | module | `{ dealId: string; stage: string; lossReason: string; }` | sim | objeto/configuração |
| 63 | `result` | module | `z.ZodSafeParseResult<{ dealId: string; stage: "new_lead" \| "qualification" \| "proposal" \| "negotiation" …` | sim | chamada stageSchema.safeParse |
| 68 | `withReason` | module | `{ dealId: string; stage: string; lossReason: string; }` | sim | objeto/configuração |
| 73 | `result` | module | `z.ZodSafeParseResult<{ dealId: string; stage: "new_lead" \| "qualification" \| "proposal" \| "negotiation" …` | sim | chamada stageSchema.safeParse |
| 78 | `wonDeal` | module | `{ dealId: string; stage: string; }` | sim | objeto/configuração |
| 84 | `openDeal` | module | `{ dealId: string; stage: string; }` | sim | objeto/configuração |

## tests/unit/schemas/task-schema.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 4 | `taskSchema` | module | `z.ZodObject<{ title: z.ZodString; description: z.ZodOptional<z.ZodString>; priority: z.ZodEnum<{ low: "low"…` | sim | chamada z.object |
| 15 | `valid` | module | `{ title: string; description: string; priority: string; dueAt: string; clientId: string; dealId: string; }` | sim | objeto/configuração |
| 23 | `parsed` | module | `z.ZodSafeParseResult<{ title: string; priority: "low" \| "normal" \| "high" \| "urgent"; dueAt: string; des…` | sim | chamada taskSchema.safeParse |
| 28 | `invalid` | module | `{ title: string; priority: string; dueAt: string; }` | sim | objeto/configuração |
| 37 | `invalidDate` | module | `{ title: string; priority: string; dueAt: string; }` | sim | objeto/configuração |

## tests/unit/security/content-security-policy.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 6 | `policy` | module | `string` | sim | chamada buildContentSecurityPolicy |
| 28 | `policy` | module | `string` | sim | chamada buildContentSecurityPolicy |

## tests/unit/security/sec-01b-logging.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 11 | `sink` | module | `{ error: Mock<Procedure>; warn: Mock<Procedure>; info: Mock<Procedure>; }` | sim | objeto/configuração |
| 12 | `logger` | module | `{ error: (input: SafeLogInput) => void; warn: (input: SafeLogInput) => void; info: (input: SafeLogInput) =>…` | sim | chamada createSafeLogger |
| 13 | `error` | module | `Error & { code: string; authorization: string; databaseUrl: string; clientName: string; email: string; caus…` | sim | chamada Object.assign |
| 39 | `encoded` | module | `[string]` | sim | acesso indexado |
| 40 | `record` | module | `Record<string, unknown>` | sim | chamada JSON.parse |
| 45 | `warning` | module | `Record<string, unknown>` | sim | chamada JSON.parse |
| 52 | `sink` | module | `{ error: Mock<Procedure>; warn: Mock<Procedure>; info: Mock<Procedure>; }` | sim | objeto/configuração |
| 53 | `logger` | module | `{ error: (input: SafeLogInput) => void; warn: (input: SafeLogInput) => void; info: (input: SafeLogInput) =>…` | sim | chamada createSafeLogger |
| 54 | `cyclic` | module | `Record<string, unknown>` | sim | objeto/configuração |
| 70 | `hostile` | module | `Error` | sim | instância Proxy |
| 76 | `sink` | module | `{ error: Mock<() => never>; warn: Mock<Procedure>; info: Mock<Procedure>; }` | sim | objeto/configuração |
| 77 | `logger` | module | `{ error: (input: SafeLogInput) => void; warn: (input: SafeLogInput) => void; info: (input: SafeLogInput) =>…` | sim | chamada createSafeLogger |
| 85 | `sink` | module | `{ error: Mock<Procedure>; warn: Mock<Procedure>; info: Mock<Procedure>; }` | sim | objeto/configuração |
| 86 | `logger` | module | `{ error: (input: SafeLogInput) => void; warn: (input: SafeLogInput) => void; info: (input: SafeLogInput) =>…` | sim | chamada createSafeLogger |
| 87 | `nameReads` | module | `number` | sim | literal escalar (valor omitido) |
| 88 | `error` | module | `Error` | sim | instância Error |
| 92 | `categoryReads` | module | `number` | sim | literal escalar (valor omitido) |
| 93 | `operationReads` | module | `number` | sim | literal escalar (valor omitido) |
| 94 | `codeReads` | module | `number` | sim | literal escalar (valor omitido) |
| 95 | `correlationReads` | module | `number` | sim | literal escalar (valor omitido) |
| 96 | `input` | module | `SafeLogInput` | sim | chamada Object.defineProperties |
| 107 | `encoded` | module | `[string]` | sim | acesso indexado |
| 120 | `sink` | module | `{ error: Mock<Procedure>; warn: Mock<Procedure>; info: Mock<Procedure>; }` | sim | objeto/configuração |
| 121 | `logger` | module | `{ error: (input: SafeLogInput) => void; warn: (input: SafeLogInput) => void; info: (input: SafeLogInput) =>…` | sim | chamada createSafeLogger |
| 122 | `stringify` | module | `Mock<{ (value: any, replacer?: (this: any, key: string, value: any) => any, space?: string \| number): stri…` | sim | chamada vi.spyOn(JSON, "stringify").mockImplementation |
| 136 | `marker` | module | `"SEC01C4_HTTP_CANARY"` | sim | literal string (valor omitido) |
| 137 | `error` | module | `Error` | sim | instância Error |
| 138 | `logger` | module | `Mock<{ (...data: any[]): void; (message?: any, ...optionalParams: any[]): void; }>` | sim | chamada vi.spyOn(console, "error").mockImplementation |
| 140 | `response` | module | `Response` | sim | chamada workspaceApiErrorResponse |
| 147 | `record` | module | `Record<string, unknown>` | sim | chamada JSON.parse |
| 152 | `sink` | module | `{ error: Mock<Procedure>; warn: Mock<Procedure>; info: Mock<Procedure>; }` | sim | objeto/configuração |
| 153 | `adapter` | module | `{ level: "warn"; disableColors: boolean; log(level: BetterAuthLogLevel, message: unknown, ...args: unknown[…` | sim | chamada createBetterAuthLogAdapter |
| 154 | `error` | module | `Error & { code: string; cookie: string; }` | sim | chamada Object.assign |
| 169 | `errorEvent` | module | `any` | sim | chamada JSON.parse |
| 177 | `warningEvent` | module | `any` | sim | chamada JSON.parse |
| 182 | `sink` | module | `{ error: Mock<Procedure>; warn: Mock<Procedure>; info: Mock<Procedure>; }` | sim | objeto/configuração |
| 183 | `auth` | module | `Auth<{ appName: string; baseURL: string; secret: string; database: (options: BetterAuthOptions) => DBAdapte…` | sim | chamada betterAuth |
| 191 | `response` | module | `Response` | sim | chamada auth.handler |
| 200 | `capturedOutput` | module | `string` | sim | chamada JSON.stringify |
| 205 | `warning` | module | `any` | sim | chamada JSON.parse |

## tests/unit/utils/csv.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 6 | `raw` | module | `"=cmd\|' /C calc'!A0"` | sim | literal string (valor omitido) |
| 7 | `cell` | module | `string` | sim | chamada csvCell |
| 12 | `raw` | module | `"+123456"` | sim | literal string (valor omitido) |
| 13 | `cell` | module | `string` | sim | chamada csvCell |
| 18 | `raw` | module | `"-5+5"` | sim | literal string (valor omitido) |
| 19 | `cell` | module | `string` | sim | chamada csvCell |
| 24 | `raw` | module | `"@SUM(1,2)"` | sim | literal string (valor omitido) |
| 25 | `cell` | module | `string` | sim | chamada csvCell |
| 30 | `raw` | module | `" \t=1+1"` | sim | literal string (valor omitido) |
| 31 | `cell` | module | `string` | sim | chamada csvCell |
| 36 | `raw` | module | `"Texto com \"aspas\""` | sim | literal string (valor omitido) |
| 37 | `cell` | module | `string` | sim | chamada csvCell |
| 42 | `d` | module | `Date` | sim | instância Date |
| 43 | `cell` | module | `string` | sim | chamada csvCell |
| 53 | `headers` | module | `string[]` | sim | lista |
| 54 | `rows` | module | `string[][]` | sim | lista |
| 58 | `doc` | module | `string` | sim | chamada csvDocument |

## tests/unit/utils/formatters.test.ts

| Linha | Nome | Escopo | Tipo efetivo | Inicializada | Origem sintática |
|---:|---|---|---|---|---|
| 6 | `formatted` | module | `string` | sim | chamada formatCurrency |
| 13 | `formatted` | module | `string` | sim | chamada formatCurrency |
| 26 | `utcDate` | module | `Date` | sim | instância Date |
| 27 | `formatted` | module | `string` | sim | chamada formatDate |
| 30 | `dateTimeFormatted` | module | `string` | sim | chamada formatDateTime |
| 37 | `iso` | module | `string` | sim | chamada recifeDateTimeToIso |

