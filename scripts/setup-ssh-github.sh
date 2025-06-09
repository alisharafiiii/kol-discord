#!/bin/bash

echo "Setting up SSH authentication for GitHub..."
echo "This is a one-time setup that will make your auto-backups work seamlessly."
echo ""

# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Check if SSH key already exists
if [ -f ~/.ssh/id_ed25519 ]; then
    echo "SSH key already exists at ~/.ssh/id_ed25519"
else
    echo "Generating new SSH key..."
    # Generate SSH key with no passphrase for automation
    ssh-keygen -t ed25519 -C "nabu@kol-auto-backup" -f ~/.ssh/id_ed25519 -N ""
    echo "✅ SSH key generated successfully!"
fi

# Start ssh-agent and add key
echo ""
echo "Adding SSH key to ssh-agent..."
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Display the public key
echo ""
echo "========================================="
echo "YOUR SSH PUBLIC KEY:"
echo "========================================="
cat ~/.ssh/id_ed25519.pub
echo "========================================="
echo ""
echo "📋 NEXT STEPS:"
echo "1. Copy the SSH key above"
echo "2. Go to https://github.com/settings/keys"
echo "3. Click 'New SSH key'"
echo "4. Give it a title like 'KOL Auto-Backup'"
echo "5. Paste the key and save"
echo ""
echo "Press Enter when you've added the key to GitHub..."
read

# Test GitHub connection
echo ""
echo "Testing GitHub SSH connection..."
ssh -T git@github.com 2>&1 | grep -q "successfully authenticated" && echo "✅ GitHub SSH authentication successful!" || echo "⚠️  GitHub SSH test failed. Make sure you added the key to GitHub."

# Update git remote to use SSH
echo ""
echo "Updating Git remote to use SSH..."
cd /Users/nabu/kol
git remote set-url origin git@github.com:alisharafiiii/kol.git
echo "✅ Git remote updated to use SSH"

# Test by doing a git fetch
echo ""
echo "Testing Git operations..."
git fetch && echo "✅ Git fetch successful! Your auto-backups will now work." || echo "❌ Git fetch failed. Please check your SSH key setup."

echo ""
echo "🎉 Setup complete! Your auto-backup cron job will now work without authentication issues."
echo ""
echo "The auto-backup will run daily at 2:00 AM and push changes to GitHub automatically." 