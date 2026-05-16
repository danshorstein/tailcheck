#!/usr/bin/env bash
set -euo pipefail

RAW_DIR="${RAW_DATA_DIR:-./raw_data}/ntsb"
mkdir -p "$RAW_DIR/csv"

ZIP_PATH="$RAW_DIR/avall.zip"
MDB_PATH="$RAW_DIR/avall.mdb"
AVALL_URL="https://data.ntsb.gov/avdata/FileDirectory/DownloadFile?fileID=C%3A%5Cavdata%5Cavall.zip"

if ! command -v mdb-tables >/dev/null 2>&1; then
  echo "mdbtools is required. Install with: brew install mdbtools"
  exit 1
fi

if [ ! -f "$ZIP_PATH" ]; then
  echo "Downloading NTSB avall.zip..."
  curl -L --fail --retry 3 \
    -A "Mozilla/5.0 aircraft-public-records-prototype" \
    -o "$ZIP_PATH" \
    "$AVALL_URL"
fi

if [ ! -f "$MDB_PATH" ]; then
  unzip -o "$ZIP_PATH" -d "$RAW_DIR"
fi

echo "Listing MDB tables..."
mdb-tables -1 "$MDB_PATH" > "$RAW_DIR/tables.txt"
cat "$RAW_DIR/tables.txt"

echo "Exporting tables to CSV..."
while IFS= read -r table; do
  [ -z "$table" ] && continue
  echo "Exporting $table"
  mdb-export "$MDB_PATH" "$table" > "$RAW_DIR/csv/${table}.csv"
done < "$RAW_DIR/tables.txt"

echo "Done. CSVs written to $RAW_DIR/csv"
