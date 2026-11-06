# Fase 3.3 — correção TypeScript, Better Auth e ESLint

Data: 2026-10-30

## Erros originais e causas

- Os TS18048 vinham da tipagem opcional e genérica de `standardAuth` como `ReturnType<typeof betterAuth>`, que descartava os métodos adicionados pelo plugin. `createAuth` já falha explicitamente se faltar `BETTER_AUTH_SECRET` ou se ele tiver menos de 32 caracteres; a instância padrão é criada de forma síncrona e obrigatória.
- `organization()` era importado de `better-auth/plugins` e incluído na instância server-side. A anotação genérica na variável ocultava `createOrganization` e `updateMemberRole`, apesar de os endpoints estarem expostos nos tipos e na implementação instalada da versão 1.7.14.
- `session.activeOrganizationId` já existia no schema Drizzle e na migration inicial (`0000_initial.sql`). Não há diferença de schema a migrar; a opção `schema: authSchema` do adapter inclui a tabela session. Não foi criada migration vazia nem executada migration.
- `updateMemberRole` precisava estreitar `role` recebido como string para os valores aceitos pelo endpoint, mantendo verificação de sessão, papel e membership na organização ativa.
- ESLint apontava navegação interna via `<a>`, atualização de estado dentro de `useEffect`, três imports não usados e exportação default anônima no PostCSS config.

## Arquivos alterados

- `src/lib/auth.ts`: tipo da instância passou a derivar de `ReturnType<typeof createAuth>`, mantendo inferência concreta da configuração e do plugin. `getAuth()` conserva configuração singleton obrigatória e erro explícito na ausência de segredo.
- `src/app/api/auth/[...all]/route.ts`: integração oficial `toNextJsHandler` de `better-auth/next-js`, ligada à mesma instância configurada.
- `src/modules/team/actions.ts`: papel validado é estreitado antes da chamada Better Auth; verificações anteriores e registro de auditoria permanecem.
- `src/components/settings/theme-control.tsx`: `useSyncExternalStore` resolve estado do tema com snapshot SSR estável; atualização persiste preferência e notifica inscritos. `useEffect` sincroniza apenas o atributo DOM.
- `src/app/(auth)/login/page.tsx`: marca usa `next/link`.
- `src/app/(app)/deals/page.tsx` e `src/app/api/export/deals.csv/route.ts`: imports não utilizados removidos.
- `postcss.config.mjs`: configuração nomeada antes da exportação default.
- `docs/roadmap.md`: fase documentada.

## Validação observada

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | Aprovado, código de saída 0, sem diagnóstico. |
| `npm run lint` | Aprovado após correções, código de saída 0, sem warnings. |
| `npm run build` | Não concluído: após iniciar otimização com Turbopack, ficou sem progresso por mais de 90 segundos. Não havia processo `next build` ativo ao inspecionar; a sessão foi interrompida (código 130). Uma tentativa inicial também deixou `.next/lock`, que foi removido após confirmar ausência de processo. Build permanece pendente de execução em ambiente funcional. |
| `npm audit --json` | Bloqueado por rede: endpoint do registry falhou com `EAI_AGAIN registry.npmjs.org`. A contagem anterior de quatro alertas moderados não pôde ser reproduzida nem atribuída a advisories específicos. |

## Dependências e segurança

- Árvore local observada: `drizzle-kit@0.31.11` traz `@esbuild-kit/esm-loader@2.6.5`, que traz `@esbuild-kit/core-utils@3.3.2` e `esbuild@0.18.20`. São pacotes depreciados na cadeia do Drizzle Kit. Não foi alterado o Drizzle Kit nem aplicada substituição sem consultar advisories e compatibilidade em registry acessível.
- `eslint@9.39.5` é a versão efetivamente instalada via faixa `^9.0.0`; é compartilhada/deduplicada com `eslint-config-next@16.4.3`. O lint executado passou. Sem resposta do audit não é possível dizer se algum alerta moderado incide sobre ESLint ou indicar versão corretiva compatível.
- `unrs-resolver@1.12.2` é dependência de `eslint-import-resolver-typescript@3.10.1` sob `eslint-config-next@16.4.3`.
- `esbuild` aparece em `drizzle-kit` e `tsx`/Vitest-Vite com versões locais 0.18.20, 0.25.12 e 0.28.2. Os metadados instalados indicam executáveis de plataforma; scripts pendentes de `esbuild`/`unrs-resolver` não foram aprovados nem executados automaticamente nesta etapa.
- Não foi usado `npm audit fix --force`; nenhuma dependência ou versão foi alterada. A classificação individual dos quatro alertas, alcance, correções compatíveis e status exato dos scripts ficam pendentes de nova auditoria com acesso ao registry.

## Pendências

- Repetir `npm run build` em ambiente em que o build Turbopack conclua.
- Repetir `npm audit --json` com registry acessível e avaliar advisory por advisory antes de qualquer atualização.
- Não executar migration antes de PostgreSQL estar configurado. O campo `active_organization_id` já consta na migration inicial.
- Testes unitários e E2E não foram solicitados na lista obrigatória desta fase e não foram executados.
