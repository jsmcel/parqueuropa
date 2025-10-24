module.exports = {
  apps: [{
    name: 'guia-ferroviaria-backend',
    script: 'server.js',
    instances: 'max', // Usar todos los cores disponibles
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // Configuración de logs
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Configuración de reinicio
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10,
    
    // Configuración de monitoreo
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'public'],
    
    // Configuración de variables de entorno
    env_file: '.env',
    
    // Configuración de timeouts
    kill_timeout: 5000,
    listen_timeout: 3000,
    
    // Configuración de cluster
    instance_var: 'INSTANCE_ID',
    
    // Configuración de health check
    health_check_grace_period: 3000,
    health_check_fatal_exceptions: true
  }]
}; 