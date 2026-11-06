# SEC-02B.4 — Diagnóstico do Chromium e recuperação da regressão E2E

**Data:** 2026-11-03  
**Escopo:** ambiente Chromium/Playwright, Fontconfig, sandbox, build de produção e regressão E2E em cópia isolada com dados sintéticos.  
**Conclusão:** o Chromium do host funciona fora do sandbox restrito do executor. A falha `sandbox_host_linux ... Operation not permitted` foi reproduzida no executor e separada do fatal Skia. O fatal Skia apareceu em probes iniciais de screenshot da aplicação, mas não voltou nas execuções subsequentes. A regressão integral terminou com **47/47 aprovações** após um limite de 75 s, justificado e aplicado somente à matriz visual de 60 combinações.

## 1. Resumo executivo

O ambiente tem fontes Fontconfig disponíveis, arquivos legíveis e nenhuma biblioteca dinâmica obrigatória ausente no Chromium. Cinco processos novos do headless shell renderizaram HTML local com texto e fontes, navegaram entre páginas locais, fizeram screenshot e encerraram normalmente. Fontes do sistema e as três famílias WOFF2 empacotadas pelo CRM também passaram em probes HTML isolados.

Há duas falhas distintas que não devem ser confundidas:

1. Dentro do sandbox padrão do executor, Chromium termina antes de carregar uma página com `FATAL:content/browser/sandbox_host_linux.cc:41 ... Operation not permitted`; o processo está sob seccomp, `NoNewPrivs=1` e sem capabilities. O mesmo smoke passa fora desse confinamento.
2. Em seis probes iniciais com screenshot da página da aplicação foi observado `FATAL:...SkFontMgr_FontConfigInterface.cpp:163 Not implemented`. Não houve reprodução desse Skia fatal nos nove probes de captura seguintes, no smoke de produção após reiniciar o servidor, no E2E focado ou nas duas execuções integrais. A causa específica do evento Skia não ficou confirmada; as evidências delimitam um evento intermitente no caminho de renderização/screenshot da aplicação, não uma falha geral de inicialização ou ausência de fontes.

A primeira suíte integral passou 46/47: o único caso excedeu os 30 s globais enquanto percorria uma matriz de 15 rotas por quatro larguras. Isolado com instrumentação diagnóstica, o teste passou em 47,6 s. Foi aplicado limite específico de 75 s apenas nesse teste; a suíte integral seguinte passou 47/47 em 2,5 min, sem retries, skips, timeouts, 429 ou fatal do Chromium.

## 2. Ambiente identificado

- Sistema: Bazzite 44.20261023.0, variante `bazzite-gnome-nvidia-open`, Fedora 44/Silverblue; kernel `7.2.9-ogc3.1.fc44.x86_64`, arquitetura `x86_64`.
- Runtime local: Node.js 24.22.2 e npm 11.19.1.
- Podman 5.8.9 rootless, crun 1.28, cgroup v2, SELinux e seccomp habilitados. O experimento não usou containers privilegiados nem removeu capacidades.
- Distrobox `laboratorio-node`: parado, imagem `node:24-bookworm`. Não foi iniciado; não é recurso descartável desta tarefa.
- Memória amostrada no host: 16,2 GB total e 8,77 GB disponíveis. `/dev/shm`: 7,8 GB disponíveis.
- O teste PostgreSQL usou apenas um container novo, com limite de 1 GB/2 CPUs, rede interna, dados em tmpfs, sem mounts persistentes e porta `127.0.0.1:5433`.
- O sandbox do executor mostrou `Seccomp: 2`, `NoNewPrivs: 1`, `CapEff=0` e `CapBnd=0`. Os limites cgroup daquele processo não estavam expostos no namespace do sandbox.

## 3. Versões e caminhos do navegador

- Projeto: Playwright e `@playwright/test` 1.64.1, conforme `package-lock.json`; instalação de execução apenas na cópia temporária.
- Chromium gerenciado: revision `chromium-1248`, binário headless shell em `~/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell`.
- Versão reportada pelos binários Playwright: Chrome for Testing 156.0.8078.4. O binário completo correspondente está em `~/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`.
- Argumentos relevantes gerados pelo Playwright 1.64.1: `--headless`, `--no-sandbox`, `--disable-dev-shm-usage`, `--enable-unsafe-swiftshader` e `--force-color-profile=srgb`. Não foram adicionados argumentos para relaxar CSP ou o sandbox.
- `ldd` não encontrou bibliotecas “not found”. O `fc-list` enumerou 219 famílias de fontes; `fc-match` resolveu `sans`, `serif` e `monospace` para Noto Sans, Noto Serif e Noto Sans Mono.

