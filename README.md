# CRM Gestão de Clientes

CRM web multi-organização para acompanhar clientes, contatos, oportunidades, tarefas e atividades. O projeto está em etapa experimental de desenvolvimento e demonstração; não está aprovado para produção comercial e não deve receber dados pessoais reais.

## Funcionalidades implementadas

- Autenticação Better Auth por e-mail e senha, com cadastro público desativado.
- Workspaces organizacionais e seleção de organização ativa.
- Cadastro, edição, atribuição e arquivamento protegido de clientes e contatos.
- Pipeline de oportunidades, tarefas, atividades e exportações CSV.
- Papéis OWNER, ADMIN e MEMBER com verificações no servidor.
- Auditoria transacional de alterações relevantes e isolamento por organização reforçado por consultas e constraints PostgreSQL.
- CSP com nonce para documentos e cabeçalhos de segurança.

As restrições funcionais e de implantação estão descritas em [Arquitetura](docs/architecture/overview.md), [Fluxos](docs/architecture/flows.md), [DEPLOY-01](docs/deployment/DEPLOY-01-render-neon-preparation.md), [DEPLOY-02](docs/deployment/DEPLOY-02-local-preflight.md) e [limitações](docs/guides/development.md#limitações).

## Stack

Next.js 16.4.3 (App Router), React 19.3.1, TypeScript 5.9, Node.js 24, PostgreSQL, Drizzle ORM, Better Auth, Tailwind CSS 4, Vitest e Playwright. Versões declaradas e exatas estão em `package.json` e `package-lock.json`; `.node-version` fixa a linha 24.

## Requisitos

- Node.js 24 e npm compatível com o lockfile.
- PostgreSQL isolado para executar a aplicação e testes de integração.
- Para desenvolvimento neste ambiente, usa-se Distrobox `laboratorio-node`; veja [guia de desenvolvimento](docs/guides/development.md).
- Não é necessário instalar ferramentas globalmente.

## Instalação e configuração

```bash
npm ci
cp .env.example .env.local
```

Edite `.env.local` localmente e use apenas credenciais sintéticas em bancos descartáveis. O arquivo `.env.local` é ignorado pelo Git e não deve ser compartilhado. A referência de nomes, escopos e validações está em [variáveis de ambiente](docs/reference/environment-variables.md).

Para desenvolvimento, configure PostgreSQL local descartável em `DATABASE_URL`, `BETTER_AUTH_SECRET` com ao menos 32 caracteres e `BETTER_AUTH_URL` com a origem local. A aplicação não executa migrations automaticamente.

## Banco de dados e autenticação

O schema Drizzle está em `src/db/schema/`; migrations versionadas estão em `src/db/migrations/`. `DATABASE_URL` é a credencial de runtime. `DATABASE_URL_MIGRATIONS` é separada e consumida explicitamente pelo comando de migration. Nunca aplique migrations sem revisar o destino e obter autorização para aquele banco.

O bootstrap do primeiro OWNER é uma operação pontual, exige tabelas iniciais vazias e variáveis `CRM_OWNER_*`/`CRM_ORGANIZATION_*`. Leia o guia antes de qualquer execução: [desenvolvimento e bootstrap](docs/guides/development.md#bootstrap-do-owner). Não mantenha credenciais de bootstrap após seu uso.

## Execução

```bash
npm run dev
```

O servidor local usa Next.js. Para produzir e servir build:

```bash
npm run build
npm start
```

O build requer ambiente sintético, mas não deve acessar banco. Para publicação manual futura, o script `scripts/render-build.sh` cria credenciais efêmeras de build; consulte [guia de publicação](docs/guides/deployment.md).

## Testes e qualidade

```bash
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run test:e2e
```

Os testes de integração podem exigir PostgreSQL descartável e `TEST_DATABASE_URL` com destino validado pelo projeto. Não aponte testes a banco existente. O Playwright exige browser disponível. Veja [guia de testes](docs/guides/testing.md) para escopos, isolamento e skips condicionais.

## Estrutura

```text
src/app/          rotas e layouts Next.js
src/components/   componentes React por domínio
src/modules/      ações e regras de domínio
src/lib/          autenticação, segurança e utilitários compartilhados
src/db/           conexão, schemas e migrations Drizzle/PostgreSQL
scripts/          bootstrap e tarefas operacionais
tests/            unitários, integração, E2E e helpers
docs/             arquitetura, referência e procedimentos
```

O [mapa de estrutura](docs/architecture/structure.md) e o [catálogo de arquivos](docs/reference/index.md) detalham os módulos. O catálogo AST lista todas as funções e variáveis encontradas.

## Documentação

- [Índice da documentação](docs/README.md)
- [Visão da arquitetura](docs/architecture/overview.md)
- [Fluxos de negócio e segurança](docs/architecture/flows.md)
- [Variáveis de ambiente](docs/reference/environment-variables.md)
- [Desenvolvimento](docs/guides/development.md)
- [Testes](docs/guides/testing.md)
- [Publicação experimental](docs/guides/deployment.md)
- [Revisão do primeiro commit — DEPLOY-03](docs/deployment/DEPLOY-03-initial-commit-review.md)

## Ambientes e limites

- **Desenvolvimento:** execução local, dados sintéticos e banco descartável.
- **Testes:** suites isoladas; integração requer destino PostgreSQL local explicitamente validado.
- **Homologação:** evidências históricas documentadas em `docs/security/`; resultados anteriores não comprovam execução atual.
- **Produção:** não autorizada nem aprovada. Não usar dados reais nem considerar a demonstração gratuita como serviço comercial.

O preflight local DEPLOY-02 mediu pico combinado de 258,2 MiB sob limite cgroup efetivo de 512 MiB, em um ensaio local representativo. Isso não garante os limites de CPU, suspensão, rede ou disponibilidade da Render. G-11 e G-15 permanecem parcialmente validados. Cadastro público está desabilitado; convites não enviam e-mail sem provedor; bootstrap OWNER requer operação manual controlada.
