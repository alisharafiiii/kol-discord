module.exports = {
  apps: [
    {
      name: 'discord-analytics',
      script: './analytics-bot-resilient.mjs',
      cwd: '/Users/nabu/kol/discord-bots',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/analytics-error.log',
      out_file: './logs/analytics-out.log',
      log_file: './logs/analytics-combined.log',
      time: true,
      
      // Restart settings
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 1000,
      
      // Exponential backoff for restarts
      exp_backoff_restart_delay: 100,
      
      // Kill timeout
      kill_timeout: 5000,
      
      // Listen for shutdown signals
      listen_timeout: 3000,
      
      // Merge logs
      merge_logs: true,
      
      // Log rotation
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto restart on file changes (disabled in production)
      ignore_watch: ['node_modules', 'logs', '*.log'],
      
      // Environment variables will be loaded from .env.local
      node_args: '--experimental-modules'
    },
    {
      name: 'discord-engagement',
      script: './engagement-bot.mjs',
      cwd: '/Users/nabu/kol/discord-bots',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/engagement-error.log',
      out_file: './logs/engagement-out.log',
      log_file: './logs/engagement-combined.log',
      time: true,
      
      // Restart settings
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 1000,
      
      // Exponential backoff for restarts
      exp_backoff_restart_delay: 100,
      
      // Kill timeout
      kill_timeout: 5000,
      
      // Listen for shutdown signals
      listen_timeout: 3000,
      
      // Merge logs
      merge_logs: true,
      
      // Log rotation
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto restart on file changes (disabled in production)
      ignore_watch: ['node_modules', 'logs', '*.log'],
      
      // Environment variables will be loaded from .env.local
      node_args: '--experimental-modules'
    }
  ],
  
  // Deploy configuration (optional)
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/kol.git',
      path: '/var/www/kol',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-deploy-local': ''
    }
  }
} 