## 4. Reprodução independente do CRM

O script mínimo usou Playwright 1.64.1 e o binário padrão, sem Next.js, banco, Better Auth ou código do CRM. Cada processo abriu `about:blank`, carregou um HTML local, renderizou texto com sans-serif, serif, monospace e Noto Sans, esperou `document.fonts.ready`, salvou screenshot, navegou para outro HTML local e fechou o browser.

| Execução | Resultado |
|---|---|
| Mesma execução sob o sandbox restrito | Falhou antes da página com `sandbox_host_linux ... Operation not permitted`; não chegou ao renderizador de fontes. |
| Cinco processos headless shell fora do sandbox | 5/5 passaram; screenshots de 3.108 bytes cada; sem fatal, timeout ou falha de navegação. |
| Chrome completo (`channel: chromium`) com HTML local | Passou uma execução, com screenshot e navegação local. |
| HTML local usando cada fonte bundled | Sistema, IBM Plex Sans Variable, Space Grotesk Variable e IBM Plex Mono: 4/4 passaram, screenshot gerado, `document.fonts.check()` verdadeiro e nenhum pedido de fonte falhou. |

O log de browser foi habilitado com `DEBUG=pw:browser`. Não se usou `bypassCSP`.

## 5. Skia e Fontconfig

- Fontconfig efetivo veio de `/etc/fonts/fonts.conf`; inclui `/usr/share/fonts`, `/usr/local/share/fonts`, `~/.fonts`, cache do sistema e `~/.fontconfig`.
- `fc-match sans/serif/monospace` resolveu para Noto Sans, Noto Serif e Noto Sans Mono. O arquivo Noto Sans amostrado era `0644` e legível; o cache `~/.cache/fontconfig` era `0755`, com arquivos `0644`.
- Não havia configuração pessoal `~/.config/fontconfig` nem variáveis `FONTCONFIG_*`, `FONT_*`, `XDG_CACHE_HOME` ou `XDG_CONFIG_HOME` configuradas na execução observada.
- O host não depende de IBM Plex/Space Grotesk instaladas no sistema: o build fornece as fontes WOFF2 em `/_next/static/media`. O probe carregou uma WOFF2 de cada família e o Chromium confirmou fonte carregada.
- As fontes, caches e arquivos do sistema não foram alterados. Não foi necessário instalar pacote ou criar cache Fontconfig privado.
- Nos seis probes iniciais que terminaram com o Skia fatal, o erro apareceu durante o caminho de screenshot após abrir a página `/login`; o bloqueio individual de CSS, requisições de fontes ou scripts não produziu uma causa estável. Na sequência, nove variantes de captura do mesmo login passaram sem fatal; o smoke de produção também passou após reinicializar o servidor. Portanto, não há evidência suficiente para atribuir o evento inicial à ausência de uma fonte ou a um arquivo WOFF2 específico.

## 6. Sandbox, containers e recursos

O fatal de `sandbox_host_linux` foi reproduzido no executor do Codex e é compatível com as restrições vistas no processo (`seccomp`, `NoNewPrivs`, capabilities zeradas). Com execução autorizada fora desse confinamento, o mesmo Chromium conseguiu abrir e renderizar páginas locais e a aplicação.

Podman permanece rootless, com seccomp e SELinux habilitados. Nenhum container preexistente foi iniciado ou alterado. Não se mudou a política de sandbox do host, não se concederam capabilities e não se aplicou `--privileged`. O Chromium usou a opção padrão `--disable-dev-shm-usage`; o `/dev/shm` do host tinha 7,8 GB livres, sem indicação de falta de memória.

## 7. Causa confirmada e hipóteses remanescentes

- **Confirmada:** executar Chromium dentro do sandbox restrito deste executor bloqueia a inicialização com `Operation not permitted`. A intervenção mínima para esta validação foi executar os comandos E2E em contexto autorizado fora desse sandbox.
- **Não confirmada:** causa raiz do `SkFontMgr_FontConfigInterface.cpp:163 Not implemented` visto nos primeiros screenshots da aplicação. O evento cessou nas execuções subsequentes, inclusive após reinício do servidor, e não foi reproduzido na suíte. Fonte ausente, biblioteca faltante e falha geral do headless shell não são sustentadas pelas verificações realizadas.
- Não se declara que o Skia fatal foi corrigido por uma mudança do CRM; não houve alteração de código de renderização nem de configuração global.

