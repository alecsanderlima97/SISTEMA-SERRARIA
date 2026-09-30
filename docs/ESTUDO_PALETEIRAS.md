# Estudo de Produto - Orquestra Madeira para Paleteiras

Data do estudo: 27/08/2026

## 1. Resumo executivo

O sistema atual pode evoluir para atender paleteiras, mas a melhor decisao de produto nao e transformar todos os clientes em uma copia da serraria. A recomendacao e criar a plataforma **Orquestra Madeira**, com uma base comum e modulos ativados conforme o segmento:

- Serraria;
- Paleteira;
- Industria madeireira integrada;
- Futuramente, beneficiamento, embalagens e artefatos de madeira.

Uma paleteira precisa controlar mais do que cubagem e estoque. O nucleo da operacao e a transformacao de madeira e componentes em um produto padronizado, rastreavel e vendido por unidade, lote, modelo ou contrato.

## 2. Como funciona uma paleteira

O fluxo operacional mais comum e:

1. Compra e recebimento de madeira, componentes e insumos.
2. Identificacao do lote de origem, especie, fornecedor e documentos.
3. Classificacao e armazenamento da materia-prima.
4. Corte e preparacao de tabuas, blocos, longarinas e travessas.
5. Secagem ou tratamento, quando exigido pelo cliente ou destino.
6. Separacao dos componentes conforme a ficha tecnica do palete.
7. Montagem e pregagem.
8. Inspecao de medidas, umidade, defeitos e montagem.
9. Liberacao, retrabalho ou descarte.
10. Entrada no estoque de produto acabado.
11. Separacao por pedido, carregamento e expedicao.
12. Retorno, conserto ou reaproveitamento, quando a operacao trabalha com paletes retornaveis.

## 3. O que diferencia a paleteira da serraria

| Serraria | Paleteira |
| --- | --- |
| Controle principal por cubagem e pacote | Controle principal por modelo, unidade e lote |
| Produto descrito por classe e medidas | Produto descrito por ficha tecnica e lista de componentes |
| Producao medida principalmente em m3 | Producao medida em paletes aprovados, retrabalhados e rejeitados |
| Romaneio vende madeira serrada | Pedido vende um produto montado com especificacao contratual |
| Estoque por madeira/pacote | Estoque de materia-prima, componentes, insumos e produto acabado |
| Qualidade ligada a classe da madeira | Qualidade ligada tambem a dimensoes, umidade, montagem e carga |

## 4. Requisitos tecnicos e de conformidade

### Palete PBR

A especificacao tecnica oficial do PBR-I define um palete nao reversivel, de quatro entradas, com nove blocos e dimensoes de 1.000 x 1.200 mm. A documentacao do Comite Permanente de Paletizacao tambem estabelece componentes, tolerancias, identificacao e requisitos de fabricacao. O cadastro de um produto PBR no sistema deve, portanto, usar uma ficha tecnica versionada e nao apenas um nome livre.

### Exportacao e tratamento fitossanitario

A NIMF 15 se aplica a embalagens de madeira bruta no comercio internacional, incluindo paletes e madeira de acomodacao. O processo pode exigir tratamento aprovado, identificacao IPPC e rastreabilidade. No Brasil, o tratamento e a aplicacao da marca devem ser realizados por empresa autorizada pelo MAPA. O sistema deve registrar lote, tratamento, data, responsavel, empresa autorizada, certificado e identificacao aplicada.

### Madeira e origem legal

Quando houver produto florestal sujeito ao controle ambiental, a empresa deve manter origem, transporte e armazenamento documentados. O DOF+ Rastreabilidade e voltado a produtos e subprodutos florestais nativos. A regra aplicavel deve ser validada conforme especie, origem, estado e operacao; o sistema deve guardar os documentos sem presumir que toda madeira segue exatamente o mesmo regime.

### Seguranca industrial

A NR-12 estabelece medidas de protecao para todo o ciclo de vida de maquinas e equipamentos. A industria da madeira tambem e objeto de acao especifica do Ministerio do Trabalho devido aos indices de acidentes. O sistema nao substitui laudos ou adequacoes fisicas, mas pode controlar checklist, manutencao, bloqueio de equipamento, treinamento, ocorrencias e evidencias.

### Certificacoes comerciais

Operacoes que vendem paletes certificados ou entram em cadeias internacionais podem precisar de controles adicionais. A EPAL, por exemplo, exige licenca para producao e reparo de seus paletes. Certificacoes florestais como FSC Cadeia de Custodia exigem rastreabilidade dos materiais certificados. Esses controles devem ser opcionais e ativados apenas para empresas que realmente os utilizam.

## 5. Principais dores que o sistema deve resolver

