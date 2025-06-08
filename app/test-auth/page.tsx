'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

export default function TestAuthPage() {
  const { data: session, status } = useSession()
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Fetch debug info from our API
    fetch('/api/debug/check-my-session')
      .then(res => res.json())
      .then(data => {
        setDebugInfo(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching debug info:', err)
        setLoading(false)
      })
  }, [])
  
  return (
    <div className="min-h-screen bg-black text-white p-8 font-mono">
      <h1 className="text-2xl mb-8">Authentication Test Page</h1>
      
      <div className="space-y-6">
        {/* Client-side session info */}
        <div className="border border-gray-700 p-4 rounded">
          <h2 className="text-xl mb-4 text-blue-400">Client-Side Session</h2>
          <p>Status: <span className={status === 'authenticated' ? 'text-green-400' : 'text-red-400'}>{status}</span></p>
          {session && (
            <div className="mt-2 text-sm">
              <p>User Name: {session.user?.name || 'N/A'}</p>
              <p>User Email: {session.user?.email || 'N/A'}</p>
              <p>Provider: {(session as any).provider || 'N/A'}</p>
              <p>Twitter Handle: {(session as any).twitterHandle || 'N/A'}</p>
            </div>
          )}
        </div>
        
        {/* Server-side debug info */}
        <div className="border border-gray-700 p-4 rounded">
          <h2 className="text-xl mb-4 text-yellow-400">Server-Side Debug Info</h2>
          {loading ? (
            <p>Loading...</p>
          ) : debugInfo ? (
            <div className="text-sm space-y-2">
              <p>Authenticated: <span className={debugInfo.authenticated ? 'text-green-400' : 'text-red-400'}>{String(debugInfo.authenticated)}</span></p>
              
              {debugInfo.session && (
                <div className="mt-2">
                  <p className="font-bold">Session Data:</p>
                  <p>Twitter Handle: <span className="text-cyan-400">{debugInfo.session.twitterHandle || 'NOT SET'}</span></p>
                  <p>User Name: {debugInfo.session.userName || 'N/A'}</p>
                  <p>Provider: {debugInfo.session.provider || 'N/A'}</p>
                </div>
              )}
              
              {debugInfo.userProfile && (
                <div className="mt-2">
                  <p className="font-bold">User Profile in Redis:</p>
                  <p>ID: {debugInfo.userProfile.id}</p>
                  <p>Role: <span className="text-green-400">{debugInfo.userProfile.role || 'none'}</span></p>
                  <p>Approval Status: {debugInfo.userProfile.approvalStatus}</p>
                  <p>Twitter Handle: @{debugInfo.userProfile.twitterHandle}</p>
                </div>
              )}
              
              <p className="mt-2">Computed Role: <span className="text-purple-400">{debugInfo.computedRole || 'none'}</span></p>
              
              {debugInfo.debug && (
                <div className="mt-2">
                  <p className="font-bold">Debug Details:</p>
                  <p>Has Twitter Handle: {String(debugInfo.debug.hasTwitterHandle)}</p>
                  <p>Raw Handle Value: "{debugInfo.debug.rawHandle}"</p>
                  <p>Session Keys: {debugInfo.debug.sessionKeys.join(', ')}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-red-400">Failed to load debug info</p>
          )}
        </div>
        
        {/* Instructions */}
        <div className="border border-gray-700 p-4 rounded">
          <h2 className="text-xl mb-4 text-green-400">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Make sure you're logged in with Twitter</li>
            <li>Your Twitter handle should appear above</li>
            <li>For @nabulines and @sharafi_eth, the role should show as "admin"</li>
            <li>If the role is not "admin", the setup script needs to be run</li>
            <li>If Twitter handle is "NOT SET", there's an issue with the auth callback</li>
          </ol>
        </div>
        
        {/* Quick actions */}
        <div className="border border-gray-700 p-4 rounded">
          <h2 className="text-xl mb-4 text-purple-400">Quick Actions</h2>
          <div className="space-x-4">
            <a 
              href="/api/auth/signin" 
              className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              Sign In with Twitter
            </a>
            <a 
              href="/api/auth/signout" 
              className="inline-block px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
            >
              Sign Out
            </a>
            <a 
              href="/admin" 
              className="inline-block px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
            >
              Try Admin Panel
            </a>
          </div>
        </div>
      </div>
    </div>
  )
} 