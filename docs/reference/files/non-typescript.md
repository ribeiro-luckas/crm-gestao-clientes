# Arquivos operacionais e não TypeScript

Inventário manual de arquivos necessários ao build, banco, instalação ou execução que não são cobertos pelo catálogo AST TypeScript.

| Caminho | Categoria | Responsabilidade e relação |
|---|---|---|
| `package.json` | Manifesto npm | Declara dependências e scripts de desenvolvimento, testes, build, Drizzle e bootstrap OWNER. |
| `package-lock.json` | Lockfile | Fixa a árvore de dependências npm para instalação reproduzível por `npm ci`. |
| `.node-version` | Runtime | Indica Node.js 24 para ambiente local/plataforma compatível. |
| `.env.example` | Exemplo de configuração | Modelo com valores demonstrativos/placeholders; nunca deve conter segredo utilizável. `.env*` permanece ignorado, exceto este arquivo. |
| `.gitignore` | Segurança Git | Exclui segredos locais, diretórios gerados e instruções locais de agentes; não remove arquivos do disco. |
| `src/app/globals.css` | Estilos | Tokens/utilitários globais Tailwind e estilos globais do App Router. |
| `scripts/render-build.sh` | Build de publicação | Limpa env herdado de runtime, cria configuração sintética efêmera e executa instalação/build; não migra banco. |
| `render.yaml` | Blueprint Render | Declara serviço Web Node Free, comandos, health check, env e deploy manual; precisa de validação da plataforma antes da criação. |
| `src/db/migrations/meta/_journal.json` | Drizzle metadata | Ordena migrations conhecidas pelo Drizzle Kit. |
| `src/db/migrations/0000_initial.sql` | Migration | Cria schema inicial auth/CRM, entidades, índices e relações. |
| `src/db/migrations/0001_organization_owner_guard.sql` | Migration | Introduz mecanismo de guarda/invariante de OWNER. |
| `src/db/migrations/0002_organization_creation_owner_required.sql` | Migration | Adiciona validação de OWNER ao bootstrap/criação organizacional. |
| `src/db/migrations/0003_member_assignment_integrity.sql` | Migration | Adiciona integridade referencial de atribuições de membros. |
| `src/db/migrations/0004_member_assignment_integrity_validate.sql` | Migration | Valida a integridade das constraints de atribuição. |
| `src/db/migrations/0005_task_deal_client_consistency.sql` | Migration | Impõe consistência entre task, deal e client. |
| `src/db/migrations/0006_task_deal_client_consistency_validate.sql` | Migration | Valida constraints de consistência de task/deal/client. |
| `next-env.d.ts` | Tipagem gerada Next.js | Declara tipos do Next e importa tipos gerados em `.next`; manter compatível com versão Next, sem editar manualmente os tipos gerados. |
| `tsconfig.json` | TypeScript | Define compilação, resolução de aliases e escopo TS. |
| `eslint.config.mjs` | ESLint | Configura regras lint do projeto. |
| `postcss.config.mjs` | CSS build | Integra Tailwind/PostCSS no build. |
| `vitest.config.ts` | Testes unitários | Configuração Vitest para suites unitárias. |
| `vitest.integration.config.ts` | Testes de integração | Configuração Vitest separada para integração. |
| `playwright.config.ts` | E2E | Configura browser, base URL e web server de teste. |
| `drizzle.config.ts` | Drizzle Kit | Configuração de schema/geração; URL de migrate é `DATABASE_URL_MIGRATIONS`, sem fallback à URL runtime. |
| `drizzle.migrate.config.ts` | Drizzle migrations | Exige `DATABASE_URL_MIGRATIONS` explicitamente antes da migration. |
| `drizzle.test.config.ts` | Drizzle testes | Valida `TEST_DATABASE_URL` e impede colisão com banco configurado para CRM. |

Os relatórios de segurança, deploy, incidentes e contexto de agentes permanecem em `docs/` localmente. A recomendação de inclusão no primeiro commit consta na revisão DEPLOY-03; não são migrations ou documentação de operação indispensável ao binário.
