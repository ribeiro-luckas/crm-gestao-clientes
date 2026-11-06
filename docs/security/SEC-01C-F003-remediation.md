# SEC-01C.2 — Remediação de SEC-01-F003

**Status:** implementação e testes preparados; validação dinâmica PostgreSQL/E2E pendente neste executor. F003 não deve ser marcada como encerrada até a regressão autorizada passar.

## Causa raiz

`src/lib/workspace.ts` resolvia a organização ativa por membership correspondente e, quando não encontrava correspondência, usava `memberships[0]`. O comportamento misturava dois estados distintos: ausência de seleção e identificador ativo presente, porém inválido ou sem membership atual. Em chamadas a páginas, ações e exportações, isso podia encaminhar a operação para uma organização diferente da que a sessão indicava. As memberships eram limitadas ao usuário atual; a evidência anterior não demonstrou acesso a uma organização sem vínculo, mas confirmou risco de integridade/contexto inesperado.

## Contrato de seleção definido

| Estado da sessão/membership | Comportamento |
|---|---|
| Sessão ausente ou revogada | Páginas autenticadas redirecionam ao login; APIs retornam 401. |
| Nenhuma membership atual | Recursos privados negados; página de escolha informa que não há workspace e oferece logout. |
| Uma membership, sem contexto ativo | Seleção inequívoca é ativada pelo `setActiveOrganization` do Better Auth; se falhar, exige nova seleção. |
| Várias memberships, sem contexto ativo | Não escolhe uma organização arbitrária; encaminha para seleção explícita. |
| Contexto ativo que corresponde a membership atual | Operação segue as verificações de papel existentes. |
| ID ativo inexistente, de terceiro ou com membership removida | Não há fallback; páginas exigem nova seleção, APIs respondem 409 e mutações/exportações não prosseguem. |
| Escolha explícita de workspace | O ID enviado é tratado como pedido; a ação confirma membership do usuário no servidor e usa `setActiveOrganization` do Better Auth, que também valida membership. |

## Implementação

- `resolveWorkspaceSelection` diferencia seleção válida, única membership inequívoca, ausência de escolha ambígua, ID inválido e ausência de memberships.
- `getWorkspaceContext` fail-closed para contexto inválido e direciona o usuário a `/workspace/select`; a seleção ausente de uma única membership permanece compatível com login/onboarding.
- `requireApiWorkspaceRole` não escolhe outra membership quando o ID ativo está presente e inválido. Retorna erro tipado de seleção requerida; os endpoints que usam `workspaceApiErrorResponse` respondem 409 com `private, no-store` e link de recuperação.
- O hook de criação de sessão só preserva um ID ativo que corresponde a membership. Sem ID solicitado, escolhe automaticamente apenas quando existe uma única membership; com várias, deixa a seleção vazia.
- A página `/workspace/select` lista exclusivamente memberships atuais do usuário. A Server Action verifica a membership no servidor e delega a persistência ao método instalado do Better Auth; não grava o ID enviado diretamente.
- A navegação autenticada disponibiliza troca de workspace; Configurações mantém o acesso visível em viewport móvel, onde o seletor do shell não aparece.

Não foram alteradas as permissões OWNER/ADMIN/MEMBER, a F001 transacional, schema, constraints, autenticação ou regras comerciais.

## Testes e evidências preparadas

- `tests/unit/actions/workspace-api-errors.test.ts`: tabela de decisão do resolver, incluindo ID inválido/removido, sem contexto com uma ou várias memberships, e erro HTTP de seleção.
- `tests/integration/sec-01b-audit-workspace.test.ts`: mantém casos F001 e cobre seleção única, multi-membership sem contexto, operações de criação de cliente/oportunidade/tarefa bloqueadas, exportação bloqueada, seleção explícita A/B, ID desconhecido/de outra organização, membership B removida e sessão revogada. Compara estado de entidades e auditoria antes/depois. Cleanup de fixtures é escopado.
- `tests/e2e/multitenant-security.spec.ts`: cobre contexto inválido sem renderizar registros do fallback, escolha e troca explícita por teclado em viewport móvel, recuperação da seleção única e usuário sem membership/logout.
- Testes de integração com active ID obsoleto em atribuições/transferência foram atualizados para afirmar recusa, sem estado persistido.

## Validações nesta execução

