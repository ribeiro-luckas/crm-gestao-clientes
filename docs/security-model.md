# Modelo de segurança

Estado atual: controles estruturais e guardas de acesso foram escritos na implementação inicial, mas ainda não executados nem revisados por testes. Rate limiting, confirmação de e-mail/reset, política de retenção, backup e checklist ASVS permanecem pendentes. Não usar dados reais até validação.

## Autenticação e bootstrap

Better Auth com adapter Drizzle oficial/PostgreSQL, sessão em cookie HttpOnly e Secure em produção, SameSite/expiração conforme recomendações da biblioteca. Sem cadastro aberto. Bootstrap server-side restrito e de uso único cria OWNER inicial sem senha padrão; credencial é definida em canal seguro. Convites e recuperação de senha ficam inativos até serviço de e-mail e verificação configurados.

Plugin Organization fornece organization/member/invitation e base de papéis. Mapear nomes lowercase do plugin à interface OWNER/ADMIN/MEMBER. Definir permissões de CRM explicitamente; toda ação de domínio verifica role/membership no servidor, independentemente dos controles da UI.

## Autorização e isolamento

- Obter sessão pelo API oficial no servidor e confirmar membership/papel em operações sensíveis.
- Nunca confiar em `organization_id` do body, query string ou cliente; contexto vem da sessão autenticada.
- Todas as consultas, agregações, busca, detalhes, paginação e exportação filtram por tenant confiável.
- Carregar alvo por `(organization_id,id)` antes de leitura ou mutation; UUID não é autorização.
- FKs compostas impedem relacionamentos cross-tenant. RLS pode ser avaliada como defesa adicional quando contexto e pool de conexão forem garantidos; não substitui autorização da aplicação.
- Respostas para registro de outra organização/inexistente não devem permitir enumeração.

## Validação e web

Validar toda entrada no servidor com Zod; RHF melhora a experiência, não é barreira. Restringir enums, comprimentos, ordenação, filtros e paginação. Escapar saída, não renderizar HTML arbitrário. Implementar proteção CSRF/origin e rate limiting conforme documentação de Next.js/Better Auth. Não colocar PII em URL, logs, analytics ou erros.

## Segredos

`BETTER_AUTH_SECRET`, credencial do banco e chaves ficam só em arquivo local ignorado ou gerenciador futuro. `.env.example` terá placeholders sem valor utilizável. Rotação e menor privilégio; usuário SQL da aplicação sem superuser. Nenhum segredo ou senha padrão em seed.

## Auditoria e privacidade

Registrar alterações relevantes, arquivamento, mudança de estágio/valor/responsável, gestão de papéis e exportação. Allowlist do que mudou; nunca armazenar password, token, cookie ou corpo integral de notas no log. Minimizar PII; estabelecer retenção, acesso, backup/restore e resposta a incidentes antes de dados reais. Aplicabilidade LGPD e papéis controlador/operador necessitam decisão operacional/jurídica.

OWASP ASVS 5.0 será checklist rastreável. Definir nível-alvo conforme risco antes do beta; cobrir sessão, acesso, validação, criptografia, logging, configuração e dados. O plano não representa certificação.
