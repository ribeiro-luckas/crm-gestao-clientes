# PRD — CRM e Gestão de Clientes

**Estado:** aprovado em 2026-10-30; implementação inicial em andamento. **Público inicial:** equipe comercial da fábrica de software. **Idioma:** pt-BR.

## Problema e resultado

Centralizar clientes, empresas, pipeline, tarefas, agenda e histórico em uma fonte confiável. A equipe deve acompanhar cada oportunidade de novo lead até ganho/perda e identificar a próxima ação necessária.

## Escopo do MVP

- Clientes pessoa física/empresa com nome, tipo, e-mail, telefone, status, origem, responsável e observações.
- Múltiplos contatos por empresa.
- Oportunidades em Novo lead → Qualificação → Proposta → Negociação → Ganho/Perdido; valor, responsável, previsão, cliente e motivo obrigatório de perda.
- Tarefas com título, descrição, prioridade, estado, vencimento, responsável e vínculos opcionais.
- Atividades: ligações, reuniões, e-mails, notas e acompanhamentos; histórico cronológico.
- Dashboard com métricas definidas em `database-model.md`.
- Pesquisa global, filtros, ordenação, paginação e exportação CSV autorizada.
- Usuários OWNER, ADMIN e MEMBER; sem cadastro público aberto.
- Um workspace no primeiro uso, com isolamento multi-organização desde o modelo. Sem billing/planos.

## Fora do escopo

Importação CSV, sincronização de e-mail/calendário, automações, notificações externas, cobrança, portal de cliente, app nativo, forecast probabilístico e relatórios configuráveis.

## Requisitos de qualidade

Isolamento por organização; WCAG 2.2 AA; responsividade desktop/tablet e fluxos centrais mobile; precisão monetária; timestamps consistentes; auditoria de ações importantes; minimização de dados pessoais; backup restaurável.

## Papéis e critérios de sucesso

OWNER administra workspace e usuários; ADMIN administra equipe e dados comerciais; MEMBER opera registros comerciais conforme política a aprovar. Proposta inicial: membro pode trabalhar nos dados do workspace, sem administrar membros/configurações. Um usuário autorizado consegue cadastrar cliente/contato, abrir e mover deal, registrar interação, criar tarefa e consultar indicadores. Um usuário de outra organização não acessa dados por URL/UUID, filtro ou exportação.

## Indicadores

Política aprovada: snapshot atual para carteira/pipeline e janela padrão de 30 dias para ganhos/conversão; as fórmulas e ressalvas estão em `database-model.md`.
