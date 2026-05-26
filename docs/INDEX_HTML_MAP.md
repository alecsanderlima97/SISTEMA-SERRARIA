# Mapa do `index.html`

O `index.html` ainda concentra a casca visual e as principais views do sistema. Este mapa orienta a refatoracao gradual sem alterar comportamento.

## Estrutura principal

- `head`: fontes, FontAwesome, CSS principal, CSS do romaneio e Chart.js.
- script inicial: diagnostico de erro, autocorrecao estrutural e fallback de navegacao.
- sidebar: menu lateral e links para `view-*`.
- header global: busca/assistente, usuario, perfil e configuracoes.
- `main.main-content`: views principais do sistema.
- modais globais: RH, historico, patio, estoque, usuarios e movimentacoes.
- scripts finais: imports dos modulos JS e helpers globais pequenos.

## Extracoes ja realizadas

- `js/bootstrap.js`: diagnostico de erro, autocorrecao estrutural e fallback de navegacao.
- `js/ui-helpers.js`: helpers globais de patio e rolagem rapida.
- `js/views/calculadoras-view.js`: HTML da tela de calculadoras, injetado antes dos modulos da aplicacao.
- `js/views/agenda-view.js`: HTML da agenda/calendario, injetado antes dos modulos da aplicacao.
- `js/views/entrada-view.js`: HTML da entrada de toras, abas internas e descarregamento.
- `js/views/cavaco-view.js`: HTML da venda de cavaco/po e cadastro de clientes de subprodutos.
- `js/views/romaneio-v2-view.js`: HTML do gerador de romaneio atual.

## Views principais

- `view-pendente`: usuario aguardando aprovacao.
- `view-dashboard`: painel gerencial.
- `view-clientes`: cadastro/listagem de clientes.
- `view-historico`: historico de cargas.
- `view-transportes`: fretistas e transportadoras.
- `view-produtos`: madeiras, medidas e precos.
- `view-estoque`: resumo, inventario, tanques, movimentacoes e lancamentos.
- `view-frotas`: veiculos, abastecimentos, manutencoes e relatorios.
- `view-financeiro`: lancamentos financeiros e relatorios.
- `view-rh`: funcionarios, horas extras, faltas e holerites.
- `view-calculadoras`: calculadoras operacionais, extraida para `js/views/calculadoras-view.js`.
- `view-agenda`: agenda/calendario, extraida para `js/views/agenda-view.js`.
- `view-entrada`: entrada de toras e descarregamentos, extraida para `js/views/entrada-view.js`.
- `view-cavaco`: venda de cavaco/po/subprodutos, extraida para `js/views/cavaco-view.js`.
- `view-romaneio-v2`: geracao de romaneio atual, extraida para `js/views/romaneio-v2-view.js`.
- `view-configuracoes`: empresa, aparencia, dados e usuarios.

## Plano de extracao segura

1. Extrair scripts inline pequenos para `js/`.
2. Criar componentes HTML parciais somente depois de estabilizar os scripts.
3. Separar views uma por vez, com teste visual depois de cada extracao.
4. Manter IDs e handlers globais durante a transicao para evitar quebrar modulos existentes.
5. Migrar para Next.js apenas quando os modulos estiverem desacoplados o suficiente.