- `npm run typecheck`: aprovado.
- `npm run lint`: aprovado.
- `npm test`: 94/94 testes unitários aprovados em 16 arquivos.
- `git diff --check`: aprovado.
- `tests/integration/sec-01b-audit-workspace.test.ts`: **não executou os corpos**. O helper encerrou a tentativa antes das fixtures, informando que não confirmou conexão/identidade do PostgreSQL temporário; os quatro casos foram skipped e a suíte terminou bloqueada.
- E2E, testes de RBAC, rate limiting e preflights M-01/I-01 não foram executados. `distrobox` e `podman` não estão disponíveis neste executor. Nenhum resultado histórico foi contado como validação desta implementação.

A tentativa de integração carregou `~/.config/crm-test/connection.env`, removeu `DATABASE_URL`, definiu `CRM_TEST_MODE=1` e ainda assim foi interrompida pelo guard. Nenhum corpo de teste, fixture ou cleanup de banco foi executado. Não houve acesso ao banco principal, `.env.local`, migrations, bootstrap ou operação global.

## Testes pendentes no Bazzite

Na Distrobox autorizada, carregar a configuração de teste sem exibir a URL e rodar com `DATABASE_URL` removida:

```bash
set -a
. "$HOME/.config/crm-test/connection.env"
set +a
unset DATABASE_URL
CRM_TEST_MODE=1 npm run test:integration -- tests/integration/sec-01b-audit-workspace.test.ts tests/integration/team-role-rbac.test.ts tests/integration/reassignment-actions-better-auth.test.ts tests/integration/member-assignment-transfer-better-auth.test.ts
```

Executar também a regressão E2E completa e os preflights M-01/I-01 existentes, após confirmar que sua configuração Playwright usa somente o banco isolado. Confirmar especificamente: redirecionamento sem loop, seleção/switch A↔B, nenhum write/export com contexto inválido, axe conforme cobertura existente e invariantes OWNER/M-01/I-01.

## Limitações e risco remanescente

- A proteção está implementada nos pontos centrais de resolução e seleção, mas a interação Better Auth/DB e o comportamento de navegação ainda carecem de validação no runtime Bazzite para esta alteração.
- Expiração de sessão não recebeu cenário específico novo; sessão revogada/logout e sessão sem membership estão cobertos no teste preparado.
- A autorização de cada recurso permanece dependente dos guards e filtros existentes; esta mudança não substitui a revisão geral dos outros achados SEC-01.
- Até a execução dinâmica passar, classificar F003 como **correção implementada aguardando validação**, e não como corrigida.

## Conhecimento reutilizável

A regra geral — ausência de contexto e contexto explicitamente inválido devem ser estados diferentes em sistemas multi-tenant — foi aplicada no código, mas o teste dinâmico desta execução foi bloqueado pelo guard. O registro na base global da fábrica fica adiado até a validação Bazzite confirmar o comportamento ponta a ponta; não registrar a hipótese como padrão confirmado antes disso.

## Acompanhamento SEC-01C.2.1 — regressões E2E e axe

### Diagnóstico baseado nos relatórios

1. **Membership removida:** `test-results/multitenant-security-membe-12ce1-p-B-sem-acesso-indevido-a-A-chromium/error-context.md` mostra que, depois da remoção da membership A, o dashboard redirecionou para a página de escolha com `reason=invalid`. A tela exibiu somente o workspace B permitido e a mensagem de contexto indisponível. O teste antigo esperava ver B no dashboard sem selecioná-lo, expectativa incompatível com fail-closed; não há evidência de defeito no fluxo de seleção.
2. **Pipeline:** o DOM coloca o link visível do workspace entre a marca e a navegação principal em desktop. O teste dava foco programático à marca e presumiu que um Tab alcançaria “Visão geral”, ignorando o novo link. A falha foi expectativa de ordem desatualizada, não uma ordem DOM inadequada.
3. **Axe:** `test-results/ux-visual-audit/axe-results.json` registra 16 ocorrências da regra `label-content-name-mismatch`, todas no alvo `.workspace-switcher`, entre rotas/temas/larguras auditados. O `aria-label` “Trocar workspace. Atual: …” substituía o nome derivado do conteúdo visível, que contém o nome da organização e “Trocar workspace”. A divergência é reproduzível pela implementação.
4. **Auditoria UX:** `error-context.md` registra que o teste partia do skip link e avançava duas vezes antes de esperar o primeiro link principal. Nesse ponto da ordem DOM, o foco real estava no link de marca e depois no seletor de workspace; o teste não considerava esses controles válidos.

