#!/bin/bash

# Discord Bots PM2 Management Script
# This script manages Discord bots using PM2 for better process management

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Function to check if PM2 is installed
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        echo -e "${RED}❌ PM2 is not installed${NC}"
        echo "Please install PM2 globally: npm install -g pm2"
        exit 1
    fi
}

# Function to start all bots with PM2
start_all() {
    check_pm2
    echo -e "${GREEN}Starting all Discord bots with PM2...${NC}"
    pm2 start ecosystem.config.js
    pm2 save
    echo -e "${GREEN}✅ All bots started${NC}"
}

# Function to start analytics bot
start_analytics() {
    check_pm2
    echo -e "${GREEN}Starting analytics bot with PM2...${NC}"
    pm2 start ecosystem.config.js --only discord-analytics
    pm2 save
    echo -e "${GREEN}✅ Analytics bot started${NC}"
}

# Function to start engagement bot
start_engagement() {
    check_pm2
    echo -e "${GREEN}Starting engagement bot with PM2...${NC}"
    pm2 start ecosystem.config.js --only discord-engagement
    pm2 save
    echo -e "${GREEN}✅ Engagement bot started${NC}"
}

# Function to stop all bots
stop_all() {
    check_pm2
    echo -e "${YELLOW}Stopping all Discord bots...${NC}"
    pm2 stop discord-analytics discord-engagement
    pm2 save
    echo -e "${GREEN}✅ All bots stopped${NC}"
}

# Function to stop analytics bot
stop_analytics() {
    check_pm2
    echo -e "${YELLOW}Stopping analytics bot...${NC}"
    pm2 stop discord-analytics
    pm2 save
    echo -e "${GREEN}✅ Analytics bot stopped${NC}"
}

# Function to stop engagement bot
stop_engagement() {
    check_pm2
    echo -e "${YELLOW}Stopping engagement bot...${NC}"
    pm2 stop discord-engagement
    pm2 save
    echo -e "${GREEN}✅ Engagement bot stopped${NC}"
}

# Function to restart all bots
restart_all() {
    check_pm2
    echo -e "${YELLOW}Restarting all Discord bots...${NC}"
    pm2 restart discord-analytics discord-engagement
    echo -e "${GREEN}✅ All bots restarted${NC}"
}

# Function to show status
status() {
    check_pm2
    echo -e "${GREEN}=== Discord Bots Status ===${NC}"
    pm2 status discord-analytics discord-engagement
}

# Function to show logs
logs() {
    check_pm2
    local bot=$1
    local lines=${2:-50}
    
    if [ -z "$bot" ]; then
        echo "Showing combined logs for all bots (last $lines lines)..."
        pm2 logs --lines $lines
    else
        echo "Showing logs for $bot (last $lines lines)..."
        pm2 logs $bot --lines $lines
    fi
}

# Function to monitor bots
monitor() {
    check_pm2
    echo -e "${GREEN}Opening PM2 monitor...${NC}"
    pm2 monit
}

# Function to setup PM2 startup
setup_startup() {
    check_pm2
    echo -e "${GREEN}Setting up PM2 startup script...${NC}"
    pm2 startup
    pm2 save
    echo -e "${GREEN}✅ PM2 startup configured${NC}"
}

# Function to test email notifications
test_email() {
    echo -e "${GREEN}Testing email notifications...${NC}"
    node test-email-notification.mjs
}

# Function to migrate from old bot to resilient bot
migrate_to_resilient() {
    echo -e "${YELLOW}Migrating to resilient analytics bot...${NC}"
    
    # Stop old bot if running
    ./manage-bots.sh stop-analytics 2>/dev/null || true
    
    # Kill any remaining node processes for old bot
    pkill -f "analytics-bot.mjs" 2>/dev/null || true
    
    # Start new resilient bot with PM2
    start_analytics
    
    echo -e "${GREEN}✅ Migration complete${NC}"
}

# Main menu
case "$1" in
    start)
        start_all
        ;;
    start-analytics)
        start_analytics
        ;;
    start-engagement)
        start_engagement
        ;;
    stop)
        stop_all
        ;;
    stop-analytics)
        stop_analytics
        ;;
    stop-engagement)
        stop_engagement
        ;;
    restart)
        restart_all
        ;;
    restart-analytics)
        pm2 restart discord-analytics
        ;;
    restart-engagement)
        pm2 restart discord-engagement
        ;;
    status)
        status
        ;;
    logs)
        logs "$2" "$3"
        ;;
    monitor)
        monitor
        ;;
    setup-startup)
        setup_startup
        ;;
    test-email)
        test_email
        ;;
    migrate)
        migrate_to_resilient
        ;;
    *)
        echo -e "${GREEN}Discord Bots PM2 Management Script${NC}"
        echo "Usage: $0 {command} [options]"
        echo ""
        echo "Commands:"
        echo "  start              - Start all bots with PM2"
        echo "  start-analytics    - Start only analytics bot"
        echo "  start-engagement   - Start only engagement bot"
        echo "  stop               - Stop all bots"
        echo "  stop-analytics     - Stop only analytics bot"
        echo "  stop-engagement    - Stop only engagement bot"
        echo "  restart            - Restart all bots"
        echo "  restart-analytics  - Restart only analytics bot"
        echo "  restart-engagement - Restart only engagement bot"
        echo "  status             - Show bot status"
        echo "  logs [bot] [lines] - Show logs (default: all bots, 50 lines)"
        echo "  monitor            - Open PM2 monitoring interface"
        echo "  setup-startup      - Configure PM2 to start on system boot"
        echo "  test-email         - Test email notification system"
        echo "  migrate            - Migrate from old bot to resilient version"
        echo ""
        echo "Examples:"
        echo "  $0 start           - Start all bots"
        echo "  $0 logs analytics 100  - Show last 100 lines of analytics bot logs"
        echo "  $0 monitor         - Open real-time monitoring"
        exit 1
        ;;
esac 