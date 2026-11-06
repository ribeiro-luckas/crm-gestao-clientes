# Modelo PostgreSQL proposto

## Identificadores e tipos

Tabelas Better Auth seguem rigorosamente o schema da versão fixada: IDs `text/string` e FKs de sessão/conta/membro/invitation compatíveis. Entidades comerciais usam UUID no próprio registro e `organization_id text` obrigatório, com FK direta para `organization.id` do Better Auth. Referências a usuário/responsável também são `text`. Timestamps `timestamptz` (armazenamento UTC), exibidos em `America/Recife`; tabelas mutáveis têm `created_at`, `updated_at`; registros arquiváveis têm `deleted_at`.

## Tabelas

| Tabela | Campos e restrições principais |
|---|---|
| Better Auth `user`, `session`, `account`, `verification` | Geradas/mantidas conforme Better Auth + Drizzle. Não customizar sem gerar e revisar schema/migration da versão. IDs/FKs textuais. |
| `organization` | Plugin Better Auth: `id text`, nome, slug único, `created_at`. |
| `member` | Plugin: `id text`, `organization_id text`, `user_id text`, `role text`, data; único por organização+usuário. |
| `invitation` | Plugin Better Auth, IDs/FKs text conforme schema; e-mail real depende de provider. |
| `clients` | `id uuid`, `organization_id text`, `kind` person/company, nome obrigatório, e-mail/telefone opcionais, status/origem, `owner_user_id text` opcional, notas minimizadas, timestamps, `deleted_at`. |
| `contacts` | UUID e tenant, `company_client_id uuid`, nome obrigatório, cargo/e-mail/telefone opcionais, timestamps, `deleted_at`; empresa deve ser do mesmo tenant. |
| `deals` | UUID e tenant, `client_id uuid NOT NULL`, título, estágio, `amount numeric(14,2)`, `currency text` default BRL com CHECK nesta fase, owner textual, previsão `date`, `loss_reason`, `closed_at timestamptz`, timestamps e `deleted_at`; valor >= 0. Perdido exige motivo e fechamento; Ganho exige fechamento. |
| `tasks` | UUID e tenant, título obrigatório, descrição opcional, prioridade/status, `due_at timestamptz`, `assignee_user_id text`, cliente/oportunidade opcionais, timestamps, `deleted_at`. Se cliente e oportunidade forem informados juntos, a oportunidade deve pertencer ao cliente informado. A FK tripla usa `MATCH SIMPLE`, `ON DELETE RESTRICT` e `ON UPDATE RESTRICT`; alterar o cliente da oportunidade com tarefas explicitamente vinculadas exige reconciliação explícita das tarefas, sem propagação automática. Tarefa com `client_id NULL` e `deal_id` preenchido continua permitida e permanece sem cliente após a troca do deal. Registros arquivados também são protegidos. |
| `activities` | UUID e tenant, tipo call/meeting/email/note/follow_up, resumo obrigatório, texto opcional, `occurred_at timestamptz`, autor textual, vínculo opcional a cliente/deal/tarefa; exigir ao menos vínculo cliente ou deal. |
| `audit_logs` | UUID e tenant, ator textual, ação, tipo/ID da entidade, data e detalhes JSON serializados em `text` com allowlist não sensível; sem edição/exclusão pelo fluxo comum. Retenção pendente de política. |

Não criar uma tabela `organizations` paralela. O `organization_id text` comercial referencia a organização Better Auth; IDs UUID permanecem apenas nas entidades do CRM. As FKs compostas usam `(organization_id, id)` mantendo o tipo text do tenant.

## Integridade e exclusão

Criar unique `(organization_id, id)` nas tabelas de domínio e FKs compostas `(organization_id, client_id/deal_id/...)` para bloquear referências cross-tenant no banco. A I-01 adiciona uma chave candidata `(organization_id,id,client_id)` em `deals` e uma FK tripla para garantir que a tarefa, quando tem ambos os vínculos, associe a mesma oportunidade e cliente; `MATCH SIMPLE` mantém `client_id`/`deal_id` opcionais. O SQLSTATE esperado ao alterar o cliente de oportunidade ainda referenciada é `23001` (`tasks_deal_client_consistency_fk`); inconsistência introduzida por INSERT/UPDATE da tarefa é rejeitada pela FK. Owners/responsáveis referenciam `user.id` text e têm membership validado no serviço. Índices compostos iniciam pelo tenant.

Clientes, contatos, deals e tarefas têm exclusão lógica. Bloquear arquivamento de empresa com contatos/registros ativos ou exigir fluxo explícito de arquivamento; sem cascade silencioso. Atividades e auditoria sem exclusão comum. Política legal de retenção e descarte será definida antes de dados reais. Auth usa exclusões definidas pelo schema do Better Auth.

## Índices

- clients: `(organization_id,status,name)`, `(organization_id,owner_user_id)`; avaliar unicidade de e-mail normalizado com política de duplicatas.
- contacts: `(organization_id,company_client_id,name)`.
- deals: `(organization_id,stage,expected_close_at)`, `(organization_id,owner_user_id,stage)`, `(organization_id,closed_at)`.
- tasks: `(organization_id,status,due_at)`, `(organization_id,assignee_user_id,due_at)`.
- activities: `(organization_id,occurred_at desc)` e pelos vínculos.
- audit_logs: `(organization_id,created_at desc)`, `(organization_id,entity_type,entity_id)`.
- Auth: índices únicos/lookup exigidos pelo schema oficial gerado.

Busca inicia com texto normalizado e paginação; `pg_trgm`/FTS só após justificar extensão e plano de operação.

## Dinheiro e dashboard

Armazenar `numeric(14,2)` e trafegar decimal como string, sem float binário. BRL é a moeda inicial; não somar moedas diferentes. Fórmulas propostas:

- **Clientes ativos:** clientes não excluídos com status ativo.
- **Leads:** deals abertos no estágio Novo lead.
- **Oportunidades em aberto:** deals não excluídos em Novo lead, Qualificação, Proposta ou Negociação.
- **Valor do pipeline:** soma não ponderada de amount desses deals abertos.
- **Negócios ganhos:** deals Ganho com `closed_at` dentro do período escolhido.
- **Taxa de conversão:** Ganho / (Ganho + Perdido), fechados no mesmo período; zero se denominador zero. Mostrar janela temporal.
- **Tarefas atrasadas:** vencidas antes do instante atual, fora de concluídas/canceladas.
- **Próximos compromissos:** reuniões e tarefas futuras em ordem cronológica, limitadas à janela exibida.

Política aprovada: snapshot atual para carteira/pipeline e período de 30 dias para ganhos/conversão. “Cliente ativo” corresponde a status `active`; conversão é por quantidade, não por valor.

## CSV

Exportação usa tenant, filtros e permissões atuais; limitar volume e colunas, registrar evento. Neutralizar células iniciadas por `=`, `+`, `-`, `@`, tab ou carriage return para reduzir CSV formula injection.
