#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID=serraria-bcf36
BUCKET=gs://serraria-bcf36-firestore-backups-sa
STAMP=$(date +%Y-%m-%d_%H-%M-%S)
DEST=$BUCKET/firestore-backups/$STAMP
LOG_DIR=/opt/orquestracs/backups/logs

mkdir -p "$LOG_DIR"
echo "[$(date -Is)] Iniciando backup Firestore para $DEST" | tee -a "$LOG_DIR/firestore-backup.log"
gcloud firestore export "$DEST" --project "$PROJECT_ID" 2>&1 | tee -a "$LOG_DIR/firestore-backup.log"
echo "[$(date -Is)] Backup solicitado/concluido: $DEST" | tee -a "$LOG_DIR/firestore-backup.log"
