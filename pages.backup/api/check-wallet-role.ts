import { NextApiRequest, NextApiResponse } from 'next'
import { getRole, getRoleOrDefault } from '@/lib/roles'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { wallet } = req.query
    
    if (!wallet || typeof wallet !== 'string') {
      return res.status(400).json({ 
        error: 'A wallet address is required',
        success: false 
      })
    }

    // Get the wallet's role
    const role = await getRoleOrDefault(wallet)
    
    // Get all info about the wallet
    return res.status(200).json({ 
      success: true,
      wallet,
      role,
      isAdmin: role === 'admin',
      isCore: role === 'core',
      isScout: role === 'scout',
      isViewer: role === 'viewer',
      isAtLeastScout: ['admin', 'core', 'scout'].includes(role)
    })
  } catch (error) {
    console.error('Error checking wallet role:', error)
    return res.status(500).json({ 
      error: 'Failed to check wallet role',
      success: false 
    })
  }
} 