# Resilient Discord Analytics Bot System

## Overview

This document describes the enhanced Discord analytics bot system with:
- **Robust Redis reconnection** with exponential backoff
- **PM2 process management** for automatic restarts
- **Email notifications** when the bot stops or encounters critical errors
- **Complete isolation** from other system components

## Key Features

### 1. Redis Connection Resilience
- Automatic reconnection attempts with exponential backoff
- Maximum 10 retry attempts before sending alert and exiting
- Health checks every 30 seconds
- Graceful degradation when Redis is unavailable

### 2. PM2 Process Management
- Automatic restart on crashes
- Memory limit monitoring (500MB)
- Log rotation and management
- System startup integration

### 3. Email Notifications
- Sends alerts to admin email when bot stops
- Includes error details and recovery instructions
- Uses SMTP configuration:
  - Host: mail.privateemail.com
  - Port: 587
  - From: notifications@nabulines.com

### 4. Complete Isolation
- Separate Redis wrapper (`lib/redis-resilient.mjs`)
- Dedicated email notifier (`lib/email-notifier.mjs`)
- No impact on points system or other components
- Independent logging and error handling

## Installation & Setup

### Prerequisites
```bash
# Install PM2 globally
npm install -g pm2

# Install bot dependencies
cd discord-bots
npm install
```

### Configuration
Add to `.env.local`:
```env
# Email notifications
ADMIN_EMAIL=admin@example.com

# Existing Discord/Redis config
DISCORD_BOT_TOKEN=your_token
UPSTASH_REDIS_REST_URL=your_url
UPSTASH_REDIS_REST_TOKEN=your_token
```

## Usage

### Starting the Bot

#### Using PM2 (Recommended)
```bash
# Start with PM2
./manage-bots-pm2.sh start-analytics

# Or migrate from old bot
./manage-bots-pm2.sh migrate
```

#### Manual Testing
```bash
# Test email notifications first
./manage-bots-pm2.sh test-email

# Run directly for debugging
node analytics-bot-resilient.mjs
```

### Managing the Bot
```bash
# Check status
./manage-bots-pm2.sh status

# View logs
./manage-bots-pm2.sh logs analytics 100

# Monitor in real-time
./manage-bots-pm2.sh monitor

# Restart
./manage-bots-pm2.sh restart-analytics

# Stop
./manage-bots-pm2.sh stop-analytics
```

### Setup Auto-Start on Boot
```bash
# Configure PM2 to start on system boot
./manage-bots-pm2.sh setup-startup
```

## Architecture

### File Structure
```
discord-bots/
├── lib/
│   ├── redis-resilient.mjs    # Resilient Redis wrapper
│   └── email-notifier.mjs     # Email notification system
├── analytics-bot-resilient.mjs # Enhanced bot with error handling
├── ecosystem.config.js         # PM2 configuration
├── manage-bots-pm2.sh         # PM2 management script
├── test-email-notification.mjs # Email testing script
└── logs/                      # PM2 log files
```

### Redis Reconnection Logic
1. Initial connection attempt on startup
2. On connection failure:
   - Log error
   - Schedule reconnection with exponential backoff
   - Delay: 1s → 2s → 4s → 8s → 16s → 32s → 60s (max)
3. After 10 failed attempts:
   - Send email alert to admin
   - Exit process (PM2 will restart)

### Email Alert Contents
- Bot name and timestamp
- Error details and stack trace
- Last activity timestamp
- Process information (PID, uptime, memory)
- Manual recovery instructions

## Monitoring & Troubleshooting

### Health Metrics
The bot tracks:
- Last message processed timestamp
- Total messages processed
- Error count
- Redis connection status

### Common Issues

#### Bot Not Starting
```bash
# Check PM2 status
pm2 status

# Check error logs
pm2 logs discord-analytics --err --lines 100

# Verify Redis connection
node -e "console.log(process.env.UPSTASH_REDIS_REST_URL)"
```

#### Email Notifications Not Working
```bash
# Test email system
node test-email-notification.mjs

# Check SMTP credentials
# Verify ADMIN_EMAIL in .env.local
```

#### Redis Connection Issues
```bash
# Check Redis credentials
# Verify network connectivity
# Monitor reconnection attempts in logs
pm2 logs discord-analytics --lines 200 | grep Redis
```

## Manual Verification Steps

1. **Test Email System**
   ```bash
   cd discord-bots
   node test-email-notification.mjs
   ```
   - Should send 2 emails: test email and alert email

2. **Simulate Bot Failure**
   ```bash
   # Start bot with PM2
   ./manage-bots-pm2.sh start-analytics
   
   # Force stop to trigger email
   pm2 stop discord-analytics
   
   # Check email for alert
   ```

3. **Test Redis Reconnection**
   ```bash
   # Start bot
   # Temporarily block Redis connection (firewall/network)
   # Watch logs for reconnection attempts
   pm2 logs discord-analytics -f
   ```

4. **Verify Isolation**
   ```bash
   # Check that other bots/services still run
   # Verify points system unaffected
   # Confirm no shared dependencies
   ```

## Best Practices

1. **Always use PM2** for production deployment
2. **Monitor logs regularly** for error patterns
3. **Test email alerts** after configuration changes
4. **Keep error count low** - investigate if > 10/hour
5. **Review health metrics** in logs periodically

## Emergency Recovery

If the bot is completely down:

1. SSH into server
2. Navigate to project: `cd /path/to/kol`
3. Check PM2: `pm2 status`
4. If missing: `cd discord-bots && ./manage-bots-pm2.sh migrate`
5. If erroring: `pm2 restart discord-analytics`
6. Check logs: `pm2 logs discord-analytics --lines 200`
7. Test Redis: `node -e "require('./lib/redis-resilient.mjs')"`

## Changelog

### v2.0.0 - Resilient Version
- Added Redis reconnection with exponential backoff
- Integrated PM2 process management
- Implemented email notifications
- Enhanced error handling and logging
- Added health monitoring
- Complete isolation from other systems 