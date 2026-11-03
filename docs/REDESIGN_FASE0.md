# Redesign mobile e organização: Fase 0 (diagnóstico)

Documento de diagnóstico da branch `feat/redesign-mobile`. Somente leitura: nenhuma tela foi alterada nesta fase.

## 1. Tamanho do sistema

| Área | Medida |
|---|---|
| JavaScript em `js/` e `api/` | ~36.800 linhas |
| Maiores módulos | `financeiro.js` 4.133, `entrada.js` 3.561, `patio.js` 3.463, `romaneio_v2.js` 2.566, `core.js` 2.242 |
| Folhas de estilo | 5 arquivos próprios, ~9.700 linhas; `ui-polish.css` e `orquestra-theme.css` têm ~90 KB cada |
| Scripts no `index.html` | 65 `<script>`, com parâmetros `?v=` de cache |
| Build, bundler, testes | Nenhum (conforme README) |

## 2. Conflitos de CSS

Ordem de carregamento no `index.html`:

1. `styles.css`
2. `romaneio-v2.css`
3. `ui-polish.css`
4. `orquestra-theme.css`
5. `central-admin.css`

Cada arquivo sobrescreve regras dos anteriores. Não há camada de tokens única.

Breakpoints usados, sem padrão comum: 600, 620, 640, 680, 700, 720, 760, 768, 820, 900, 980 e 1100 px. O valor 760 px aparece 17 vezes.

## 3. Navegação e cabeçalho

- A sidebar tem 15 itens em lista plana, sem agrupamento por função.
- O cabeçalho global reúne: botão de recolher menu, nome da seção, campo de busca para a IA, widget de clima com popover, central de notificações e ações. Em tela pequena, disputa espaço entre si.

## 4. Texto corrompido por codificação (mojibake)

Textos com sequências como `Ã`, `Â` e `ÃƒÆ’` aparecem na interface. Ocorrências por arquivo:

| Arquivo | Linhas afetadas |
|---|---|
| `js/patio.js` | 19 |
| `js/financeiro.js` | 13 |
| `js/frotas.js` | 10 |
| `js/rh.js` | 5 |
| `index.html` | 4 |
| `js/views/estoque-view.js`, `js/estoque.js`, `js/entrada.js` | 3 cada |
| `login.html`, `js/views/rh-view.js`, `js/views/cavaco-view.js`, `js/login.js` | 2 ou 1 cada |
| `js/views/pendente-view.js`, `js/views/frotas-view.js`, `js/romaneio_v2.js` | 1 cada |

Também há ocorrências em `styles.css`. Correção recomendada: converter cada arquivo para UTF-8 com a sequência de caracteres corrigida, sem alterar o restante do conteúdo.

## 5. Código possivelmente duplicado ou legado

- `js/romaneio.legacy.js` convive com `js/romaneio_v2.js`. Verificar se o legado ainda é carregado antes de remover.
- Há módulos de lógica (`js/entrada.js`, `js/estoque.js` etc.) e módulos de tela (`js/views/*-view.js`). Verificar se há sobreposição de responsabilidades.

## 6. Pendências de evidência

- Não foi possível medir desempenho real (tempo de carga, uso de memória) nem capturar telas em celular, porque as telas internas exigem login (Firebase).
- Para a linha de base visual, é preciso uma sessão autenticada de teste ou acesso a um navegador onde o usuário já esteja logado.

## 7. Fora do escopo desta reforma

`firestore.rules`, autenticação, multiempresa, cobrança e dados reais. São áreas de risco alto e exigem plano separado.

## 8. Próximas fases

- **Fase 1 (base visual):** tokens únicos e três breakpoints. Corrigir mojibake nos arquivos listados.
- **Fase 2 (navegação e telas):** agrupar o menu, redesenhar o cabeçalho para mobile e revisar as telas mais usadas.
- **Fase 3 (peso e limpeza):** remover legado confirmado como não usado e avaliar carregamento sob demanda dos módulos grandes.