## 8. Correção aplicada

Na spec `tests/e2e/ux-visual-audit.spec.ts`, o teste **“captura rotas comerciais autenticadas na matriz de quatro larguras”** agora define timeout de 75 s somente para esse caso. A execução instrumentada percorreu 15 rotas × quatro larguras (60 combinações) e levou 47,6 s isoladamente. O limite anterior de 30 s terminava o teste antes de completar o trabalho previsto.

O limite foi medido e limitado ao teste caro; timeouts globais, retries, assertions, rate limit, CSP e código de negócio permaneceram inalterados.

## 9. Comparação de ambientes

- Headless shell e Chrome completo usaram a mesma revisão Playwright/Chromium. Ambos passaram o HTML local; cada um teve uma ocorrência inicial do fatal Skia ao testar o primeiro screenshot da aplicação.
- A execução padrão dentro do sandbox falhou por `EPERM` antes da navegação. Fora do sandbox, os smoke tests e a suíte completa passaram.
- `laboratorio-node` não foi iniciado, por ser um container preexistente e não descartável. As únicas imagens locais eram `node:24-bookworm` e `postgres:18`; não havia imagem oficial de Playwright disponível. Containers B/C não foram criados ou baixados, pois os testes passaram no host quando executados fora do sandbox e nenhum diagnóstico adicional justificava a instalação de imagem.
- Não foram baixadas imagens nem atualizadas dependências indiscriminadamente.

## 10. Resultados dos testes mínimos

- HTML local simples: cinco processos novos aprovados; renderização, navegação, screenshot e encerramento corretos.
- HTML com fontes do sistema e com as três famílias WOFF2 do CRM: quatro probes aprovados, sem falha de carregamento.
- Nove variantes adicionais de screenshot/navegação na página de login terminaram sem Skia fatal. Um smoke de produção após reiniciar o servidor também passou.
- Smoke do build de produção: `/login` 200, fonte carregada, screenshot gerado; `GET /api/auth/get-session` anônimo 200; `/clients` terminou redirecionado para `/login` com resposta 200.
- CSP observada no smoke: `Content-Security-Policy-Report-Only` presente, header `Content-Security-Policy` enforced ausente e zero eventos CSP no console. Isso não valida enforcement.

## 11. Revisão do helper E2E de autenticação

`tests/helpers/e2e-auth.ts` não precisou de alteração. A inspeção e quatro verificações com respostas sintéticas confirmaram:

- Status diferente de 429 retorna imediatamente, sem retry.
- 429 sem `X-Retry-After` válido retorna imediatamente.
- 429 com `X-Retry-After: 1` espera aproximadamente 1,1 s e tenta novamente.
- São permitidos no máximo três retries (quatro chamadas totais); 401 não é repetido.

O helper respeita o header retornado pelo servidor e não falsifica origem/IP. O teste negativo de rate limit continua separado e inalterado.

## 12. Build de produção

Uma cópia limpa foi feita em `/tmp`, sem arquivos `.env*`. Os 455 pacotes definidos pelo lockfile foram instalados somente nessa cópia; o cache npm utilizado também ficou em `/tmp`. Como parte dos tarballs não estava disponível offline, foi autorizada instalação dos pacotes fixados no lockfile para o ambiente temporário. Não houve mudança em `package.json` ou `package-lock.json` do projeto.

`npm run build` passou com Next.js 16.4.3/Turbopack: compilação, typecheck interno, coleta de dados e geração de páginas concluídos. Build e server receberam somente variáveis sintéticas; nenhum `.env.local` foi copiado ou lido.

## 13. Resultado E2E

`playwright test --list` encontrou 47 testes em 9 arquivos, em um projeto Chromium. A configuração efetiva manteve `workers: 1`, `retries: 0` e `fullyParallel: true`.

| Execução | Resultado | Observação |
|---|---|---|
| Login/logout isolado | 1/1 passou em 11,1 s. | Fluxo de autenticação, logout e rota privada. |
| Suíte integral inicial | 46 passaram, 1 falhou em 2,4 min. | O único caso atingiu o timeout global de 30 s; nenhum fatal Skia ou 429. |
| Matriz visual isolada, diagnóstico | 1/1 passou em 47,6 s. | 60 combinações route/viewport; sem relaxar assertions. |
| Suíte integral após timeout específico | **47/47 passaram em 2,5 min.** | Zero retries, skips, timeouts, 429 e fatal Skia. |
| Integração direcionada de rate limit | 1/1 passou. | Preserva a sequência negativa esperada `401, 401, 401, 429`. |
| Verificação comportamental do helper | 4/4 passaram. | Cobriu não-retry, header ausente, janela e limite máximo. |

