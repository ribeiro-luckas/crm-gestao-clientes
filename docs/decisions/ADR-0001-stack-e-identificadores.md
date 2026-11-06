# ADR-0001 — Stack e identificadores

- **Estado:** aprovada pelo usuário; versões revisadas em 30/10/2026.
- **Consulta:** 30/10/2026.

## Contexto e decisão

Adotar monólito modular com Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4/shadcn/ui/Motion, PostgreSQL 18, Drizzle ORM 0.45.4 e drizzle-kit 0.31.11, Better Auth 1.7.14 com o pacote separado `@better-auth/drizzle-adapter`, Zod, React Hook Form, Vitest, Playwright e axe-core. Estes são ranges semver; lockfile e compatibilidade integrada ainda dependem de instalação bem-sucedida. Drizzle ORM 1.x permanece release candidate, portanto não é adotado.

IDs Better Auth permanecem `text/string` conforme schema da biblioteca. Registros comerciais usam UUID para PK e `organization_id text` com FK direta a `organization.id`; FKs de usuário/responsável também são text. `organization`/`member` do plugin seguem schema próprio. Nunca converter UUID↔text nas tabelas integradas ao auth.

## Fontes oficiais

- Next.js 16 Active LTS: [support policy](https://nextjs.org/support-policy), [release 16](https://nextjs.org/blog/next-16).
- React 19.3 listado como estável: [releases](https://react.dev/versions).
- Tailwind 4 estável: [release](https://tailwindcss.com/blog/tailwindcss-v4).
- Better Auth Drizzle/PG e Organization: [instalação](https://better-auth.com/docs/installation), [plugin](https://better-auth.com/docs/plugins/organization), [database](https://better-auth.com/docs/concepts/database).
- Better Auth 1.7.14: [release oficial](https://github.com/better-auth/better-auth/releases/tag/v1.7.14); adapter Drizzle separado: [guia oficial](https://better-auth.com/docs/adapters/drizzle).
- Drizzle ORM 0.45.4 / drizzle-kit 0.31.11: [releases oficiais](https://github.com/drizzle-team/drizzle-orm/releases). O ORM 0.45.2 corrigiu o advisory em versões até 0.45.1: [GHSA-gpj5-g38j-94v9](https://github.com/drizzle-team/drizzle-orm/security/advisories/GHSA-gpj5-g38j-94v9).
- PostgreSQL 18: [press kit](https://www.postgresql.org/about/press/presskit18/en/).
- Colunas PostgreSQL em Drizzle: [documentação](https://orm.drizzle.team/docs/column-types).

## Consequências e verificação pendente

Evita microsserviços e incompatibilidade de tipos entre auth e domínio, mantendo PK UUID no CRM e ID textual oficial na organização. O adapter Drizzle é publicado separadamente conforme a documentação atual. Instalação, geração do schema/migration e validação de tipos continuam pendentes porque o Distrobox bloqueou a inicialização npm.
