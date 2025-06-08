'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'

export default function TestSessionPage() {
  const { data: session, status } = useSession()
  const [debugInfo, setDebugInfo] = useState<any>({})
  
  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        const res = await fetch('/api/debug/campaigns-access')
        const data = await res.json()
        setDebugInfo(data)
      } catch (error) {
        setDebugInfo({ error: 'Failed to fetch debug info' })
      }
    }
    
    if (session) {
      fetchDebugInfo()
    }
  }, [session])
  
  return (
    <div className="min-h-screen bg-black text-green-300 font-sans p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Session Debug Info</h1>
        
        <div className="mb-6 p-4 border border-green-300">
          <h2 className="text-xl mb-2">Session Status: {status}</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>
        
        <div className="mb-6 p-4 border border-green-300">
          <h2 className="text-xl mb-2">Session Details</h2>
          <p>User Name: {session?.user?.name || 'Not found'}</p>
          <p>Twitter Handle: {(session as any)?.twitterHandle || 'Not found'}</p>
          <p>Email: {session?.user?.email || 'Not found'}</p>
        </div>
        
        <div className="mb-6 p-4 border border-green-300">
          <h2 className="text-xl mb-2">Debug API Response</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
} 