- Saber quanto de cada componente existe e quanto sera consumido por ordem.
- Evitar produzir palete com ficha tecnica antiga ou especificacao errada.
- Saber o custo real por palete, cliente, modelo e lote.
- Comparar producao planejada, produzida, aprovada, retrabalhada e descartada.
- Controlar umidade, tratamento, qualidade e certificados.
- Rastrear quais lotes de madeira formaram cada lote de paletes.
- Separar estoque disponivel, reservado, em producao, em quarentena e acabado.
- Controlar pedidos personalizados e diferentes padroes por cliente.
- Registrar devolucao, conserto, troca e saldo de paletes retornaveis.
- Evitar anotacoes paralelas em papel, planilhas e mensagens.
- Dar ao operador uma tela simples para uso no celular ou tablet.

## 6. Modulos recomendados

### Base compartilhada com o sistema atual

- Usuarios, perfis e permissoes;
- Clientes, fornecedores e transportadoras;
- Financeiro e cobrancas;
- Frotas e manutencao;
- RH;
- Documentos, anexos, auditoria e backups;
- Mapa de fornecedores e areas florestais;
- Relatorios, impressao, PDF e WhatsApp.

### Modulos proprios da paleteira

- Catalogo de modelos de palete;
- Ficha tecnica e versoes;
- Lista de materiais e componentes (BOM);
- Ordens de producao;
- Apontamento por etapa ou posto;
- Consumo real de madeira, blocos, pregos e insumos;
- Controle de perdas, sobras, retrabalho e refugos;
- Inspecao de qualidade;
- Lotes de tratamento e certificados;
- Estoque de produto acabado;
- Separacao, reserva e expedicao por pedido;
- Retorno, reparo e reaproveitamento de paletes;
- Custo e margem por modelo, ordem e cliente.

## 7. Cadastro do modelo de palete

Cada modelo deve possuir:

- Codigo interno e nome comercial;
- Cliente ou uso geral;
- Padrao: proprio, PBR, EPAL ou outro;
- Dimensoes externas;
- Capacidade e finalidade informadas pelo fabricante/projeto;
- Especies e classes de madeira permitidas;
- Componentes, medidas e quantidades;
- Tipo e quantidade de pregos ou fixadores;
- Umidade maxima, quando aplicavel;
- Tratamento exigido;
- Tolerancias e criterios de inspecao;
- Desenho, foto, contrato e documentos anexos;
- Versao, vigencia e historico de alteracoes;
- Custo previsto e preco por cliente.

Uma ordem antiga deve continuar vinculada a versao da ficha tecnica usada no dia da producao. Alterar a ficha atual nao pode reescrever o historico.

## 8. Fluxo digital recomendado

### Entrada

O recebimento cria um lote de materia-prima com fornecedor, origem, especie, quantidade, unidade, volume, umidade, valor, documento e responsavel.

### Planejamento

O pedido do cliente gera uma necessidade de producao. O sistema compara a lista de materiais com o estoque e informa faltas antes de liberar a ordem.

### Producao

O operador abre a ordem no celular ou tablet, escolhe a etapa e informa apenas o essencial: quantidade boa, retrabalho, perda, parada e observacao. Os componentes consumidos podem ser sugeridos pela ficha e confirmados no encerramento.

### Qualidade

O lote nao entra como disponivel antes da aprovacao quando a empresa exigir inspecao. O resultado pode ser aprovado, aprovado com ressalva, retrabalho, quarentena ou rejeitado.

### Expedicao

O pedido reserva o lote acabado. A expedicao registra quantidade, veiculo, motorista, documentos, data, cliente e responsavel. O sistema impede expedir acima do saldo liberado.

## 9. Indicadores importantes

- Paletes produzidos por turno, equipe, dia e modelo;
- Producao planejada x realizada;
- Rendimento da madeira por lote;
- Consumo real x previsto de componentes;
- Taxa de perda, refugo e retrabalho;
- Custo medio e margem por palete;
- Horas paradas por maquina e motivo;
- Estoque e cobertura de materia-prima;
- Estoque disponivel, reservado e acabado;
- Pedidos atrasados e risco de atraso;
- Qualidade por modelo, lote e cliente;
- Paletes retornados, recuperados e descartados;
- Certificados e tratamentos proximos de pendencia.

## 10. MVP recomendado

### Fase 1 - Operacao essencial

- Cadastro de modelos e ficha tecnica;
- Componentes e estoque;
- Clientes, fornecedores e precos;
- Pedidos e ordens de producao;
- Apontamento de producao;
- Entrada de produto acabado;
- Expedicao;
- Custos basicos;
- Relatorios e auditoria.

### Fase 2 - Qualidade e rastreabilidade

- Inspecoes;
- Umidade;
- Lotes e QR Code;
- Tratamento e certificados;
- Rastreabilidade da origem ao cliente;
- Manutencao integrada.

### Fase 3 - Operacao avancada

- Planejamento automatico de materiais;
- Leitor de codigo de barras;
- Retorno e reparo;
- Portal do cliente;
- Integracao fiscal e contabil;
- Previsao de demanda e otimizacao de producao.

## 11. Modelo de dados sugerido

