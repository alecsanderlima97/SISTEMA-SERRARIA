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
- `js/views/configuracoes-view.js`: HTML da tela de configuracoes, perfil, backup, tema e painel de usuarios.
- `js/views/transportes-view.js`: HTML de fretistas e transportadoras.
- `js/views/produtos-view.js`: HTML de madeiras, medidas e precos.
- `js/views/estoque-view.js`: HTML do controle de estoque, subabas e modal de novo item.
- `js/views/frotas-view.js`: HTML do controle de frota e formulario de veiculos/maquinas.
- `js/views/pendente-view.js`: HTML da tela de usuario aguardando aprovacao.
- `js/views/dashboard-view.js`: HTML do painel inicial, KPIs, fluxo do patio e graficos.
- `js/views/clientes-view.js`: HTML de cadastro, dados comerciais e listagem de clientes.
- `js/views/historico-view.js`: HTML do historico de cargas e subprodutos.
- `js/views/financeiro-view.js`: HTML dos lancamentos financeiros, KPIs e relatorios.
- `js/views/rh-view.js`: HTML do cadastro de funcionarios, indicadores e quadro de RH.
- `js/modals/rh-modals.js`: modais globais de horas extras, faltas, holerite e relatorio HE.
- `js/modals/romaneio-modals.js`: modais globais de detalhes do romaneio e confirmacao de seguranca.
- `js/modals/patio-modals.js`: modal global de controle de patio, etiquetas e historico de contagens.
- `js/modals/estoque-modals.js`: modal global de movimentacao manual de estoque.
- `js/modals/usuario-modals.js`: modal global de cadastro, aprovacao e permissao de usuarios.
- `js/modals/frotas-modals.js`: modais globais de abastecimento e manutencao da frota.
- `js/widgets/assistant-widget.js`: botao flutuante e painel visual do assistente.
- `js/widgets/scroll-helper-widget.js`: botoes flutuantes de rolagem rapida.

## Views principais

- `view-pendente`: usuario aguardando aprovacao, extraida para `js/views/pendente-view.js`.
- `view-dashboard`: painel gerencial, extraida para `js/views/dashboard-view.js`.
- `view-clientes`: cadastro/listagem de clientes, extraida para `js/views/clientes-view.js`.
- `view-historico`: historico de cargas, extraida para `js/views/historico-view.js`.
- `view-transportes`: fretistas e transportadoras, extraida para `js/views/transportes-view.js`.
- `view-produtos`: madeiras, medidas e precos, extraida para `js/views/produtos-view.js`.
- `view-estoque`: resumo, inventario, tanques, movimentacoes e lancamentos, extraida para `js/views/estoque-view.js`.
- `view-frotas`: veiculos, abastecimentos, manutencoes e relatorios, extraida para `js/views/frotas-view.js` e `js/modals/frotas-modals.js`.
- `view-financeiro`: lancamentos financeiros e relatorios, extraida para `js/views/financeiro-view.js`.
- `view-rh`: funcionarios, horas extras, faltas e holerites, extraida para `js/views/rh-view.js`.
- `view-calculadoras`: calculadoras operacionais, extraida para `js/views/calculadoras-view.js`.
- `view-agenda`: agenda/calendario, extraida para `js/views/agenda-view.js`.
- `view-entrada`: entrada de toras e descarregamentos, extraida para `js/views/entrada-view.js`.
- `view-cavaco`: venda de cavaco/po/subprodutos, extraida para `js/views/cavaco-view.js`.
- `view-romaneio-v2`: geracao de romaneio atual, extraida para `js/views/romaneio-v2-view.js`.
- `view-configuracoes`: empresa, aparencia, dados e usuarios, extraida para `js/views/configuracoes-view.js`.

## Plano de extracao segura

1. Extrair scripts inline pequenos para `js/`.
2. Criar componentes HTML parciais somente depois de estabilizar os scripts.
3. Separar views uma por vez, com teste visual depois de cada extracao.
4. Manter IDs e handlers globais durante a transicao para evitar quebrar modulos existentes.
5. Migrar para Next.js apenas quando os modulos estiverem desacoplados o suficiente.
