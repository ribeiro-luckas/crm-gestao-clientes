# Guia de desenvolvimento

## Ambiente e instalação

Use Node.js 24 indicado por `.node-version` e npm. Neste ambiente, execute comandos no Distrobox `laboratorio-node`; preserve a imagem/container compartilhado e não instale ferramentas globalmente no host.

```bash
npm ci
cp .env.example .env.local
```

Configure `.env.local` com uma URL PostgreSQL local descartável, `BETTER_AUTH_SECRET` sintético de no mínimo 32 caracteres e `BETTER_AUTH_URL=http://localhost:3000`. Não abra ou compartilhe arquivos de ambiente, não use credenciais reais e não ligue a banco existente. O arquivo `.env.local` é ignorado.

## Banco local

Revise o destino antes de qualquer migration. `npm run db:generate` gera SQL versionável; `npm run db:migrate` usa somente `DATABASE_URL_MIGRATIONS`. A configuração `drizzle.config.ts` carrega env files via `@next/env` para tarefas Drizzle que a utilizem; a configuração de execução `drizzle.migrate.config.ts` não carrega `.env.local` por si só e exige variável já fornecida pelo processo. O comando pode alterar schema e deve ser apontado exclusivamente a banco descartável autorizado.

## Executar aplicação

```bash
npm run dev
```

Abra `http://localhost:3000/login`. O servidor não aplica migrations automaticamente. Para build e execução de produção local, consulte [build e start](../guides/deployment.md#build-local).

## Bootstrap do OWNER

`npm run bootstrap:owner` é uma operação de uso único: requer `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` e `CRM_OWNER_EMAIL`, `CRM_OWNER_PASSWORD`, `CRM_OWNER_NAME`, `CRM_ORGANIZATION_NAME`, `CRM_ORGANIZATION_SLUG`. Antes de executar, confirme que user/organization/member estão vazias no banco experimental correto. Script adquire advisory lock, cria owner/organização e verifica membership. Se falhar após inserção parcial, não faz rollback externo automático nem apaga os dados; interrompa e investigue. Credenciais devem ser fornecidas por secret manager ou mecanismo seguro, nunca pelo Git ou linha de comando persistente, e removidas logo após o bootstrap. Não foi executado nesta revisão.

## Limitações

- Cadastro público permanece desabilitado.
- Convites requerem provedor de e-mail ainda não configurado e não são um fluxo operacional de envio.
- G-11 e G-15 seguem parcialmente validados.
- Nenhuma aprovação para produção comercial; usar somente usuários e dados fictícios.
- Render/Neon não foram criados nem conectados.
