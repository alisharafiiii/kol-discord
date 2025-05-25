import { NextRequest, NextResponse } from 'next/server'
import { listRoles, setRole, ROLES, Role } from '@/lib/roles'
import { redis } from '@/lib/redis'

export async function GET() {
  try {
    const roles = await listRoles()
    return NextResponse.json(roles)
  } catch (error) {
    console.error('Error fetching roles', error)
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { wallet, role } = await request.json() as { wallet?: string; role?: Role }
    if (!wallet || !role || !ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid wallet or role' }, { status: 400 })
    }
    await setRole(wallet, role)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving role', error)
    return NextResponse.json({ error: 'Failed to save role' }, { status: 500 })
  }
}

// DELETE /api/admin/roles?wallet=<addr>
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');
    if (!wallet) {
      return NextResponse.json({ error: 'wallet param required' }, { status: 400 });
    }
    const rawKey = wallet.trim();
    const normalisedKey = rawKey.startsWith('0x') ? rawKey.toLowerCase() : rawKey;
    await redis.hdel('walletRoles', normalisedKey);
    await redis.hdel('walletRoles', rawKey);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting role', error);
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
  }
} 