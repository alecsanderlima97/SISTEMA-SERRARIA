# Backup do Firestore

Este projeto usa o Firebase `serraria-bcf36`.

## Objetivo

Criar uma rotina segura para exportar o Firestore para um bucket do Google Cloud Storage. Depois, essa rotina pode ser agendada na VPS.

## Requisitos

- Google Cloud CLI instalado.
- Login/autenticacao com permissao no projeto.
- Bucket do Google Cloud Storage criado para backups.
- Faturamento ativo no Google Cloud/Firebase Blaze para criar bucket e exportar backups.

Bucket criado para este projeto:

`gs://serraria-bcf36-firestore-backups-sa`

## Backup manual

No PowerShell, rode:

```powershell
$env:FIREBASE_PROJECT_ID="serraria-bcf36"
$env:FIRESTORE_BACKUP_BUCKET="gs://serraria-bcf36-firestore-backups-sa"
.\scripts\backup-firestore.ps1
```

Ou diretamente:

```powershell
.\scripts\backup-firestore.ps1 -ProjectId "serraria-bcf36" -Bucket "gs://serraria-bcf36-firestore-backups-sa"
```

## Agendamento na VPS

Na VPS `187.77.13.42`, o Google Cloud CLI foi instalado e o backup foi agendado via cron.

Script na VPS:

`/opt/orquestracs/backups/backup-firestore.sh`

Agendamento atual:

```cron
0 2 * * * /opt/orquestracs/backups/backup-firestore.sh >> /opt/orquestracs/backups/logs/cron.log 2>&1
```

Logs:

`/opt/orquestracs/backups/logs/firestore-backup.log`

`/opt/orquestracs/backups/logs/cron.log`

Recomendacao:

- Manter backups por pelo menos 30 dias.
- Futuramente trocar login pessoal por uma conta de servico com permissao minima para exportar Firestore.

## Observacao importante

O backup do Firestore via `firestore:export` salva os dados no Google Cloud Storage. Ele nao baixa automaticamente uma copia local para a VPS. Se quiser copia local tambem, adicionamos uma segunda etapa usando `gcloud storage cp`.

## Primeiro backup realizado

Primeiro backup real executado em 2026-05-26:

`gs://serraria-bcf36-firestore-backups-sa/firestore-backups/2026-05-26_13-53-07`

Primeiro backup executado pela VPS em 2026-05-26:

`gs://serraria-bcf36-firestore-backups-sa/firestore-backups/2026-05-26_17-54-50`

Observacao: o Firestore deste projeto opera em `southamerica-east1`, por isso o bucket de backup tambem precisa estar nessa regiao.
