/**
 * PM2 Application Configuration
 * Defines all application processes managed by PM2
 */
module.exports = {
  apps: [
    {
      // Main API Server
      name: 'bodydfi-api',
      script: './backend/src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      merge_logs: true,
      time: true
    },
    {
      // Background Workers Process
      name: 'bodydfi-workers',
      script: './backend/src/workers/index.js',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/workers-error.log',
      out_file: './logs/workers-out.log',
      merge_logs: true,
      time: true
    },
    {
      // Scheduled Tasks Process
      name: 'bodydfi-cron',
      script: './backend/src/cron/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/cron-error.log',
      out_file: './logs/cron-out.log',
      merge_logs: true,
      time: true
    },
    {
      // Blockchain Synchronization Process
      name: 'bodydfi-blockchain-sync',
      script: './backend/src/blockchain/sync.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/blockchain-error.log',
      out_file: './logs/blockchain-out.log',
      merge_logs: true,
      time: true,
      // Restart this service more often due to potential Solana RPC issues
      restart_delay: 5000
    }
  ]
}; 