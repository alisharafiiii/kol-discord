#!/bin/bash

# Setup script for auto-backup cron job

echo "Setting up daily auto-backup for your KOL project..."

# Get the full path to the auto-commit script
SCRIPT_PATH="/Users/nabu/kol/scripts/auto-commit.sh"
LOG_PATH="/Users/nabu/kol/scripts/auto-commit.log"

# Create the cron job entry (runs every day at 2 AM)
CRON_JOB="0 2 * * * $SCRIPT_PATH >> $LOG_PATH 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$SCRIPT_PATH"; then
    echo "Auto-backup cron job already exists!"
else
    # Add the cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✅ Auto-backup cron job installed successfully!"
    echo "   It will run daily at 2:00 AM"
    echo "   Logs will be saved to: $LOG_PATH"
fi

echo ""
echo "To view your cron jobs: crontab -l"
echo "To remove the auto-backup: crontab -e (then delete the line)"
echo ""
echo "To test the backup script manually, run:"
echo "  ./scripts/auto-commit.sh" 