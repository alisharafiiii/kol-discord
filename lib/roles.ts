import { redis } from './redis'

// Define the allowed role labels in a single place so both server and client code can share the same list (client code should `import type` only).
export const ROLES = ['admin', 'core', 'scout', 'viewer'] as const
export type Role = typeof ROLES[number]

const ROLE_HASH_KEY = 'walletRoles'

/**
 * Persist (or update) a role assignment for a specific wallet address.
 */
export async function setRole(wallet: string, role: Role): Promise<void> {
  if (!wallet) throw new Error('wallet is required')
  if (!ROLES.includes(role)) throw new Error(`invalid role: ${role}`)
  // Normalise wallet addresses to lowercase so look-ups are consistent.
  const key = wallet.trim()
  await redis.hset(ROLE_HASH_KEY, { [key]: role })
}

/**
 * Fetch the role for a given wallet address. Returns `null` when no assignment exists.
 */
export async function getRole(wallet: string): Promise<Role | null> {
  if (!wallet) return null
  const key = wallet.trim()
  const role = (await redis.hget(ROLE_HASH_KEY, key)) as Role | null
  return role
}

/**
 * Convenience that always returns a valid role, defaulting to `viewer` when none is stored.
 */
export async function getRoleOrDefault(wallet: string): Promise<Role> {
  const role = await getRole(wallet)
  return role ?? 'viewer'
}

/**
 * Return the whole role list as an array of `{ wallet, role }` objects – handy for admin screens.
 */
export async function listRoles(): Promise<Array<{ wallet: string; role: Role }>> {
  const map = (await redis.hgetall(ROLE_HASH_KEY)) as Record<string, Role>
  return Object.entries(map).map(([wallet, role]) => ({ wallet, role }))
} 