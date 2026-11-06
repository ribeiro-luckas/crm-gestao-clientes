# Direção de design

## Conceito

CRM produtivo, preciso e acolhedor, orientado à decisão e à próxima ação. Nome de trabalho **Rota**, incluído no planejamento aprovado, com metáfora discreta de percurso comercial. Evitar dashboard genérico carregado de cores e gráficos sem ação.

## Identidade proposta

- Base neutra quente no claro e grafite esverdeado no escuro; azul índigo para ação/foco; verde ganho/sucesso; âmbar atenção; coral/vermelho perda/erro. Cor nunca é o único sinal de estado.
- IBM Plex Sans para interface, Space Grotesk em títulos curtos e IBM Plex Mono para metadados numéricos; confirmar licença e empacotamento antes da implementação.
- Espaçamento base 4/8 px e densidade de tabela para uso diário.
- shadcn/ui como base de componentes acessíveis, com tokens próprios em campos, tabelas, badges, menus, dialogs, tabs, toasts, busca, cards e Kanban.
- Temas claro/escuro com semântica equivalente, contraste verificado, preferência de sistema e escolha persistida.

## Laboratório visual

Foram consultados README/AGENTS, tokens/CSS e estudos de tipografia, componentes, movimento e navegação, bem como relatório/checklist de qualidade. Padrões úteis: tokens semânticos, paleta e tema, escala tipográfica, foco visível e skip link, breadcrumbs, abas com teclado, reduced-motion e menu responsivo. A direção aprovada do laboratório é atlas editorial experimental; o CRM adota princípios de tokenização/legibilidade, sem reproduzir composição editorial nem depender do laboratório em runtime.

Tokens vistos: canvas `#F5F1E8`/`#151915`, surface `#FFFCF6`/`#202620`, ink `#20231F`/`#F5F1E8`, azul `#3157D5`/`#9CB3FF`, lima `#D4F075`, coral `#F47761`/`#FF9C88`; fontes IBM Plex Sans Variable, Space Grotesk Variable e IBM Plex Mono. A direção foi aprovada junto ao planejamento. Os tokens foram traduzidos para o CSS inicial, mas contraste e combinações semânticas precisam ser revalidados no CRM.

O relatório do laboratório aponta axe automatizado aprovado, mas uma comparação visual mobile ainda divergente e verificações manuais de teclado, zoom real e leitor de tela pendentes. Portanto, esses padrões são referências documentadas; devem ser revalidados no CRM e não presumidos como aprovação de acessibilidade herdada.

## Movimento

Motion só para transições breves de painel/dialog e feedback de estado. Drag não será necessário para concluir ações. Respeitar `prefers-reduced-motion`; estado sempre tem rótulo textual.
