# Guia de testes

## Comandos

```bash
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run test:e2e
```

`npm test` executa Vitest pela configuração `vitest.config.ts` e inclui `tests/unit`. Integração usa explicitamente `vitest.integration.config.ts`. Playwright usa `playwright.config.ts` e pode inicializar web server/fixtures próprios.

## Segurança do banco de testes

Não configure `DATABASE_URL` apontando a banco existente ao rodar integração. As suítes com PostgreSQL requerem `TEST_DATABASE_URL`; a validação aceita somente host loopback, porta 5433, base `crm_test_isolated`, usuário `crm_test_admin` e senha. O helper confirma identidade PostgreSQL após conectar e encerra pools em falhas. Configure `CRM_TEST_MODE=1` somente em cenários que exercitam a conexão de runtime sob ambiente de teste.

Testes condicionais de integridade só rodam quando `RUN_MEMBER_ASSIGNMENT_INTEGRITY_TESTS=1` ou `RUN_TASK_DEAL_CLIENT_INTEGRITY_TESTS=1`. Eles precisam de PostgreSQL descartável com migrations necessárias. Um skip não é aprovação.

## Escopos

- `tests/unit`: valida schemas, regras, tratamento de erro, CSV, CSP, políticas e helpers sem depender de serviço remoto.
- `tests/integration`: Better Auth, Drizzle/PostgreSQL, transactions, tenancy, invariantes e rate limiting.
- `tests/e2e`: interface real no browser, login, fluxos CRM, RBAC, acessibilidade e headers; requer browser Playwright instalado e ambiente sintético.
- `tests/helpers`: conexão isolada, login E2E e fixtures com dados aleatórios e limpeza controlada.

Nunca afrouxe verificações de destino, altere testes só para obter aprovação, use dados pessoais reais ou envie fixtures para scanners externos. Relate o comando e o resultado real da execução; resultados SEC/DEPLOY antigos são evidências históricas.
