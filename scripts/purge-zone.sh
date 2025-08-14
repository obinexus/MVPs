#!/bin/bash
# purge-zone.sh
# Ritual: Remove Zone.Identifier metadata from all files under ./diram
# Purpose: Restore sovereignty across Windows/WSL boundary

TARGET_DIR="./diram"
LOG_FILE="./zone-purge.log"

echo -e "\n🔮 Zone Purge Initiated: $(date)" >> "$LOG_FILE"

find "$TARGET_DIR" -type f | while read -r file; do
    ADS_PATH="${file}:Zone.Identifier"
    if [ -e "$ADS_PATH" ]; then
        rm "$ADS_PATH" && \
        echo "✅ Purged: $ADS_PATH" >> "$LOG_FILE" || \
        echo "⚠️ Failed: $ADS_PATH" >> "$LOG_FILE"
    fi
done

echo "🧹 Zone Purge Complete: $(date)" >> "$LOG_FILE"
