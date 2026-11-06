# SEC-01C.1 — Remediação proposta para SEC-01-F001

**Status:** alteração implementada; validação dinâmica no PostgreSQL isolado, regressão E2E e preflights ainda pendentes. O achado permanece confirmado até essas verificações.

## Causa raiz

`updateMemberRole` persistia o novo papel por `auth.api.updateMemberRole` e, em seguida, inseria `audit_logs` em uma chamada Drizzle separada. A implementação instalada do Better Auth 1.7.14 não envolve o caminho `updateMemberRole` em `runWithTransaction`; a configuração transacional do adapter, por si só, não unia aquelas duas escritas. Uma falha no segundo passo deixava o papel alterado sem o evento.

## Estratégia implementada

Foi criado `src/modules/team/member-role-service.ts`, que realiza validação final, lock das memberships, update condicionado ao estado lido e insert de auditoria no mesmo `db.transaction` Drizzle/PostgreSQL. Qualquer falha da auditoria rejeita a callback da transação e deve reverter também o update do papel. A validação de OWNER, organização, membership, autoalteração, papel OWNER protegido e alteração concorrente é feita dentro da transação.

A Server Action usa o serviço compartilhado após seu guard OWNER. A rota HTTP Better Auth mantém a rota e middleware HTTP existentes; o hook `before` intercepta especificamente `POST /organization/update-member-role`, resolve a sessão pelos headers recebidos e encaminha a escrita ao mesmo serviço atômico. O wrapper de rota existente continua a negar os papéis não autorizados. A auditoria é registrada com ator, organização, membership e valores `from`/`to`.

Essa alteração substitui a escrita do endpoint Better Auth para este caminho; não foi assumida atomicidade por envolver a chamada do Better Auth numa transação Drizzle. O teste de integração HTTP passou a verificar auditoria no caminho positivo; a validação dinâmica continua necessária para confirmar a integração end-to-end do hook no runtime instalado.

## Testes preparados

- `tests/integration/sec-01b-audit-workspace.test.ts`: falha sintética apenas no `insert(audit_logs)` dentro da transação; espera erro, papel `member` mantido, nenhuma auditoria, OWNER/peer/tenant paralelo intactos e restauração do `runtime.db` em `finally`.
- O mesmo arquivo possui cenário positivo que verifica papel `admin` e evento com ator, organização e `from`/`to` corretos.
- `tests/integration/team-role-rbac.test.ts`: o fluxo HTTP positivo verifica a gravação da mesma auditoria; os cenários existentes de OWNER, ADMIN, MEMBER, self e OWNER protegido permanecem.
- `tests/unit/actions/team-role-authorization.test.ts`: verifica que somente a action autorizada chama o serviço, sem insert de auditoria fora da transação.

## Segurança e concorrência

O serviço recebe organização e ator da identidade/sessão resolvida no servidor; não usa papel vindo do cliente. As consultas de ator e destino são limitadas à organização e bloqueadas em ordem estável. O update inclui organização, usuário e papel anterior no predicado. O destino OWNER e a própria membership não podem ser alterados. O hook exige que a organização da requisição corresponda à organização ativa da sessão; o serviço ainda verifica OWNER e membership atuais sob lock.

O lock serializa operações concorrentes que disputem as mesmas memberships. Nenhum teste dinâmico de concorrência foi executado nesta etapa. A implementação não altera schema, constraints, Better Auth settings, M-01 ou I-01.

## Validação pendente e critério de status

TypeScript, lint e unitários foram executados localmente: TypeScript aprovado; lint aprovado; 92 testes unitários em 16 arquivos aprovados. A tentativa de integração no host carregou a configuração autorizada e removeu `DATABASE_URL`, mas `createIsolatedConnectionPair()` interrompeu antes de fixtures porque não confirmou a conexão/identidade esperada; 3 suítes falharam no setup e 11 casos foram skipped, sem executar seus corpos. `distrobox` e `podman` não estão disponíveis. Não executar esses testes contra `DATABASE_URL`.

No Bazzite, carregar `TEST_DATABASE_URL` de `~/.config/crm-test/connection.env`, validar novamente o alvo pelo helper existente, remover `DATABASE_URL` do processo e então executar a integração F001/F003, RBAC, regressão E2E e preflights M-01/I-01. Só após o teste de falha comprovar rollback no banco e a regressão relevante passar, atualizar SEC-01-F001 para corrigida.

## Risco restante

O hook Better Auth responde diretamente à chamada HTTP do endpoint para assegurar que a mutação não passe pela implementação não transacional do plugin. A integração de rota contém casos do caminho positivo e negativas de RBAC, mas a validação deste hook e do rollback contra PostgreSQL real permanece pendente. O guard de segurança bloqueou a tentativa de execução neste executor antes de qualquer fixture. O estado do F001, portanto, é **implementação preparada; confirmação dinâmica pendente**.
