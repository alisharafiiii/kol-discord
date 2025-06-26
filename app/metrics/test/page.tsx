'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'

export default function MetricsTestPage() {
  const { data: session, status } = useSession()
  const [authTest, setAuthTest] = useState<any>(null)
  const [metricsTest, setMetricsTest] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status !== 'loading') {
      testAuth()
    }
  }, [status])

  const testAuth = async () => {
    try {
      const res = await fetch('/api/metrics/auth-test')
      const data = await res.json()
      setAuthTest(data)
    } catch (error) {
      console.error('Auth test error:', error)
    }
  }

  const testMetrics = async () => {
    try {
      setError('')
      const res = await fetch('/api/metrics?campaign=default')
      if (!res.ok) {
        const errorData = await res.text()
        setError(`Error ${res.status}: ${errorData}`)
        return
      }
      const data = await res.json()
      setMetricsTest(data)
    } catch (error) {
      setError(`Failed to fetch metrics: ${error}`)
    }
  }

  const testShare = async () => {
    try {
      setError('')
      const res = await fetch('/api/metrics/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: 'default' })
      })
      if (!res.ok) {
        const errorData = await res.text()
        setError(`Share Error ${res.status}: ${errorData}`)
        return
      }
      const data = await res.json()
      alert(`Share link created! ID: ${data.shareId}`)
    } catch (error) {
      setError(`Failed to create share link: ${error}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Metrics Authentication Test</h1>

        {/* Session Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Current Session</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            {JSON.stringify({ status, session }, null, 2)}
          </pre>
        </div>

        {/* Auth Test */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Auth Test Result</h2>
          <button
            onClick={testAuth}
            className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Test Auth Endpoint
          </button>
          {authTest && (
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
              {JSON.stringify(authTest, null, 2)}
            </pre>
          )}
        </div>

        {/* Metrics Test */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Metrics Access Test</h2>
          <div className="space-x-2 mb-4">
            <button
              onClick={testMetrics}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Test Metrics Fetch
            </button>
            <button
              onClick={testShare}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Test Share Creation
            </button>
          </div>
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          {metricsTest && (
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
              {JSON.stringify(metricsTest, null, 2)}
            </pre>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">What to check:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Verify your session shows a role (admin, core, hunter, kol, etc.)</li>
            <li>Check if "canViewMetrics" is true in the auth test</li>
            <li>Test fetching metrics - should work if you have view permissions</li>
            <li>Test creating share link - should work if you have view permissions</li>
          </ol>
          <p className="mt-4 text-sm text-gray-600">
            If you're getting 401/403 errors, your account may not have the required role assigned.
          </p>
        </div>
      </div>
    </div>
  )
} 