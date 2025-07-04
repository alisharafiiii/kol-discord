'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Trophy, Users, Twitter, RefreshCw, Settings, Activity, Plus, Trash2, FileText, TrendingUp } from 'lucide-react'

interface Tweet {
  id: string
  tweetId: string
  submitterDiscordId: string
  submittedAt: string
  category?: string
  url: string
  authorHandle: string
  metrics?: {
    likes: number
    retweets: number
    replies: number
  }
}

interface LeaderboardEntry {
  discordId: string
  twitterHandle: string
  tier: string
  totalPoints: number
  weeklyPoints: number
  rank: number
}

interface PointRule {
  id: string
  tier: number
  interactionType: 'like' | 'retweet' | 'reply'
  points: number
}

interface BatchJob {
  id: string
  startedAt: string
  completedAt?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  tweetsProcessed: number
  engagementsFound: number
  error?: string
}

interface TierConfig {
  tier: string
  displayName: string
  multiplier: number
  submissionCost: number
  dailyTweetLimit: number
}

interface OptedInUser {
  discordId: string
  twitterHandle: string
  discordUsername?: string
  discordServers?: string[]
  tier: string
  totalPoints: number
  profilePicture?: string
  tweetsSubmitted: number
  totalLikes: number
  totalRetweets: number
  totalComments: number
}

interface PointTransaction {
  id: string
  userId: string
  userName: string
  points: number
  action: string
  timestamp: string
  description: string
}

