# Gerenciamento de tema

O tema é controlado pelo `ThemeProvider` global, montado no layout raiz. A preferência canônica é o cookie `rota-theme`, com os valores `light` e `dark`, `Path=/`, `SameSite=Lax` e validade de um ano. Ele é um cookie de preferência, sem dados de autenticação, e permanece separado dos cookies do Better Auth.

O layout raiz lê o cookie com a API assíncrona `cookies()` do Next.js e define `data-theme` no elemento `<html>` durante o SSR. Assim, renderizações de páginas, Server Actions, atualizações, revalidações, redirects e reloads recebem o mesmo tema sem depender de estado local de uma rota. O provider atualiza o cookie e o atributo do documento quando o usuário escolhe outro tema; formulários e actions não precisam de tratamento especial.

O antigo `localStorage` (`rota-theme`) é lido somente no bootstrap inicial, quando ainda não existe cookie. Um script estático no `<head>` migra um valor válido para o cookie, remove a cópia legada e aplica `data-theme` antes do primeiro paint. O script recebe o nonce aleatório da requisição via `x-nonce`; não requer `unsafe-inline`, `unsafe-eval`, dependência de temas ou alteração da CSP. O `suppressHydrationWarning` no `<html>` cobre somente a diferença de atributo causada por essa migração anterior à hidratação. Valores inválidos são ignorados.

Para adicionar controles de tema, use `useTheme()` dentro do provider. Não crie estado paralelo, não defina o atributo diretamente e não persista a preferência em outro armazenamento. Botões de controle que não submetem formulários devem declarar `type="button"`.

## Verificação

`tests/e2e/theme-persistence.spec.ts` cobre SSR, troca de rota pública, reload, migração de preferência legada, console sem erros e presença do nonce na política CSP. Execute em desenvolvimento com `npx playwright test --config=playwright.theme.config.ts` e com CSP enforced do build usando `THEME_ENFORCED_CSP=1 npx playwright test --config=playwright.theme.production.config.ts`. A configuração de produção usa somente segredo sintético e URL de banco em porta fechada; os cenários públicos não acessam banco. A configuração principal de E2E continua exigindo `TEST_DATABASE_URL` isolada para os fluxos autenticados do CRM.

Validação em 2026-11-05: typecheck, ESLint e build otimizado aprovados; 107 testes unitários aprovados; E2E de tema 2/2 em desenvolvimento e 2/2 em produção com CSP enforced. Esses cenários não cobrem formulários autenticados; para essa regressão, execute a suíte do CRM somente com `TEST_DATABASE_URL` isolada e validada.

Arquivos principais: `src/app/layout.tsx`, `src/components/settings/theme-provider.tsx`, `src/components/settings/theme-control.tsx`, `tests/e2e/theme-persistence.spec.ts`, `playwright.theme.config.ts` e `playwright.theme.production.config.ts`. Para a correção sintática que destravava o typecheck, também foi ajustado o retorno do `map` no gráfico de `src/app/(app)/dashboard/page.tsx`.

## Investigação de hydration mismatch — 2026-11-05

O relato do navegador incluiu uma URL de script `chrome-extension://…`; esse é indício de conteúdo de extensão presente no DOM, mas não identifica o produto nem prova que ela causou o alerta. Chromium iniciado pelo Playwright em contexto temporário, sem extensão, passou 2/2 testes em desenvolvimento e 2/2 em produção. Dark e Light mantiveram `data-theme` no SSR/reload; a migração legada não gerou erros de console; nenhum script `chrome-extension://` apareceu; o nonce do script correspondeu à CSP da mesma resposta e foi diferente no reload. Não foi demonstrado defeito de hidratação do CRM, então nenhum código de aplicação foi alterado nesta investigação.

Limite: o perfil em que o erro foi observado não está disponível nesta execução. Portanto, a causa exclusiva por extensão continua não confirmada. Também não foi possível testar submissões autenticadas de clientes, login/logout ou Server Actions sem banco de teste isolado autorizado; os E2E executados cobrem a entrada pública, hidratação, migração, recarga e CSP.
