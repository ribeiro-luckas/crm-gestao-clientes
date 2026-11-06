# SEC-02B.0 — Validação do build e das dependências de inicialização

**Data:** 2026-11-03  
**Escopo:** build Next.js e sondas mínimas de inicialização/autenticação em cópia temporária.  
**Decisão de arquitetura:** nenhuma. A arquitetura SEC-02A continua condicional e não aprovada para produção.

## Resumo executivo

O build de produção do Next.js concluiu sem PostgreSQL disponível quando `BETTER_AUTH_SECRET` e `DATABASE_URL` sintéticas foram definidas. A rota Better Auth é importada durante a coleta de dados; seu carregamento exige as duas variáveis e configura o adapter/pool. Os cenários sem uma ou ambas falharam nessa fase, após a compilação do código.

Não foi observado acesso de rede ao endereço PostgreSQL sintético durante o build: a execução ocorreu em container rootless Podman com `--network=none`, sem banco, portas ou volumes; um detector de conexão TCP foi validado por controle positivo, mas não registrou tentativa durante o build D. Portanto, os resultados demonstram que um servidor PostgreSQL ativo não é requisito para compilar nesta versão e configuração. O caminho de código indica construção do pool ao importar a rota, mas a instrumentação dinâmica não observou diretamente o objeto `Pool` devido ao empacotamento do módulo.

Em runtime, o processo `next start` iniciou e serviu `/login` sem variáveis. A rota de sessão falhou sem o secret e também sem `DATABASE_URL`. Com ambas as variáveis, a consulta de sessão sem cookie respondeu 200; uma tentativa sintética de login alcançou a consulta de usuário e tentou conectar ao loopback configurado. A conexão foi recusada porque nenhum PostgreSQL foi iniciado. Assim, as operações de autenticação que consultam persistência dependem do PostgreSQL em runtime; esta etapa não validou autenticação completa nem schema real.

## Ambiente e isolamento

- Host: Bazzite 44.20261023, Linux x86_64; Node.js 24.22.2 e npm 11.19.1.
- Execução: imagem local `node:24-bookworm` em Podman rootless, com rede `none`, filesystem raiz somente leitura, capacidades removidas, limite de processos e sem publicação de portas.
- Cópia de trabalho: `/tmp/sec-02b-0-20261103`, com permissões restritas. Excluiu `.env*`, `.git`, artefatos e dados locais; o `.env.local` do original não foi lido nem copiado. Dependências instaladas foram copiadas para a área temporária, sem alterar o repositório.
- Ambiente de processo criado com `env -i`, HOME e arquivos de configuração npm vazios e separados. Foram fornecidos apenas valores sintéticos. O endereço de banco era loopback na porta 15433, sem listener.
- O build foi limitado a um worker efetivo por `CIRCLE_NODE_TOTAL=2`, para caber no limite de processos/threads do container. Nenhuma credencial ou valor sintético é registrado neste relatório.
- O container de teste usou `--rm`; não criou PostgreSQL, volume ou rede persistente. Containers preexistentes não foram usados.

### Verificação da cópia

Uma busca por nomes `.env*` na cópia retornou zero arquivos. Uma verificação dos artefatos `.next` não encontrou os valores sintéticos do secret nem da URL de banco. Isso é uma verificação pontual dos dois marcadores nesta saída de build, não uma garantia geral contra inclusão acidental de outros valores em builds futuros.

## Inspeção estática relevante

As observações abaixo vêm da inspeção do código/configuração; os resultados de execução são apresentados separadamente.

- `package.json`: build `next build`, inicialização `next start`; Next.js 16.4.3, Better Auth declarado como `^1.7.14`, Drizzle ORM `^0.45.4` e `pg` `^8.16.3`.
- `src/app/api/auth/[...all]/route.ts` cria `handlers` no escopo do módulo usando `toNextJsHandler(getAuth())`.
- `src/lib/auth.ts`: `getAuth()` inicializa Better Auth. A criação valida `BETTER_AUTH_SECRET` como não vazio e com pelo menos 32 caracteres, configura o adapter Drizzle usando `getDb()` e usa localhost como default para `BETTER_AUTH_URL`.
- `src/db/index.ts`: `getDb()` chama `drizzle(getPool())`; `getPool()` exige `DATABASE_URL` fora do modo de teste e instancia `new Pool(...)` com limite máximo 10 e timeout de conexão de 5 segundos.
- A cadeia de importação da rota, portanto, valida configuração e constrói a configuração do adapter/pool durante sua avaliação. A criação de `pg.Pool` por si só não prova conexão TCP; conexão normalmente é demandada por consulta.
- `drizzle.config.ts`, scripts de bootstrap e debug/migrate carregam `@next/env`, mas não foram executados nesta etapa. Migrations não foram executadas nem iniciadas automaticamente pelo procedimento.
- A inspeção não identificou configuração runtime obrigatória de e-mail ou armazenamento externo nos caminhos avaliados. Como a rede estava desabilitada, nenhum serviço externo poderia ser contatado.