- `empresas` e `usuarios`;
- `modelos_palete` e `versoes_ficha_tecnica`;
- `componentes` e `listas_materiais`;
- `lotes_materia_prima`;
- `entradas_estoque` e `movimentacoes_estoque`;
- `pedidos_venda`;
- `ordens_producao` e `etapas_ordem`;
- `consumos_producao`;
- `lotes_produzidos`;
- `inspecoes_qualidade`;
- `tratamentos_fitossanitarios`;
- `certificados`;
- `reservas_estoque` e `expedicoes`;
- `retornos_reparos`;
- `custos_ordem`;
- `auditoria` e `exclusoes_recuperaveis`.

Todos os registros comerciais precisam estar vinculados a empresa correta. A ampliacao para outros clientes torna obrigatorio revisar o isolamento multiempresa e as regras do banco antes da comercializacao.

## 12. Recomendacao de arquitetura de produto

Nao recomendo copiar o modulo de patio e apenas trocar os nomes dos campos. A paleteira deve ter um dominio proprio de manufatura, conectado aos modulos compartilhados.

Estrutura recomendada:

- **Orquestra Madeira Base:** usuarios, clientes, fornecedores, documentos, financeiro, frota, RH, mapa, auditoria e backup;
- **Modulo Serraria:** toras, patio, pacotes, cubagem e romaneios;
- **Modulo Paleteira:** componentes, ficha tecnica, ordem de producao, qualidade, produto acabado e expedicao;
- **Modulo Integrado:** permite que a madeira produzida na serraria seja consumida diretamente pelas ordens da paleteira.

Essa arquitetura permite vender o produto para uma paleteira pura, uma serraria ou uma industria que executa as duas operacoes, sem poluir as telas com funcoes que o cliente nao utiliza.

## 13. Proposta comercial

O produto pode ser vendido em tres configuracoes:

- **Essencial:** estoque, modelos, ordens, producao e expedicao;
- **Profissional:** inclui qualidade, custos, rastreabilidade, manutencao e relatorios avancados;
- **Industria Integrada:** inclui serraria + paleteira + financeiro + mapa + automacoes e integracoes.

O plano deve limitar usuarios, unidades, uso de IA, armazenamento e integracoes, mantendo os dados acessiveis para exportacao mesmo quando houver bloqueio comercial.

## 14. Riscos antes de desenvolver

- Tentar atender PBR, EPAL e modelos proprios com uma unica ficha rigida;
- Misturar pacote de madeira com lote de palete acabado;
- Baixar componentes sem confirmar a producao real;
- Alterar fichas tecnicas sem versionamento;
- Tratar certificados como simples observacao;
- Permitir estoque negativo ou expedicao acima do saldo;
- Criar telas de fabrica grandes demais para uso no celular;
- Comercializar como multiempresa antes de testar isolamento e permissoes;
- Prometer conformidade tecnica apenas porque o sistema registra os dados.

## 15. Conclusao

E viavel atender paleteiras e isso aumenta muito o mercado da plataforma. A adaptacao deve ser feita como uma nova vertical dentro da Orquestra Madeira, preservando a operacao da serraria atual.

O melhor primeiro passo e construir um prototipo navegavel com cinco telas: **Painel**, **Modelos de Palete**, **Ordens de Producao**, **Apontamento da Fabrica** e **Estoque/Expedicao**. Esse prototipo deve ser validado com uma paleteira real antes da criacao completa do banco e das automacoes.

## Fontes oficiais consultadas

- [ABRAS - Especificacao tecnica do palete PBR-I](https://static.abras.com.br/pdf/especificacao_tecnica_rev2017.pdf)
- [ABRAS - Manual de utilizacao do palete PBR-I](https://static.abras.com.br/pdf/manual-de-utilizacao-pbr-1.pdf)
- [IPPC - ISPM 15](https://www.ippc.int/static/media/files/publication/en/2019/02/ISPM_15_2018_En_WoodPackaging_Post-CPM13_Rev_Annex1and2_Fixed_2019-02-01.pdf)
- [MAPA - Instrucao Normativa 32/2015](https://www.gov.br/receitafederal/pt-br/assuntos/aduana-e-comercio-exterior/manuais/despacho-de-importacao/legislacao/outras-normas/instrucao-normativa-mapa-no-32-2015)
- [EPAL - Requisitos do Euro Pallet](https://www.epal-pallets.org/eu-en/load-carriers/epal-euro-pallet)
- [FSC - Certificacao e Cadeia de Custodia](https://us.fsc.org/get-certified/certification)
- [IBAMA - DOF+ Rastreabilidade](https://www.gov.br/ibama/pt-br/assuntos/biodiversidade/flora-e-madeira/documento-de-origem-florestal-dof/dof-rastreabilidade)
- [Ministerio do Trabalho - NR-12](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/norma-regulamentadora-no-12-nr-12)
- [Ministerio do Trabalho - Acao Especial Setorial da industria da madeira](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/srts_aes_nes/srt-sp/aesmadeira/)

Observacao: exigencias fiscais, ambientais, trabalhistas e de certificacao devem ser validadas com contador, profissional ambiental, responsavel de seguranca e, quando aplicavel, organismo certificador. O sistema apoia o controle e a evidencia, mas nao substitui licencas, laudos ou certificacoes.