A diferença histórica entre 47 e 48 não veio de seleção dinâmica: a execução de 48 na SEC-02B.3 incluiu uma spec temporária de canário de logging, presente apenas na cópia temporária. O repositório contém 47 testes E2E em 9 arquivos.

O E2E estável foi executado com `NODE_ENV=test`, no qual a configuração padrão Better Auth desativa o limitador; portanto, zero respostas 429 nessa suíte não constituem teste de produção do limitador. O caso negativo foi verificado separadamente na integração. Nenhum limite de segurança foi aumentado ou desabilitado para obter aprovação.

## 14. Falhas da aplicação

Na execução integral final, nenhuma assertion funcional, de tenant, autenticação, layout ou segurança falhou. A única falha anterior era o timeout de 30 s no teste de matriz; com o limite específico baseado na medição, o mesmo caso e a suíte integral passaram.

## 15. Falhas da infraestrutura

- Confirmada no sandbox: `sandbox_host_linux` encerra Chromium com `EPERM` antes de carregar a página. Isso explica falhas ao executar browsers pelo executor restrito; não é uma resposta do CRM.
- Skia: seis probes iniciais de screenshot da aplicação registraram o fatal; as execuções seguintes não o reproduziram. O motivo permanece inconclusivo e deve ser observado se reaparecer.
- Não houve falha de bibliotecas compartilhadas, falta de fontes Fontconfig, falta de memória, erro de migração ou erro de PostgreSQL nas execuções aprovadas.

## 16. Arquivos modificados

- `tests/e2e/ux-visual-audit.spec.ts`: timeout de 75 s somente para a matriz de 60 combinações, com comentário da medição.
- Novo `docs/security/SEC-02B-04-chromium-stability.md`.
- `docs/knowledge/testing.md` e novo incidente `docs/knowledge/incidents/pw-005.md` com os aprendizados reutilizáveis, linkados pelo índice local.

Nenhum arquivo de produção, política CSP, logger, configuração Better Auth, dependência ou lockfile foi alterado. O projeto não tem commits e aparece como não rastreado no Git; esta lista identifica as mudanças desta etapa.

## 17. Riscos residuais

- A causa exata do fatal Skia inicial permanece desconhecida, embora não tenha reaparecido nos controles repetidos nem na suíte integral final.
- O executor padrão continua inadequado para Chromium devido ao seccomp; browser tests precisam ocorrer em ambiente com suporte a Chromium ou em contexto explicitamente autorizado fora desse confinamento.
- O timeout específico de 75 s cobre a execução medida de 47,6 s; monitorar sua duração em runner diferente antes de considerar o limite universal.
- CSP permanece Report-Only. G-11 e G-15 continuam sujeitos aos critérios e dependências já documentados; esta etapa não aprova os gates nem declara prontidão de produção.

## 18. Recursos temporários removidos

A cópia do projeto, `node_modules`, cache npm, HTML de diagnóstico, screenshots, logs e resultados de teste foram removidos de `/tmp`. O container `sec02b4-pg-20261103` (ID `1f38e57f…`) usava somente tmpfs, foi parado e removido; a rede interna `sec02b4-net-20261103` também foi removida. A listagem final manteve apenas os containers/rede preexistentes `laboratorio-node`, `crm-postgres`, `crm-postgres-test` e `podman`; eles não foram alterados. As portas 5433, 3100 e 3101 ficaram sem listeners.

## 19. Próxima execução recomendada

Manter Chromium 156.0.8078.4/Playwright 1.64.1 e executar a regressão num runner autorizado que não imponha o bloqueio seccomp observado. Manter um worker enquanto se valida estabilidade; só então testar concorrência controlada. Se `SkFontMgr_FontConfigInterface` retornar, salvar `DEBUG=pw:browser` e repetir primeiro o HTML/font probe, depois o screenshot de `/login`, sem instalar fontes nem alterar Bazzite. Preservar CSP Report-Only até a validação de enforcement separada e continuar condicionando G-11/G-15 às evidências originais.
