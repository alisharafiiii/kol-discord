'use client'

import { useEffect, useState } from 'react'
import { Session } from 'next-auth'
import { Award, TrendingUp, Clock, Volume2, VolumeX } from 'lucide-react'
import PixelChart from './PixelChart'
import { playSound, toggleSound, isSoundEnabled } from '@/lib/pixel-sounds'

interface DashboardData {
  user: {
    discordId: string
    twitterHandle: string
    profilePicture: string
    totalPoints: number
    tier: string
  }
  weeklyPoints: {
    date: string
    points: number
  }[]
  recentTransactions: {
    id: string
    action: string
    points: number
    timestamp: string
    description: string
  }[]
}

interface PixelDashboardProps {
  session: Session
}

export default function PixelDashboard({ session }: PixelDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load sound preference
    setSoundEnabled(isSoundEnabled())
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/dashboard/data', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (res.ok) {
        const data = await res.json()
        setDashboardData(data)
        playSound('success')
      } else {
        const errorData = await res.json()
        console.error('Dashboard API error:', errorData)
        setError(errorData.error || `Error: ${res.status}`)
        playSound('error')
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setError('Failed to connect to server')
      playSound('error')
    } finally {
      setLoading(false)
    }
  }

  const handleSoundToggle = () => {
    toggleSound()
    setSoundEnabled(!soundEnabled)
    playSound('click')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="pixel-container">
          <div className="pixel-loader">
            <div className="pixel-block"></div>
            <div className="pixel-block"></div>
            <div className="pixel-block"></div>
          </div>
          <p className="pixel-text text-green-300 mt-4">LOADING DASHBOARD...</p>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="pixel-container pixel-border p-8 max-w-md">
          <p className="pixel-text text-red-400 mb-4">ERROR: UNABLE TO LOAD DATA</p>
          {error && (
            <div className="text-center">
              <p className="pixel-text text-sm text-gray-400 mb-4">{error}</p>
              {error === 'Discord account not linked' && (
                <p className="pixel-text text-xs text-green-300">
                  Please link your Discord account first by using /connect in Discord
                </p>
              )}
              {error === 'Unauthorized' && (
                <p className="pixel-text text-xs text-green-300">
                  Please login with Twitter/X to continue
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const { user, weeklyPoints, recentTransactions } = dashboardData

  return (
    <div className="min-h-screen bg-black p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="pixel-text text-3xl text-green-300 pixel-glow">POINTS DASHBOARD</h1>
          
          {/* Sound toggle */}
          <button
            onClick={handleSoundToggle}
            className="pixel-button p-3 bg-gray-900 hover:bg-gray-800"
            title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
          >
            {soundEnabled ? (
              <Volume2 className="w-5 h-5 text-green-300" />
            ) : (
              <VolumeX className="w-5 h-5 text-gray-500" />
            )}
          </button>
        </div>

        {/* User Info Card */}
        <div className="pixel-container pixel-border bg-gray-900 p-6 mb-8 pixel-hover-grow">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
            {/* Profile Picture */}
            <div className="relative">
              <div className="pixel-avatar-frame">
                <img 
                  src={user.profilePicture} 
                  alt={user.twitterHandle}
                  className="w-20 h-20 pixel-avatar"
                />
              </div>
              <div className={`pixel-tier-badge ${user.tier}`}>
                {user.tier.toUpperCase()}
              </div>
            </div>
            
            {/* User Details */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="pixel-text text-xl text-white mb-1">@{user.twitterHandle}</h2>
              <p className="pixel-text text-sm text-gray-400">Discord ID: {user.discordId}</p>
            </div>
            
            {/* Points Display */}
            <div className="text-center md:text-right">
              <div className="flex items-center gap-2 mb-1 justify-center md:justify-end">
                <Award className="w-6 h-6 text-yellow-400 pixel-spin" />
                <span className="pixel-text text-2xl md:text-3xl text-yellow-400 font-bold pixel-number">
                  {user.totalPoints.toLocaleString()}
                </span>
              </div>
              <p className="pixel-text text-sm text-gray-400">TOTAL POINTS</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          {/* Weekly Activity Chart */}
          <div className="pixel-container pixel-border bg-gray-900 p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-green-300" />
              <h3 className="pixel-text text-lg text-green-300">WEEKLY ACTIVITY</h3>
            </div>
            
            <PixelChart data={weeklyPoints} />
          </div>

          {/* Recent Transactions */}
          <div className="pixel-container pixel-border bg-gray-900 p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-blue-300" />
              <h3 className="pixel-text text-lg text-blue-300">RECENT ACTIVITY</h3>
            </div>
            
            <div className="space-y-2 md:space-y-3 max-h-48 md:max-h-64 overflow-y-auto pixel-scrollbar">
              {recentTransactions.length === 0 ? (
                <p className="pixel-text text-gray-500 text-center py-8">NO RECENT ACTIVITY</p>
              ) : (
                recentTransactions.map((transaction) => (
                  <div 
                    key={transaction.id} 
                    className="pixel-transaction-item flex flex-col md:flex-row justify-between items-start md:items-center p-2 md:p-3 bg-black rounded gap-2"
                  >
                    <div className="flex-1">
                      <p className="pixel-text text-xs md:text-sm text-white">{transaction.description}</p>
                      <p className="pixel-text text-xs text-gray-500">
                        {new Date(transaction.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-left md:text-right">
                      <span className={`pixel-text text-sm md:text-base font-bold ${
                        transaction.points > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {transaction.points > 0 ? '+' : ''}{transaction.points}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="pixel-text text-xs text-gray-500">
            POWERED BY NABULINES • RETRO GAMING VIBES
          </p>
        </div>
      </div>
    </div>
  )
} 