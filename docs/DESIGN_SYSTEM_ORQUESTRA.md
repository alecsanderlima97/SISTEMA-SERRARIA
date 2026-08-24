# Design System Orquestra.cs

Base visual para deixar os sistemas da Orquestra.cs mais profissionais, compactos e consistentes.

## Direcao

- Visual operacional, nao promocional.
- Interface limpa, com foco em leitura rapida e lancamento de dados.
- Cor forte apenas para acao principal, alerta, status ou risco.
- Menos brilho, menos saturacao e menos efeitos decorativos.
- Tabelas, cards e formularios devem parecer ferramentas de trabalho, nao paineis de jogo.

## Paleta Base

- Fundo da area de trabalho: `#f3efe4`
- Card principal: `#fffdf7`
- Card secundario: `#f8f4ea`
- Borda: `#dbe3ee`
- Texto principal: `#0f172a`
- Texto secundario: `#64748b`
- Acao principal: `#111827`
- Destaque Orquestra: `#0f8fa6`
- Alerta: `#b45309`
- Sucesso: `#047857`
- Erro: `#b91c1c`

## Tipografia

- Titulo de tela: 22px a 26px.
- Titulo de card: 15px a 17px.
- Label: 11px a 12px, sempre em caixa alta apenas quando ajudar na leitura.
- Texto de tabela: 13px a 14px.
- Numeros financeiros devem usar peso maior e alinhamento consistente.

## Layout

- Cards com raio de 8px.
- Nada de card dentro de card sem necessidade.
- Formularios devem usar grid compacto e alinhado.
- Campos pequenos para informacoes pequenas.
- Acoes principais no canto direito ou fim do fluxo.
- Listas e formularios longos devem ter botao de ocultar/mostrar.
- Evitar scroll horizontal; quando inevitavel, a tabela deve ficar dentro de um container claro e controlado.

## Componentes

### KPIs

- Fundo palha claro ou branco quente.
- Borda discreta.
- Icone pequeno.
- Valor principal evidente.
- Cor de alerta apenas no KPI que exige atencao.
- KPI nao deve parecer botao: sem cursor de clique, sem hover forte e com uma pequena faixa lateral de leitura.

### Formularios

- Campos com altura entre 36px e 40px no desktop.
- Labels curtas.
- Placeholder objetivo.
- Botao salvar alinhado ao fim do formulario.
- Anexos e automacoes devem ficar agrupados visualmente.
- Campo de digitacao deve parecer rebaixado, com fundo interno proprio e borda mais marcada que um card.
- Botao deve parecer acao: contraste maior, texto centralizado e estado hover claro.

### Tabelas

- Cabecalho cinza claro.
- Linhas com divisao suave.
- Hover discreto, sem trocar drasticamente a cor.
- Acoes sempre alinhadas e com tamanho padrao.

### Status

- Usar chips pequenos.
- Nao pintar cards inteiros quando um chip resolve.
- Cores:
  - Pago: verde discreto.
  - Aberto/pendente: amarelo queimado.
  - Vencido/erro: vermelho discreto.

## Movimento

- Animacao deve orientar, nao chamar atencao demais.
- Cards podem entrar com fade curto e deslocamento leve.
- Botoes podem subir 1px no hover e responder ao clique.
- Campos podem ganhar foco com transicao suave.
- Respeitar `prefers-reduced-motion` para usuarios sensiveis a movimento.

## Regra de Evolucao

Toda tela nova ou reformulada deve primeiro seguir este padrao. Se uma tela precisar de excecao, a excecao deve ser justificada pela operacao do usuario.
