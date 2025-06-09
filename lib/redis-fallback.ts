/**
 * Redis fallback utilities for when Redis/Upstash is unavailable
 */

// Mock data for development/fallback
export const MOCK_CAMPAIGNS = [
  {
    id: 'mock-campaign-1',
    name: 'Development Test Campaign',
    description: 'This is a mock campaign shown when Redis is unavailable',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system'
  }
];

export const MOCK_PROJECTS = [
  {
    id: 'mock-project-1',
    name: 'Development Test Project',
    description: 'This is a mock project shown when Redis is unavailable',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system'
  }
];

/**
 * Check if Redis error is a connection error
 */
export function isRedisConnectionError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message || error.toString();
  return (
    errorMessage.includes('ENOTFOUND') ||
    errorMessage.includes('fetch failed') ||
    errorMessage.includes('unified-bluegill-48912.upstash.io') ||
    errorMessage.includes('getaddrinfo')
  );
}

/**
 * Log Redis error with helpful context
 */
export function logRedisError(context: string, error: any) {
  if (isRedisConnectionError(error)) {
    console.error(`\n⚠️  Redis Connection Error in ${context}`);
    console.error('The Redis/Upstash instance is unreachable.');
    console.error('Error:', error.message);
    console.error('\nTo fix this:');
    console.error('1. Check your Upstash dashboard: https://console.upstash.com/');
    console.error('2. Update REDIS_URL in .env.local and Vercel');
    console.error('3. Or use mock data for local development\n');
  } else {
    console.error(`Redis error in ${context}:`, error);
  }
} 