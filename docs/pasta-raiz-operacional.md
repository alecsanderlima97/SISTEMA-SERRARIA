# Pasta Raiz Operacional Orquestra.cs

Padrao recomendado para manter documentos locais fora do banco de dados.

```text
C:\VANMARTE\ORQUESTRA.CS\SERRARIA-VANMARTE\
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
- `scripts/servidor-arquivos-local.ps1`: permite visualizar PDFs locais pelo navegador em `http://127.0.0.1:8765`.

## Para testar

### Fluxo recomendado

```powershell
powershell -ExecutionPolicy Bypass -File scripts\iniciar-automacao-local.ps1
```

Depois coloque PDFs/XMLs em:

```text
C:\VANMARTE\ORQUESTRA.CS\SERRARIA-VANMARTE\FINANCEIRO\ENTRADA
```

O monitor organiza os arquivos e cria JSONs em:

```text
C:\VANMARTE\ORQUESTRA.CS\SERRARIA-VANMARTE\FINANCEIRO\FILA
```

No sistema, use o botao `Importar fila local`.

### Importacao manual pelo sistema

O botao `Selecionar arquivos financeiros` serve para uso pontual.
Para rotina diaria, prefira sempre a pasta `FINANCEIRO\ENTRADA`, porque ela evita bagunca em Downloads e mantem os documentos organizados por tipo.

## Backup

Incluir a pasta `C:\VANMARTE\ORQUESTRA.CS\SERRARIA-VANMARTE` na rotina de backup do cliente.
