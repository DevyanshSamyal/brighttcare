#!/bin/bash
# Daily dump of the Brighttcare database, kept for 14 days.
# Installed via cron — see deploy/UBUNTU_SETUP.md step 10.
set -euo pipefail

BACKUP_DIR="/var/backups/brighttcare"
DB_NAME="brighttcare"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=14

mkdir -p "$BACKUP_DIR"
sudo -u postgres pg_dump "$DB_NAME" | gzip > "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete

# This only protects against "made a bad change and need to roll back."
# Copy dumps off this server periodically (rsync elsewhere, object storage,
# etc.) if you want protection against the server itself failing.
