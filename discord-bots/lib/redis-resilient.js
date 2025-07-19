const { Redis } = require('@upstash/redis')

// Configuration for reconnection
const INITIAL_RETRY_DELAY = 1000 // 1 second
const MAX_RETRY_DELAY = 60000 // 60 seconds
const MAX_RETRIES = 10
const BACKOFF_MULTIPLIER = 2

class ResilientRedis {
  constructor(options) {
    this.options = options
    this.redis = null
    this.isConnected = false
    this.retryCount = 0
    this.retryDelay = INITIAL_RETRY_DELAY
    this.lastError = null
    this.reconnectTimer = null
    this.botName = options.botName || 'Discord Engagement Bot'
    this.healthCheckInterval = null
    this.lastSuccessfulOperation = Date.now()
    
    // Initialize json property as a getter
    Object.defineProperty(this, 'json', {
      get: () => {
        return {
          get: async (key, path = '$') => {
            return this.executeWithRetry(async () => {
              if (!this.redis || !this.redis.json) {
                throw new Error('Redis not connected')
              }
              const result = await this.redis.json.get(key, path)
              // Upstash returns array when using $ path, extract first element
              if (Array.isArray(result) && result.length === 1 && path === '$') {
                return result[0]
              }
              return result
            }, `json.get(${key})`)
          },
          set: async (key, path, value) => {
            return this.executeWithRetry(() => {
              if (!this.redis || !this.redis.json) {
                throw new Error('Redis not connected')
              }
              return this.redis.json.set(key, path, value)
            }, `json.set(${key})`)
          },
          numincrby: async (key, path, value) => {
            return this.executeWithRetry(async () => {
              if (!this.redis || !this.redis.json) {
                throw new Error('Redis not connected')
              }
              const result = await this.redis.json.numincrby(key, path, value)
              return result
            }, `json.numincrby(${key})`)
          }
        }
      }
    })
    
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
      console.error('❌ Max retries reached. Connection issues persist.')
      
      // Don't exit, just log and try again later
      this.retryCount = 0
      this.retryDelay = MAX_RETRY_DELAY
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
      'EPIPE',
      'UND_ERR_CONNECT_TIMEOUT'
    ]
    
    const errorMessage = error.message || error.toString()
    return connectionErrors.some(errType => errorMessage.includes(errType)) ||
           errorMessage.includes('connection') ||
           errorMessage.includes('timeout') ||
           errorMessage.includes('fetch failed')
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
  
  async sAdd(key, ...members) {
    return this.executeWithRetry(() => this.redis.sadd(key, ...members), `sAdd(${key})`)
  }
  
  async smembers(key) {
    return this.executeWithRetry(() => this.redis.smembers(key), `smembers(${key})`)
  }
  
  async zadd(key, ...args) {
    return this.executeWithRetry(() => this.redis.zadd(key, ...args), `zadd(${key})`)
  }
  
  async incr(key) {
    return this.executeWithRetry(() => this.redis.incr(key), `incr(${key})`)
  }
  
  async expire(key, seconds) {
    return this.executeWithRetry(() => this.redis.expire(key, seconds), `expire(${key}, ${seconds})`)
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

module.exports = { ResilientRedis } 