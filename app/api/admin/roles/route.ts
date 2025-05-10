import { NextRequest, NextResponse } from 'next/server'
import { listRoles, setRole, ROLES, Role } from '@/lib/roles'

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