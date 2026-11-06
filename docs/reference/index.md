# Referência de código

Os catálogos foram extraídos por análise AST com TypeScript Compiler API, incluindo declaração, forma, contexto lexical, assinatura/tipo do checker, imports, exports, parâmetros e propriedades. Não executam código para inferir efeitos. Literais de inicialização não são copiados para os documentos.

- [Arquivos de aplicação, scripts e configuração](files/application.md)
- [Arquivos de testes](files/tests.md)
- [Arquivos operacionais e não TypeScript](files/non-typescript.md)
- [Funções de aplicação, scripts e configuração](functions/application.md)
- [Funções de testes e helpers](functions/tests.md)
- [Variáveis de aplicação, scripts e configuração](variables/application.md)
- [Variáveis de testes e helpers](variables/tests.md)
- [Variáveis de ambiente](environment-variables.md)

## Cobertura estática

Analisados 134 arquivos TypeScript/TSX/MJS/config: 1.626 declarações de função (incluindo callbacks), 3.094 declarações/bindings variáveis, 1.231 parâmetros e 759 propriedades. A divisão entre aplicação e teste aparece nos cabeçalhos dos catálogos. Tipos inferidos pelo checker foram incluídos; assinaturas estruturais muito longas são truncadas visualmente, mantendo caminho/linha e tipo de retorno. Imports e exports foram extraídos do AST.

CSS, SQL, JSON, YAML, shell, Markdown e arquivos de assets não possuem funções TypeScript e não entram na contagem AST. Configurações e migrations são descritas em arquitetura, guias e inventário por arquivo. Variáveis de CSS e propriedades de objetos de configuração não são declaradas como símbolos locais e não estão no catálogo de variáveis TypeScript. Relações de uso para cada variável individual não são calculadas pelo inventário; os módulos e integrações importantes estão descritos na arquitetura/fluxos. Uma revisão humana deve conferir semântica antes de mudanças funcionais.