## Procedimento e cenários de build

Cada cenário foi executado em processo isolado, usando a mesma cópia, dependências e configuração de recursos. Os cenários não herdaram variáveis do shell. O exit code se refere a `next build`.

| Cenário | Variáveis fornecidas | Resultado observado | Evidência de rede/SQL |
|---|---|---|---|
| A | Nenhuma | Exit 1. Compilação terminou; falhou em `Collecting page data`, com erro de `BETTER_AUTH_SECRET` ausente/curto. | Nenhuma tentativa TCP detectada; sem consulta SQL. |
| B | Apenas `BETTER_AUTH_SECRET` sintético | Exit 1. Compilação terminou; falhou em `Collecting page data`, com `DATABASE_URL` não configurada. | Nenhuma tentativa TCP detectada; sem consulta SQL. |
| C | Apenas `DATABASE_URL` sintética apontando para `127.0.0.1:15433` | Exit 1. Compilação terminou; falhou em `Collecting page data`, com `BETTER_AUTH_SECRET` ausente/curto. | Nenhuma tentativa TCP detectada; sem consulta SQL. |
| D | `BETTER_AUTH_SECRET` e `DATABASE_URL` sintéticas | Exit 0. Compilou, coletou dados das páginas e gerou seis páginas estáticas. | Nenhuma tentativa TCP detectada; nenhuma consulta SQL observada; PostgreSQL inexistente e rede desabilitada. |

O detector foi exercitado separadamente com uma tentativa de conexão ao mesmo loopback fechado e produziu o marcador esperado, seguido de `ECONNREFUSED`. Isso confirma que a instrumentação consegue observar ao menos uma conexão TCP explícita ao destino controlado. Um hook adicional para `pg.Pool`/query não emitiu marcador no build; como o pacote foi empacotado pelo build, esse resultado não é usado isoladamente para afirmar que o construtor não foi chamado. A inspeção estática e as falhas condicionadas às variáveis sustentam a conclusão de avaliação da configuração da rota, enquanto o detector e o isolamento sustentam a ausência de tentativa de rede durante o cenário D.

### Iterações do harness

As primeiras tentativas do harness não são falhas do CRM: uma configuração npm vazia compartilhada inicialmente como user/global causou erro de leitura duplicada de `/dev/null`; o harness foi corrigido para usar caminhos vazios separados. Depois, o build atingiu o limite de threads/processos do container ao tentar iniciar workers; foi repetido com o limite local de workers indicado acima. A execução válida A–D terminou conforme a tabela.

## Inicialização e sondas HTTP

O servidor foi iniciado a partir do build D. Cada caso usou processo/porta próprios. A sonda registrou somente método, caminho, porta e status; corpos, senhas, tokens e cookies não foram exibidos.

| Configuração do processo | Sonda | Resultado | Interpretação |
|---|---|---|---|
| Sem variáveis | `GET /login` | 200 | A página pública iniciou sem configurar o Better Auth. |
| Sem variáveis | `GET /api/auth/get-session` | 500 | A rota auth foi carregada na requisição e falhou ao validar `BETTER_AUTH_SECRET`. |
| Apenas secret sintético | `GET /login` | 200 | A página pública continua disponível. |
| Apenas secret sintético | `GET /api/auth/get-session` | 500 | A rota falhou por `DATABASE_URL` ausente. |
| Secret e URL sintéticos | `GET /login` | 200 | Inicialização e rota pública funcionaram. |
| Secret e URL sintéticos | `GET /api/auth/get-session` sem cookie | 200 | A consulta sem sessão autenticada respondeu sem erro, sem exigir leitura de usuário. |
| Secret e URL sintéticos | `POST /api/auth/sign-in/email` com dados sintéticos | 500 | Detector registrou tentativa TCP para `127.0.0.1:15433`; a conexão foi recusada. O log do servidor identifica consulta parametrizada à tabela `user`, seguida por `ECONNREFUSED`. |

Nenhum PostgreSQL estava presente no namespace de rede. A tentativa de login não completou handshake PostgreSQL nem executou SQL no servidor; a mensagem `Failed query` é a consulta preparada pelo driver/ORM antes de receber o erro de conexão. Nenhuma migration ou escrita em banco ocorreu.

## Contrato comprovado

### Build

