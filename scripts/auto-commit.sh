#!/bin/bash

# Auto-commit script for daily backups
# This script will run daily to commit and push any changes

PROJECT_DIR="/Users/nabu/kol"
cd "$PROJECT_DIR"

# Check if there are any changes
if [[ -n $(git status -s) ]]; then
    echo "$(date): Changes detected, creating backup commit..."
    
    # Add all changes
    git add -A
    
    # Create commit with timestamp
    COMMIT_MSG="Auto-backup: $(date '+%Y-%m-%d %H:%M:%S')"
    git commit -m "$COMMIT_MSG"
    
    # Push to remote
    git push origin main
    
    echo "$(date): Backup completed successfully"
else
    echo "$(date): No changes to commit"
fi 