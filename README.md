# Sistema Serraria

Sistema de gestao operacional para serrarias, com foco em controle de romaneios, estoque, frota, financeiro, RH, patio e relatorios.

## Modulos principais

- Dashboard gerencial
- Clientes, produtos e transportes
- Romaneios de madeira
- Entrada de toras
- Venda de subprodutos
- Estoque e movimentacoes
- Frota, abastecimentos e manutencoes
- Financeiro operacional
- RH, horas extras, faltas e holerites
- Controle de patio e etiquetas
- Usuarios e permissoes
- Assistente interno de analise

## Stack atual

- HTML, CSS e JavaScript modular
- Firebase Auth
- Firestore
- Deploy web estatico

## Pontos de atencao

- O sistema ainda nao esta estruturado como SaaS multiempresa.
- Algumas regras do Firestore precisam ficar mais restritivas por perfil e empresa.
- Parte dos dados ainda pode depender de `localStorage`.
- A documentacao tecnica e comercial ainda esta em evolucao.
- Ainda nao ha rotina automatica de testes e backup versionado externo.

## Roadmap

O plano de evolucao para produto SaaS esta documentado em [docs/ROADMAP_SAAS.md](docs/ROADMAP_SAAS.md).
