#!/bin/bash

echo "Testing auto-backup functionality..."
echo ""

# Run the auto-commit script directly
echo "Running auto-commit script..."
./scripts/auto-commit.sh

echo ""
echo "✅ Test complete!"
echo ""
echo "Check the output above:"
echo "- If it says 'No changes to commit', the script is working correctly"
echo "- If it created a backup commit and pushed successfully, perfect!"
echo "- If you see authentication errors, run ./scripts/setup-ssh-github.sh first" 