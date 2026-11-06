# Roadmap proposto

## Etapas de execução

0. **Planejamento (aprovado em 2026-10-30):** concluído.
1. **Fundação e Auth/workspace (em andamento):** estrutura Next.js/Drizzle, schema inicial, adapter Better Auth, guardas e script de bootstrap escritos. Instalação, validação runtime, migrations geradas/revisadas, conexão PostgreSQL e testes continuam pendentes.
2. **CRM base (em andamento):** páginas/ações para clientes, contatos, pesquisa e histórico escritos; instalação e funcionamento ainda não verificados.
3. **Operação comercial (em andamento):** oportunidades, quadro Kanban com transição de etapa, tarefas e atividades escritos; falta verificação integrada.
4. **Insights:** dashboard, filtros e CSV escritos; paginação completa e revisão de limites ainda pendentes.
5. **Endurecimento:** isolamento, acessibilidade, backup/restore, checklist ASVS selecionado, logs e revisão de privacidade.
6. **Piloto:** equipe limitada, correções e autorização explícita antes de publicação.

### Fase 3.3 — correção TypeScript, Better Auth e ESLint (2026-10-30)

- Corrigida a inferência concreta da instância Better Auth e adotada a integração oficial de rota Next.js; mantido o plugin Organization na mesma instância usada no servidor.
- `activeOrganizationId` já constava no schema Drizzle e em `0000_initial.sql`; não foi necessária migration. Nenhuma migration foi executada.
- Corrigidos `next/link`, tema SSR com `useSyncExternalStore`, imports não usados e export default anônimo.
- TypeScript e ESLint passaram. Build iniciou, mas não concluiu por falta de progresso do Turbopack; auditoria npm ficou bloqueada por `EAI_AGAIN` no registry. Detalhes e evidências em [`docs/validation-typescript.md`](validation-typescript.md).

### Fase 3.2 — recuperação do Git e validação inicial (2026-10-30)

- **Git:** bloqueado pelo filesystem. `.git` foi inspecionado como diretório vazio, pertencente a `ribeiroluckas:node`, modo `555`; renomear falhou com `Device or resource busy` e `git init --initial-branch=main` não conseguiu escrever no mount somente leitura. Nenhum backup foi criado, nenhum `.git` foi apagado, e não houve commit ou push.
- **Dependências:** revisão estática de `package.json` concluída; não havia lockfile. `npm install` não concluiu porque a resolução DNS para `registry.npmjs.org` retornou `EAI_AGAIN`; `package-lock.json` não foi gerado.
- **Validação:** `npm ls --depth=0` reportou dependências ausentes; `npm audit` ficou bloqueado sem lockfile; typecheck, lint e build não puderam executar por falta das dependências locais. Sem alterações funcionais ou de arquitetura.
- Evidências detalhadas: [`docs/validation-initial.md`](validation-initial.md). Repetir a fase depois de liberar escrita em `.git` e acesso ao registry npm.

## Dependências

Next/React/TypeScript/Tailwind/shadcn/Motion, PostgreSQL 18, Drizzle, Better Auth, Zod, RHF, Vitest, Playwright e axe-core; Node compatível, Distrobox `laboratorio-node`, Podman rootless e volume. Segredo Better Auth e credenciais locais. Serviço de e-mail para convite/reset; backup e destino seguro definidos antes de produção. Nenhum serviço externo configurado nesta fase. Quadlet deve ser avaliado após validar operação manual e restauração.

## Riscos

- Better Auth/Drizzle mudam: versões estáveis revisadas em 30/10/2026; gerar schema oficial e revisar IDs, tipos e migration após recuperar acesso ao npm do Distrobox. Usar Drizzle ORM >=0.45.2 para incluir correção de segurança; versão definida 0.45.4.
- MEMBER ainda sem política fechada de editar/ver todos.
- Definições de cliente ativo, janelas e timezone alteram indicadores.
- BRL simplifica início; moeda adicional requer política explícita de conversão.
- Exclusão lógica, retenção, LGPD e auditoria necessitam política operacional/legal.
- E-mail depende de serviço; cadastro aberto não deve servir de atalho.
- Rede entre Distrobox e Podman precisa ser validada sem alterar imagem base.
- Dashboard/CSV são pontos de exposição de PII; colunas e filtros exigem autorização e revisão.
- Bootstrap OWNER precisa ser repetível, restrito e sem senha padrão.

## Registro de agentes

Foram solicitados product_architect, design_director, frontend_engineer, backend_engineer, motion_designer, qa_accessibility e security_reviewer. O mecanismo nativo de subagentes retornou “agent type is currently not available”; nenhum foi carregado/executado. Não houve delegação de escrita nem agentes TOML declarados como executados. O conteúdo é consolidação do agente principal e consulta documental. Isso diverge do pedido de sete análises reais e fica como limitação explícita.

## Decisões aprovadas pelo usuário em 2026-10-30

O usuário aprovou o planejamento integral em 2026-10-30. A identidade Rota, política proposta para MEMBER, fórmulas/janela padrão, exclusão lógica, BRL inicial e escopo de indicadores passam a guiar o MVP, sujeitas a refinamento de produto não bloqueante. Implementação autorizada.