### Alterações

- `src/components/shell/app-shell.tsx`: removido o `aria-label` que substituía o texto interno. O nome acessível passa a derivar do link e incluir os rótulos visíveis de workspace e ação.
- `tests/e2e/multitenant-security.spec.ts`: depois da remoção de A, verifica que A continua como contexto inválido, que nenhum dado A/B é renderizado na página de seleção, seleciona B explicitamente, confirma B no dashboard e confirma 404 para um ID de cliente de A. Também verifica nome visível/acessível do seletor em organizações A e B.
- `tests/e2e/pipeline-listing-filters.spec.ts`: sequência real Tab/Shift+Tab agora verifica skip link, marca, seletor somente em desktop, navegação, saída da navegação para Pesquisa e volta; inclui 320 px e verifica foco visível.
- `tests/e2e/ux-visual-audit.spec.ts`: sequência de teclado verifica seletor, nome acessível, foco, navegação direta/reversa e saída para Configurações, sem suprimir axe ou trocar Tab por foco programático.

Essas correções não mudam a resolução do workspace, autorização, seleção ativa, F001, F002, RBAC ou isolamento. A seleção após revogação de A continua explícita.

### Validação desta etapa

Validações estáticas após as alterações: `npm run typecheck` aprovado; `npm run lint` aprovado; `npm test` com 94/94 testes aprovados em 16 arquivos; `git diff --check` e verificação de whitespace/newline nos seis arquivos desta atualização aprovados. O verificador da base compartilhada (`python3 ../../recursos/knowledge-base/scripts/check-consistency.py --project .`) terminou com zero erros.

As três specs Playwright não foram executadas nesta etapa. O executor não possui `distrobox` nem `podman`, e a conexão/identidade do PostgreSQL isolado não foi confirmada; portanto não iniciei servidor/browser nem testes que precisem do banco. Não há evidência nova de aprovação dos quatro cenários nem de axe zero após as correções. No Bazzite, executar primeiro `multitenant-security.spec.ts`, `pipeline-listing-filters.spec.ts` e `ux-visual-audit.spec.ts` com o Playwright existente e `TEST_DATABASE_URL` validada; confirmar nome acessível e zero `label-content-name-mismatch`; depois executar integrações F001/F003, F002, RBAC, regressão E2E completa e preflights M-01/I-01.

## Acompanhamento SEC-01C.2.2 — locators ambíguos restantes

Os relatórios da execução Bazzite indicaram duas violações de strict mode, sem falha de autorização ou de seleção:

1. **Alerta:** a estrutura real da página é a região nomeada “Escolha um workspace”, contendo a mensagem `role="alert"`; o Next.js também injeta `#__next-route-announcer__` com role alert. O teste agora busca o alerta dentro da região semântica da seleção, preservando a verificação textual da mensagem.
2. **Link de troca:** em Configurações, o link do App Shell tem nome acessível derivado do conteúdo que inclui a organização ativa; o link da seção de workspace tem o nome exato “Trocar workspace”. O teste agora usa `exact: true`, identificando esse controle sem depender da posição DOM nem de `.first()`.

Nenhuma asserção funcional foi removida ou enfraquecida: permanecem a validação da sessão e memberships, seleção de B, verificação do workspace ativo persistido, dados exibidos, isolamento de A e troca explícita para A em mobile. Não houve mudança de produção ou na política fail-closed.

Os ajustes nesta etapa são exclusivamente nos locators. `npm run typecheck`, `npm run lint` e `npm test` foram executados: typecheck e lint passaram; unitários, 94/94 em 16 arquivos. `git diff --check`, verificação de whitespace/newline nos três arquivos desta etapa e consistência da base de conhecimento passaram sem erros. Playwright, integração e regressão E2E não foram executados: este executor não dispõe de `distrobox` nem `podman`, e não foi possível confirmar a conexão/identidade do PostgreSQL isolado. A execução deve ser repetida no Bazzite; as falhas dos dois locators não podem ser consideradas resolvidas até os cenários afetados e a regressão completa passarem. A meta 45/47 e zero violações axe é contexto da execução anterior, não resultado desta correção.
