# Pasta Raiz Operacional Orquestra.cs

Padrao recomendado para manter documentos locais fora do banco de dados.

```text
C:\ORQUESTRA.CS\SERRARIA-VANMARTE\
├── BACKUPS\
├── FINANCEIRO\
│   ├── ENTRADA\
│   ├── BOLETOS\
│   ├── IMPOSTOS\
│   ├── NOTAS-FISCAIS\
│   ├── COMPROVANTES\
│   ├── PROCESSADOS\
│   ├── IGNORADOS\
│   ├── ERROS\
│   └── FILA\
├── ROMANEIOS\
├── RECIBOS\
├── RELATORIOS\
├── ETIQUETAS\
├── XML\
├── IMPORTACOES\
├── EXPORTACOES\
├── LOGS\
└── CONFIG\
```

## Fluxo financeiro

1. O usuario coloca PDFs/XMLs em `FINANCEIRO\ENTRADA`.
2. O monitor local organiza os arquivos por tipo.
3. O monitor cria um JSON leve em `FINANCEIRO\FILA`.
4. O sistema importa o JSON e salva no banco apenas dados e referencia local.
5. Os PDFs continuam no computador do cliente, reduzindo peso no Firestore.

## Scripts

- `scripts/instalar-pasta-raiz-orquestra.ps1`: cria a estrutura.
- `scripts/monitor-financeiro.ps1`: monitora a pasta `ENTRADA` e gera a fila.

## Backup

Incluir a pasta `C:\ORQUESTRA.CS\SERRARIA-VANMARTE` na rotina de backup do cliente.