export default function EngagementAdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState<'overview' | 'tweets' | 'leaderboard' | 'settings'>('overview')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Data states
  const [stats, setStats] = useState({
    totalTweets: 0,
    todayTweets: 0,
    totalEngagements: 0,
    activeUsers: 0
  })
  const [tweets, setTweets] = useState<Tweet[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [rules, setRules] = useState<PointRule[]>([])
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([])
  
  // Settings tab states
  const [tierConfigs, setTierConfigs] = useState<TierConfig[]>([
    { tier: 'micro', displayName: 'MICRO', multiplier: 1.0, submissionCost: 50, dailyTweetLimit: 3 },
    { tier: 'rising', displayName: 'RISING', multiplier: 1.5, submissionCost: 75, dailyTweetLimit: 5 },
    { tier: 'star', displayName: 'STAR', multiplier: 2.0, submissionCost: 100, dailyTweetLimit: 7 },
    { tier: 'legend', displayName: 'LEGEND', multiplier: 2.5, submissionCost: 150, dailyTweetLimit: 10 },
    { tier: 'hero', displayName: 'HERO', multiplier: 3.0, submissionCost: 200, dailyTweetLimit: 15 }
  ])
  const [optedInUsers, setOptedInUsers] = useState<OptedInUser[]>([])
  const [recentTransactions, setRecentTransactions] = useState<PointTransaction[]>([])
  const [savingTiers, setSavingTiers] = useState(false)
  
  // Add refs to track component state and prevent unnecessary refreshes
  const isComponentMounted = useRef(true)
  const lastFetchTime = useRef<number>(0)
  const fetchInterval = useRef<NodeJS.Timeout | null>(null)
  
  // Minimum time between fetches (in milliseconds)
  const FETCH_COOLDOWN = 5000 // 5 seconds
  
  useEffect(() => {
    return () => {
      isComponentMounted.current = false
      if (fetchInterval.current) {
        clearInterval(fetchInterval.current)
      }
    }
  }, [])
  
  // Handle visibility change to prevent unnecessary refreshes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[Engagement Admin] Page hidden, pausing updates')
        if (fetchInterval.current) {
          clearInterval(fetchInterval.current)
          fetchInterval.current = null
        }
      } else {
        console.log('[Engagement Admin] Page visible, resuming updates if needed')
        // Only fetch if enough time has passed since last fetch
        const timeSinceLastFetch = Date.now() - lastFetchTime.current
        if (timeSinceLastFetch > FETCH_COOLDOWN) {
          fetchData()
        }
        // Restart periodic updates
        startPeriodicUpdates()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin')
    } else if (session) {
      // Check if user has admin role
      const userRole = (session as any).role || (session.user as any)?.role
      console.log('[Engagement Admin] User role:', userRole, 'Session:', session)
      
      if (!['admin', 'core'].includes(userRole)) {
        router.push('/')
      } else {
        // Only fetch data if it hasn't been loaded yet
        fetchData()
        startPeriodicUpdates()
      }
    }
  }, [session, status, router])
  
  const startPeriodicUpdates = useCallback(() => {
    // Clear any existing interval
    if (fetchInterval.current) {
      clearInterval(fetchInterval.current)
    }
    
    // Set up periodic updates for recent tweets
    fetchInterval.current = setInterval(() => {
      if (!document.hidden && isComponentMounted.current) {
        console.log('[Engagement Admin] Periodic update: fetching recent tweets')
        fetchRecentTweets()
      }
    }, 30000) // Update every 30 seconds
  }, [])
  
  const fetchRecentTweets = async () => {
    try {
      const tweetsRes = await fetch('/api/engagement/tweets')
      if (tweetsRes.ok) {
        const data = await tweetsRes.json()
        if (isComponentMounted.current) {
          setTweets(data.tweets || [])
          console.log('[Engagement Admin] Updated tweets:', data.tweets?.length || 0)
        }
      }
    } catch (error) {
      console.error('[Engagement Admin] Error fetching recent tweets:', error)
    }
  }
  
  const fetchData = async () => {
    // Prevent too frequent fetches
    const timeSinceLastFetch = Date.now() - lastFetchTime.current
    if (timeSinceLastFetch < FETCH_COOLDOWN && lastFetchTime.current > 0) {
      console.log('[Engagement Admin] Skipping fetch, too soon since last fetch')
      return
    }
    
    lastFetchTime.current = Date.now()
    setLoading(true)
    console.log('[Engagement Admin] Fetching all data...')
    
    try {
      // Fetch tweets
      const tweetsRes = await fetch('/api/engagement/tweets')
      if (tweetsRes.ok) {
        const data = await tweetsRes.json()
        setTweets(data.tweets || [])
        console.log('[Engagement Admin] Fetched tweets:', data.tweets?.length || 0)
      }
      
      // Fetch leaderboard
      const leaderboardRes = await fetch('/api/engagement/leaderboard?limit=20')
      if (leaderboardRes.ok) {
        const data = await leaderboardRes.json()
        setLeaderboard(data.leaderboard || [])
      }
      
      // Fetch rules
      const rulesRes = await fetch('/api/engagement/rules')
      if (rulesRes.ok) {
        const data = await rulesRes.json()
        setRules(data.rules || [])
      }
      
      // Fetch batch jobs
      const jobsRes = await fetch('/api/engagement/batch')
      if (jobsRes.ok) {
        const data = await jobsRes.json()
        setBatchJobs(data.jobs || [])
      }
      
      // Fetch opted-in users
      await fetchOptedInUsers()
      
      // Fetch recent transactions
      await fetchRecentTransactions()
      
      // Calculate stats
      await fetchStats()
    } catch (error) {
      console.error('[Engagement Admin] Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/engagement/tweets?hours=24', {
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        const todayTweets = data.tweets.filter((t: Tweet) => {
          const tweetDate = new Date(t.submittedAt)
          const today = new Date()
          return tweetDate.toDateString() === today.toDateString()
        }).length
        
        setStats({
          totalTweets: data.tweets.length,
          todayTweets,
          totalEngagements: 0, // Calculate from tweets
          activeUsers: new Set(data.tweets.map((t: Tweet) => t.submitterDiscordId)).size
        })
      }
    } catch (error) {
      console.error('[Engagement Admin] Error fetching stats:', error)
    }
  }
  
  const fetchOptedInUsers = async () => {
    try {
      const res = await fetch('/api/engagement/opted-in-users', {
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        setOptedInUsers(data.users || [])
      }
    } catch (error) {
      console.error('[Engagement Admin] Error fetching opted-in users:', error)
    }
  }
  
  const fetchRecentTransactions = async () => {
    try {
      const res = await fetch('/api/engagement/transactions?limit=50', {
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        setRecentTransactions(data.transactions || [])
      }
    } catch (error) {
      console.error('[Engagement Admin] Error fetching transactions:', error)
    }
  }
  
  const runBatchJob = async () => {
    setRefreshing(true)
    console.log('[Engagement Admin] Creating batch job...')
    
    try {
      // Include session information in the request headers
      const res = await fetch('/api/engagement/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include' // Ensure cookies are sent
      })
      
      console.log('[Engagement Admin] Batch job response:', res.status, res.statusText)
      
      if (res.ok) {
        const data = await res.json()
        alert(`Batch job created successfully! ${data.message}`)
        // Refresh batch jobs after a delay
        setTimeout(() => fetchData(), 2000)
      } else {
        const data = await res.json()
        console.error('[Engagement Admin] Batch job error:', data)
        alert(data.error || 'Failed to create batch job')
      }
    } catch (error) {
      console.error('[Engagement Admin] Error creating batch job:', error)
      alert('Failed to create batch job')
    } finally {
      setRefreshing(false)
    }
  }
  
  const deleteTweet = async (tweetId: string) => {
    if (!confirm('Are you sure you want to delete this tweet?')) return
    
    try {
      const res = await fetch(`/api/engagement/tweets?id=${tweetId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (res.ok) {
        setTweets(tweets.filter(t => t.id !== tweetId))
      } else {
        alert('Failed to delete tweet')
      }
    } catch (error) {
      console.error('[Engagement Admin] Error deleting tweet:', error)
      alert('Failed to delete tweet')
    }
  }
  
  const updateRule = async (tier: number, interactionType: string, points: number) => {
    try {
      const res = await fetch('/api/engagement/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, interactionType, points }),
        credentials: 'include'
      })
      
      if (res.ok) {
        fetchData() // Refresh rules
      } else {
        alert('Failed to update rule')
      }
    } catch (error) {
      console.error('[Engagement Admin] Error updating rule:', error)
      alert('Failed to update rule')
    }
  }
  
  const setupDefaultRules = async () => {
    try {
      const res = await fetch('/api/engagement/rules?action=setup-defaults', {
        method: 'PUT',
        credentials: 'include'
      })
      
      if (res.ok) {
        alert('Default rules created')
        fetchData()
      } else {
        alert('Failed to setup default rules')
      }
    } catch (error) {
      console.error('[Engagement Admin] Error setting up default rules:', error)
      alert('Failed to setup default rules')
    }
  }
  
  const saveTierConfigurations = async () => {
    setSavingTiers(true)
    try {
      const res = await fetch('/api/engagement/tier-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiers: tierConfigs }),
        credentials: 'include'
      })
      
      if (res.ok) {
        alert('Tier configurations saved successfully')
      } else {
        alert('Failed to save tier configurations')
      }
    } catch (error) {
      console.error('[Engagement Admin] Error saving tier configurations:', error)
      alert('Failed to save tier configurations')
    } finally {
      setSavingTiers(false)
    }
  }
  
  const updateTierConfig = (index: number, field: keyof TierConfig, value: any) => {
    const newConfigs = [...tierConfigs]
    newConfigs[index] = { ...newConfigs[index], [field]: value }
    setTierConfigs(newConfigs)
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-black p-8 flex items-center justify-center">
        <div className="text-green-300">Loading engagement data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-green-300">Twitter Engagement Tracker</h1>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700"
          >
            Back to Admin
          </button>
        </div>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3 text-green-400 mb-2">
              <FileText className="w-5 h-5" />
              <span className="text-sm">Total Tweets</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalTweets}</p>
          </div>
          
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3 text-blue-400 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm">Today's Tweets</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.todayTweets}</p>
          </div>
          
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3 text-purple-400 mb-2">
              <Users className="w-5 h-5" />
              <span className="text-sm">Active Users</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.activeUsers}</p>
          </div>
          
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3 text-orange-400 mb-2">
              <Activity className="w-5 h-5" />
              <span className="text-sm">Last Batch</span>
            </div>
            <p className="text-sm text-white">
              {batchJobs[0] ? new Date(batchJobs[0].startedAt).toLocaleString() : 'Never'}
            </p>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-700 overflow-x-auto">
          {['overview', 'tweets', 'leaderboard', 'settings'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`pb-2 px-1 capitalize whitespace-nowrap ${
                activeTab === tab
                  ? 'text-green-300 border-b-2 border-green-300'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        {/* Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-300 mb-4">Quick Actions</h2>
              <div className="flex gap-4">
                <button
                  onClick={runBatchJob}
                  disabled={refreshing}
                  className="px-4 py-2 bg-green-900 text-green-100 rounded hover:bg-green-800 disabled:opacity-50 flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Create Batch Job
                </button>
                <button
                  onClick={setupDefaultRules}
                  className="px-4 py-2 bg-gray-800 text-gray-100 rounded hover:bg-gray-700 flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Setup Default Rules
                </button>
                <button
                  onClick={fetchRecentTweets}
                  className="px-4 py-2 bg-blue-900 text-blue-100 rounded hover:bg-blue-800 flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Tweets
                </button>
              </div>
            </div>
            
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-300 mb-4">Recent Batch Jobs</h2>
              {batchJobs.length === 0 ? (
                <p className="text-gray-400">No batch jobs found</p>
              ) : (
                <div className="space-y-2">
                  {batchJobs.slice(0, 5).map(job => (
                    <div key={job.id} className="flex justify-between items-center p-3 bg-gray-800 rounded">
                      <div>
                        <p className="text-sm text-white">Started: {new Date(job.startedAt).toLocaleString()}</p>
                        <p className="text-xs text-gray-400">
                          Status: <span className={job.status === 'completed' ? 'text-green-400' : 'text-yellow-400'}>{job.status}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-white">{job.tweetsProcessed} tweets</p>
                        <p className="text-xs text-gray-400">{job.engagementsFound} engagements</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'tweets' && (
          <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Author</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Metrics</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Submitted</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {tweets.map(tweet => (
                  <tr key={tweet.id}>
                    <td className="px-4 py-3 text-sm text-white">@{tweet.authorHandle}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{tweet.category || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {tweet.metrics ? (
                        <span>❤️ {tweet.metrics.likes} 🔁 {tweet.metrics.retweets} 💬 {tweet.metrics.replies}</span>
                      ) : (
                        <span className="text-gray-500">Not checked</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {new Date(tweet.submittedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <a 
                        href={tweet.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300"
                      >
                        View →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {activeTab === 'leaderboard' && (
          <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Twitter</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tier</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Total Points</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Weekly Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {leaderboard.map(entry => (
                  <tr key={entry.discordId}>
                    <td className="px-4 py-3 text-sm font-bold text-white">#{entry.rank}</td>
                    <td className="px-4 py-3 text-sm text-white">@{entry.twitterHandle}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">Level {entry.tier}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-400">{entry.totalPoints}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{entry.weeklyPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div className="space-y-8">
            {/* Tiers & Multipliers Section */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-green-300">Tiers & Multipliers</h2>
                <button
                  onClick={saveTierConfigurations}
                  disabled={savingTiers}
                  className="px-4 py-2 bg-green-900 text-green-100 rounded hover:bg-green-800 disabled:opacity-50"
                >
                  {savingTiers ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
              
              <div className="space-y-4">
                {tierConfigs.map((config, index) => (
                  <div key={config.tier} className="grid grid-cols-5 gap-4 p-4 bg-gray-800 rounded-lg">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Tier</label>
                      <p className="text-white font-semibold">{config.displayName}</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Multiplier</label>
                      <input
                        type="number"
                        step="0.1"
                        value={config.multiplier}
                        onChange={(e) => updateTierConfig(index, 'multiplier', parseFloat(e.target.value))}
                        className="w-full px-2 py-1 bg-black border border-gray-600 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Submission Cost</label>
                      <input
                        type="number"
                        value={config.submissionCost}
                        onChange={(e) => updateTierConfig(index, 'submissionCost', parseInt(e.target.value))}
                        className="w-full px-2 py-1 bg-black border border-gray-600 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Daily Limit</label>
                      <input
                        type="number"
                        value={config.dailyTweetLimit}
                        onChange={(e) => updateTierConfig(index, 'dailyTweetLimit', parseInt(e.target.value))}
                        className="w-full px-2 py-1 bg-black border border-gray-600 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Points per Action</label>
                      <div className="text-xs text-gray-300">
                        L: {Math.round(10 * config.multiplier)}, 
                        RT: {Math.round(20 * config.multiplier)}, 
                        C: {Math.round(30 * config.multiplier)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Opted-In User List Section */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-300 mb-6">Opted-In Users</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Discord Servers</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tier</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Points</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tweets</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Engagement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {optedInUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                          No opted-in users found
                        </td>
                      </tr>
                    ) : (
                      optedInUsers.map(user => (
                        <tr key={user.discordId}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {user.profilePicture && (
                                <img 
                                  src={user.profilePicture} 
                                  alt={user.twitterHandle}
                                  className="w-8 h-8 rounded-full"
                                />
                              )}
                              <div>
                                <p className="text-sm text-white">@{user.twitterHandle}</p>
                                {user.discordUsername && (
                                  <p className="text-xs text-gray-400">{user.discordUsername}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">
                            {user.discordServers?.join(', ') || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">{user.tier.toUpperCase()}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-400">{user.totalPoints}</td>
                          <td className="px-4 py-3 text-sm text-gray-300">{user.tweetsSubmitted}</td>
                          <td className="px-4 py-3 text-sm text-gray-300">
                            <span title="Likes">❤️ {user.totalLikes}</span>{' '}
                            <span title="Retweets">🔁 {user.totalRetweets}</span>{' '}
                            <span title="Comments">💬 {user.totalComments}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Recent Points Transactions Section */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-300 mb-6">Recent Points Transactions</h2>
              
              <div className="space-y-2">
                {recentTransactions.length === 0 ? (
                  <p className="text-gray-400">No recent transactions</p>
                ) : (
                  recentTransactions.map(transaction => (
                    <div key={transaction.id} className="flex justify-between items-center p-3 bg-gray-800 rounded">
                      <div className="flex items-center gap-3">
                        <div className={`px-2 py-1 rounded text-xs font-semibold ${
                          transaction.points > 0 ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                        }`}>
                          {transaction.points > 0 ? '+' : ''}{transaction.points}
                        </div>
                        <div>
                          <p className="text-sm text-white">{transaction.userName}</p>
                          <p className="text-xs text-gray-400">{transaction.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">{transaction.action}</p>
                        <p className="text-xs text-gray-500">{new Date(transaction.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 