- Para o build observado, as duas variáveis precisam existir e satisfazer validação/importação da rota Better Auth. O secret precisa respeitar a validação de comprimento. A URL precisa ser sintaticamente utilizável pelo adapter.
- Um PostgreSQL ativo não foi necessário para concluir `next build` no cenário D. O processo não tentou conectar ao loopback de teste durante esse build.
- `BETTER_AUTH_URL` não foi tratada como obrigatória na inspeção: o código usa localhost como default. Este experimento não testou comportamento de callback/origin com URL pública.
- O relatório não afirma que todos os possíveis caminhos de build em configurações diferentes terão o mesmo comportamento; mudanças de Next.js, rotas ou importações podem alterar o contrato.

### Runtime

- O processo Next.js pode iniciar e servir a página `/login` sem secret ou banco.
- Uma requisição à rota Better Auth exige `BETTER_AUTH_SECRET` e `DATABASE_URL` já no carregamento da rota.
- A consulta de sessão sem cookie respondeu 200 com ambas as variáveis, mas não comprova conectividade nem disponibilidade do schema.
- Uma operação de login que procura usuário demanda conexão PostgreSQL em runtime. O teste demonstrou a tentativa de conexão ao destino sintético e a falha esperada, não um login completo.
- Esta execução não demonstrou fluxos autenticados, criação/invalidação de sessão, schema válido, permissões PostgreSQL, migrations, nem auditoria transacional; esses itens pertencem a validação integrada separada.

## Implicações para implantação

1. O build pode ocorrer sem PostgreSQL operacional, desde que a etapa receba configuração sintética válida para `BETTER_AUTH_SECRET` e `DATABASE_URL`. Não foi demonstrado que seja possível omitir essas variáveis sem alterar o código.
2. O runtime precisa receber valores próprios do ambiente para essas variáveis antes de atender caminhos Better Auth; o banco precisa estar acessível para operações que leem/gravam autenticação.
3. Não há evidência de que o build execute migrations. Migrations e bootstrap devem continuar como etapa explícita e separada, com identidade e destino controlados; esta execução não aprovou um procedimento de deploy.
4. O comportamento é compatível, em princípio, com hospedagem que constrói e executa Node.js em fases distintas, sem banco durante build. Isso é uma conclusão sobre o contrato observado, não uma avaliação de qualquer provedor específico.
5. Não foi encontrado motivo concreto nesta prova para refatorar a inicialização. Se a plataforma escolhida não puder fornecer configuração não produtiva ao build, o próximo passo é demonstrar essa restrição e avaliar a menor mudança de inicialização tardia, com aprovação própria.
6. A arquitetura SEC-02A continua recomendação condicional: esta prova não aprova provedor, TLS, HSTS, cookies, operação PostgreSQL, backups ou prontidão para publicação.

## Limitações e riscos residuais

- Não houve PostgreSQL descartável nesta etapa; a rede foi deliberadamente desabilitada. Assim, não foi validada conexão bem-sucedida, autenticação integrada, schema, permissões, pool sob carga ou operação transacional.
- O hook dinâmico não comprovou diretamente a construção do objeto `pg.Pool` porque o build empacota dependências. A inspeção do caminho de importação fornece evidência estática complementar; o hook TCP positivo e a ausência de marcador no build D sustentam somente a conclusão sobre conexão de rede.
- A execução usou Node.js 24 em imagem local `node:24-bookworm`; a versão exata de patch do Node dentro da imagem não foi registrada. A versão do host foi 24.22.2.
- Execução de build limitou workers por recursos do sandbox. Não houve alteração de configuração global ou do projeto.
- Não foram avaliados certificados, proxy, HTTPS/HSTS, cookies Secure, produção, logs externos, retenção, ACL, provedores ou serviços externos.

## Arquivos e recursos

- Alterado no projeto: somente este relatório.
- Código, dependências, lockfile, configuração, bancos e migrations: sem alterações.
- A cópia, instrumentação e logs temporários foram criados em `/tmp/sec-02b-0-20261103` e removidos ao encerrar esta execução.
- O container de execução foi efêmero (`--rm`); nenhum volume ou container PostgreSQL foi criado. Serviços preexistentes foram preservados e não acessados.

## Próxima etapa recomendada

Após a escolha/aprovação do alvo de hospedagem e do domínio, executar a validação de homologação SEC-02B em ambiente temporário com PostgreSQL novo e descartável. Separar explicitamente variáveis de build e runtime, aplicar migrations apenas ao banco descartável depois de validar identidade/destino, e demonstrar login/sessão com HTTPS, headers e cookies no proxy escolhido. A etapa deve capturar logs sanitizados e confirmar permissões/rollback de auditoria, sem inferir que os resultados locais aprovam a infraestrutura real de produção.
