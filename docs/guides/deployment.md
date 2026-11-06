# Guia de publicação experimental

Esta sequência é manual e fica condicionada a autorização explícita para criar serviços e publicar código. Não representa aprovação comercial. Usar somente usuários, organização e dados inteiramente fictícios; respeitar limite financeiro de R$ 50/mês, manter plano Free e não promover automaticamente para plano pago.

## Configuração declarada

`render.yaml` descreve um Web Service Node Free, Node runtime, deploy automático desligado, build por `bash scripts/render-build.sh`, start `npm start` e health check `/login`. O nome do serviço ainda deve ser escolhido/disponibilizado pelo responsável. Render Free não foi criado nem validado via Blueprint. `BETTER_AUTH_SECRET` e `DATABASE_URL` são secrets manuais; `BETTER_AUTH_URL` referencia a origem HTTPS externa de Render. Revisar Blueprint atual antes de criar o serviço.

## Neon e credenciais

Após autorização para criar o banco experimental, usar PostgreSQL com TLS e verificar a conexão real do driver `pg`. `DATABASE_URL` runtime usa papel de privilégio mínimo e conexão pooled apropriada ao plano; `DATABASE_URL_MIGRATIONS` deve ser credencial separada, de uso temporário, para migration. Confirmar se o plano Neon permite criar papéis/permissões necessários antes de criar. Não colocar credenciais no YAML ou Git.

## Build local

```bash
npm ci
npm run typecheck
npm run lint
npm test
bash scripts/render-build.sh
```

O script de Render roda `npm ci` e build com valores de build efêmeros/sintéticos; não configura runtime. O Node é fixado por `.node-version`. O ensaio DEPLOY-02 observou build separado do limite de runtime.

## Preparação de migrations

1. Confirmar destino Neon experimental vazio e backup/recuperação compatível com o plano.
2. Auditar migrations versionadas em `src/db/migrations` e esquema resultante.
3. Disponibilizar `DATABASE_URL_MIGRATIONS` somente na sessão/runner autorizado de migrations, sem compartilhar o valor.
4. Executar `npm run db:migrate` uma vez contra o banco novo, conferir saída e identidade do destino.
5. Remover a credencial de migration do runtime. Não executar migration em banco existente ou fora desta aprovação.
6. Configurar secret `DATABASE_URL` de runtime com role não administrativo e `BETTER_AUTH_SECRET` forte gerada diretamente no gerenciador de secrets Render.

O script `render.yaml` não executa migrations. Isso é intencionalmente separado do build e do start.

## Publicação manual após aprovação

1. Obter aprovação específica para criar projeto Neon, repositório Git privado, serviço Render e publicação.
2. Criar Neon Free e confirmar TLS, pooling, papéis e limites atuais no painel/documentação oficial.
3. Criar repositório privado e publicar apenas a allowlist registrada em `DEPLOY-03-initial-commit-review.md`; não enviar AGENTS/CLAUDE/GEMINI nem segredos.
4. Criar Blueprint/Web Service em Render sem ativar plano pago ou deploy automático.
5. Aplicar migrations manualmente conforme procedimento anterior.
6. Gerar segredos diretamente nos gerenciadores de secrets. Definir `BETTER_AUTH_URL` para a origem HTTPS correta.
7. Revisar CSP, cookies Secure, trusted origin, cadastro desabilitado e bootstrap OWNER. Bootstrap é uma ação pontual autorizada, não parte do build.
8. Acionar deploy manual e seguir checklist da [DEPLOY-01](../deployment/DEPLOY-01-render-neon-preparation.md); manter relatório de resultado.

## Pós-deploy e limites

Validar HTTPS, login, sessão/cookies, rotas protegidas, CSP enforced, Neon, CRUD fictício, CSV, logout, logs e suspensão/reinício. `/login` é liveness da interface; HTTP 200 não comprova dependência do banco ou prontidão da autenticação. O preflight local de 512 MiB não reproduz CPU, cold start, suspensão, rede/TLS ou limites operacionais Render/Neon. Registrar latência, falhas e custo real; pausar/remove serviço manualmente se deixar de ser necessário, sem aceitar upgrade automático.

Compatibilidade experimental local foi aprovada sob limite de 512 MiB em DEPLOY-02, não a hospedagem em nuvem. Não declarar G-11/G-15 aprovados nem CRM pronto para produção.
