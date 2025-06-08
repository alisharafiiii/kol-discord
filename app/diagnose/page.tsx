'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

export default function DiagnosePage() {
  const { data: session, status } = useSession()
  const [diagnosis, setDiagnosis] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    if (status === 'loading') return;
    
    // Fetch server-side diagnosis
    fetch('/api/debug/diagnose-sharafi')
      .then(res => res.json())
      .then(data => {
        setDiagnosis(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error:', err)
        setLoading(false)
      })
  }, [status])
  
  return (
    <div className="min-h-screen bg-black text-white p-8 font-mono">
      <h1 className="text-3xl mb-8 text-red-400">🔍 Authentication Diagnosis</h1>
      
      {/* Client-side session */}
      <div className="mb-8 border border-gray-700 p-4 rounded">
        <h2 className="text-xl mb-4 text-blue-400">1. Client-Side Session (Your Browser)</h2>
        <div className="space-y-2">
          <p>Status: <span className={status === 'authenticated' ? 'text-green-400' : 'text-red-400'}>{status}</span></p>
          {session && (
            <>
              <p>User Name: <span className="text-yellow-400">{session.user?.name || 'Not set'}</span></p>
              <p>Twitter Handle: <span className="text-cyan-400">{(session as any).twitterHandle || 'NOT SET'}</span></p>
              <p>Provider: {(session as any).provider || 'Not set'}</p>
              <p>Session Keys: {Object.keys(session).join(', ')}</p>
            </>
          )}
        </div>
      </div>
      
      {/* Server-side diagnosis */}
      {loading ? (
        <p>Loading server diagnosis...</p>
      ) : diagnosis ? (
        <>
          <div className="mb-8 border border-gray-700 p-4 rounded">
            <h2 className="text-xl mb-4 text-green-400">2. Redis Status</h2>
            <p>Redis Working: <span className={diagnosis.redisWorking ? 'text-green-400' : 'text-red-400'}>{String(diagnosis.redisWorking)}</span></p>
          </div>
          
          <div className="mb-8 border border-gray-700 p-4 rounded">
            <h2 className="text-xl mb-4 text-purple-400">3. Sharafi_eth User Profiles in Database</h2>
            <p className="mb-2">Total Profiles: {diagnosis.summary?.totalSharafiProfiles || 0}</p>
            <p className="mb-2">Admin Profiles: <span className="text-green-400">{diagnosis.summary?.adminProfiles || 0}</span></p>
            <p className="mb-4">User Profiles: <span className="text-red-400">{diagnosis.summary?.userProfiles || 0}</span></p>
            
            {diagnosis.sharafiProfiles?.map((profile: any, i: number) => (
              <div key={i} className="mb-2 ml-4 text-sm">
                <p>• {profile.key}: role=<span className={profile.role === 'admin' ? 'text-green-400' : 'text-red-400'}>{profile.role}</span>, handle={profile.twitterHandle}</p>
              </div>
            ))}
          </div>
          
          <div className="mb-8 border border-gray-700 p-4 rounded">
            <h2 className="text-xl mb-4 text-yellow-400">4. Role Lookup Results</h2>
            {Object.entries(diagnosis.roleResults || {}).map(([key, value]) => (
              <p key={key}>getRoleFromTwitterSession("{key}"): <span className={value === 'admin' ? 'text-green-400' : 'text-red-400'}>{String(value)}</span></p>
            ))}
          </div>
          
          {/* Diagnosis */}
          <div className="mb-8 border border-red-700 p-4 rounded">
            <h2 className="text-xl mb-4 text-red-400">5. Issue Analysis</h2>
            {status === 'authenticated' && (session as any).twitterHandle ? (
              <div>
                <p className="mb-2">✓ You are logged in as: <span className="text-cyan-400">{(session as any).twitterHandle}</span></p>
                {diagnosis.roleResults?.[(session as any).twitterHandle.replace('@', '')] === 'admin' ? (
                  <p className="text-green-400">✓ Your account has admin role in the database</p>
                ) : (
                  <p className="text-red-400">✗ Your account does NOT have admin role</p>
                )}
              </div>
            ) : (
              <p className="text-red-400">✗ You are not logged in with Twitter</p>
            )}
          </div>
        </>
      ) : (
        <p className="text-red-400">Failed to load diagnosis</p>
      )}
      
      {/* Actions */}
      <div className="border border-gray-700 p-4 rounded">
        <h2 className="text-xl mb-4">Actions</h2>
        <div className="space-x-4">
          {status !== 'authenticated' ? (
            <a href="/api/auth/signin" className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
              Sign In with Twitter
            </a>
          ) : (
            <>
              <a href="/force-logout" className="inline-block px-4 py-2 bg-red-600 hover:bg-red-700 rounded">
                Force Logout & Clear Session
              </a>
              <a href="/admin" className="inline-block px-4 py-2 bg-green-600 hover:bg-green-700 rounded">
                Try Admin Panel
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  )
} 