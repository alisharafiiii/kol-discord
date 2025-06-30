import { Redis } from '@upstash/redis'
import { sendBotAlert } from './email-notifier.mjs'

// Configuration for reconnection
const INITIAL_RETRY_DELAY = 1000 // 1 second
const MAX_RETRY_DELAY = 60000 // 60 seconds
const MAX_RETRIES = 10
const BACKOFF_MULTIPLIER = 2

export class ResilientRedis {
  constructor(options) {
    this.options = options
    this.redis = null
    this.isConnected = false
    this.retryCount = 0
    this.retryDelay = INITIAL_RETRY_DELAY
    this.lastError = null
    this.reconnectTimer = null
    this.botName = options.botName || 'Discord Analytics Bot'
    this.healthCheckInterval = null
    this.lastSuccessfulOperation = Date.now()
    
    // Initialize connection
    this.connect()
    
    // Start health check
    this.startHealthCheck()
  }
  
  async connect() {
    try {
      console.log('🔄 Attempting Redis connection...')
      
      this.redis = new Redis({
        url: this.options.url,
        token: this.options.token,
        automaticDeserialization: true
      })
      
      // Test connection with a simple operation
      await this.redis.ping()
      
      this.isConnected = true
      this.retryCount = 0
      this.retryDelay = INITIAL_RETRY_DELAY
      this.lastSuccessfulOperation = Date.now()
      
      console.log('✅ Redis connection established')
      
      return true
    } catch (error) {
      this.lastError = error
      console.error('❌ Redis connection failed:', error.message)
      
      // Schedule reconnection
      this.scheduleReconnect()
      
      return false
    }
  }
  
  scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }
    
    if (this.retryCount >= MAX_RETRIES) {
      console.error('❌ Max retries reached. Sending alert email...')
      
      // Send email alert
      sendBotAlert(this.botName, this.lastError, {
        retryCount: this.retryCount,
        lastActivity: new Date(this.lastSuccessfulOperation).toISOString()
      }).catch(err => {
        console.error('Failed to send email alert:', err)
      })
      
      // Exit process to let PM2 restart it
      console.error('💀 Exiting process for PM2 restart...')
      process.exit(1)
    }
    
    this.retryCount++
    console.log(`⏳ Scheduling reconnection attempt ${this.retryCount}/${MAX_RETRIES} in ${this.retryDelay}ms...`)
    
    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, this.retryDelay)
    
    // Exponential backoff
    this.retryDelay = Math.min(this.retryDelay * BACKOFF_MULTIPLIER, MAX_RETRY_DELAY)
  }
  
  startHealthCheck() {
    // Check connection health every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      if (!this.isConnected) return
      
      try {
        await this.redis.ping()
        this.lastSuccessfulOperation = Date.now()
      } catch (error) {
        console.error('❌ Redis health check failed:', error.message)
        this.isConnected = false
        this.lastError = error
        this.scheduleReconnect()
      }
    }, 30000)
  }
  
  async executeWithRetry(operation, operationName = 'operation') {
    if (!this.isConnected) {
      console.warn(`⚠️  Redis not connected, queuing ${operationName}`)
      throw new Error('Redis connection not available')
    }
    
    try {
      const result = await operation()
      this.lastSuccessfulOperation = Date.now()
      return result
    } catch (error) {
      console.error(`❌ Redis ${operationName} failed:`, error.message)
      
      // Check if it's a connection error
      if (this.isConnectionError(error)) {
        this.isConnected = false
        this.lastError = error
        this.scheduleReconnect()
      }
      
      throw error
    }
  }
  
  isConnectionError(error) {
    const connectionErrors = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ENETUNREACH',
      'EHOSTUNREACH',
      'ECONNRESET',
      'EPIPE'
    ]
    
    const errorMessage = error.message || error.toString()
    return connectionErrors.some(errType => errorMessage.includes(errType)) ||
           errorMessage.includes('connection') ||
           errorMessage.includes('timeout')
  }
  
  // Wrapped Redis methods with automatic retry
  async get(key) {
    return this.executeWithRetry(() => this.redis.get(key), `get(${key})`)
  }
  
  async set(key, value, options) {
    return this.executeWithRetry(() => this.redis.set(key, value, options), `set(${key})`)
  }
  
  async del(key) {
    return this.executeWithRetry(() => this.redis.del(key), `del(${key})`)
  }
  
  async exists(key) {
    return this.executeWithRetry(() => this.redis.exists(key), `exists(${key})`)
  }
  
  async keys(pattern) {
    return this.executeWithRetry(() => this.redis.keys(pattern), `keys(${pattern})`)
  }
  
  async sadd(key, ...members) {
    return this.executeWithRetry(() => this.redis.sadd(key, ...members), `sadd(${key})`)
  }
  
  async smembers(key) {
    return this.executeWithRetry(() => this.redis.smembers(key), `smembers(${key})`)
  }
  
  async json() {
    return {
      get: async (key, path = '$') => {
        return this.executeWithRetry(() => this.redis.json.get(key, path), `json.get(${key})`)
      },
      set: async (key, path, value) => {
        return this.executeWithRetry(() => this.redis.json.set(key, path, value), `json.set(${key})`)
      }
    }
  }
  
  async ping() {
    return this.executeWithRetry(() => this.redis.ping(), 'ping')
  }
  
  // Cleanup method
  destroy() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    this.isConnected = false
  }
} 