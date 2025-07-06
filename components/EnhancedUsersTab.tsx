'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Search, RefreshCw, ChevronLeft, ChevronRight, Award, Users as UsersIcon, TrendingUp, FileText } from 'lucide-react'

// Simple debounce implementation
function debounce<T extends (...args: any[]) => void>(func: T, delay: number): T {
  let timeoutId: NodeJS.Timeout | null = null
  
  return ((...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }) as T
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
  recentActivity?: {
    action: string
    points: number
    timestamp: string
  }[]
}

interface EnhancedUsersTabProps {
  onUserUpdate?: () => void
}

const USERS_PER_PAGE = 20

export function EnhancedUsersTab({ onUserUpdate }: EnhancedUsersTabProps) {
  const [users, setUsers] = useState<OptedInUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<OptedInUser[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [editedPoints, setEditedPoints] = useState<Record<string, number>>({})
  const [savingPoints, setSavingPoints] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'points' | 'tweets' | 'engagement'>('points')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Refs for performance optimization
  const searchInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      performSearch(term)
    }, 300),
    []
  )
  
  // Fetch users with pagination
  const fetchUsers = async (page: number = 1) => {
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController()
    
    setLoading(true)
    try {
      const res = await fetch(
        `/api/engagement/opted-in-users-enhanced?page=${page}&limit=${USERS_PER_PAGE}&sort=${sortBy}&order=${sortOrder}`,
        {
          credentials: 'include',
          signal: abortControllerRef.current.signal
        }
      )
      
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
        setTotalUsers(data.total || 0)
        setFilteredUsers(data.users || [])
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('[Enhanced Users Tab] Error fetching users:', error)
      }
    } finally {
      setLoading(false)
    }
  }
  
  // Perform search
  const performSearch = (term: string) => {
    if (!term.trim()) {
      setFilteredUsers(users)
      return
    }
    
    const searchLower = term.toLowerCase()
    const filtered = users.filter(user => 
      user.twitterHandle.toLowerCase().includes(searchLower) ||
      user.discordUsername?.toLowerCase().includes(searchLower) ||
      user.discordId.toLowerCase().includes(searchLower) ||
      user.discordServers?.some(server => server.toLowerCase().includes(searchLower))
    )
    
    setFilteredUsers(filtered)
  }
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    debouncedSearch(value)
  }
  
  // Handle sort change
  const handleSort = (field: 'points' | 'tweets' | 'engagement') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }
  
  // Adjust user points
  const adjustUserPoints = async (discordId: string) => {
    const newPoints = editedPoints[discordId]
    if (newPoints === undefined) return
    
    const user = filteredUsers.find(u => u.discordId === discordId)
    if (!user) return
    
    const pointDifference = newPoints - user.totalPoints
    if (pointDifference === 0) {
      setEditingUser(null)
      return
    }
    
    setSavingPoints(discordId)
    
    try {
      const res = await fetch('/api/engagement/adjust-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordId,
          points: pointDifference,
          reason: `Manual adjustment via admin panel`
        }),
        credentials: 'include'
      })
      
      if (res.ok) {
        // Update local state
        const updatedUsers = users.map(u => 
          u.discordId === discordId 
            ? { ...u, totalPoints: newPoints }
            : u
        )
        setUsers(updatedUsers)
        setFilteredUsers(updatedUsers.filter(u => 
          !searchTerm || 
          u.twitterHandle.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.discordUsername?.toLowerCase().includes(searchTerm.toLowerCase())
        ))
        
        setEditingUser(null)
        delete editedPoints[discordId]
        
        // Notify parent component
        onUserUpdate?.()
        
        // Show success message
        const successMsg = document.createElement('div')
        successMsg.className = 'fixed top-4 right-4 bg-green-900 text-green-100 px-4 py-2 rounded shadow-lg z-50'
        successMsg.textContent = `Updated @${user.twitterHandle}'s points to ${newPoints}`
        document.body.appendChild(successMsg)
        setTimeout(() => successMsg.remove(), 3000)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to adjust points')
      }
    } catch (error) {
      console.error('[Enhanced Users Tab] Error adjusting points:', error)
      alert('Failed to adjust points')
    } finally {
      setSavingPoints(null)
    }
  }
  
  // Calculate total pages
  const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE)
  
  // Get current page users
  const startIndex = searchTerm ? 0 : (currentPage - 1) * USERS_PER_PAGE
  const endIndex = searchTerm ? filteredUsers.length : startIndex + USERS_PER_PAGE
  const currentUsers = filteredUsers.slice(startIndex, endIndex)
  
  // Effects
  useEffect(() => {
    fetchUsers(currentPage)
  }, [currentPage, sortBy, sortOrder])
  
  useEffect(() => {
    // Reset to page 1 when search changes
    if (searchTerm) {
      setCurrentPage(1)
    }
  }, [searchTerm])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])
  
  return (
    <div className="space-y-6">
      {/* Header with search and stats */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-green-300">Engagement Users</h2>
            <p className="text-sm text-gray-400 mt-1">
              {searchTerm ? `${filteredUsers.length} results found` : `Total: ${totalUsers} users`}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Search Box */}
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search users, Discord ID, or servers..."
                className="w-full pl-10 pr-4 py-2 bg-black border border-gray-600 rounded text-white text-sm focus:border-green-400 focus:outline-none"
              />
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={() => fetchUsers(currentPage)}
              disabled={loading}
              className="px-4 py-2 bg-gray-800 text-gray-100 rounded hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-800 rounded p-3">
            <div className="flex items-center gap-2 text-green-400 mb-1">
              <Award className="w-4 h-4" />
              <span className="text-xs">Total Points</span>
            </div>
            <p className="text-lg font-bold text-white">
              {users.reduce((sum, user) => sum + user.totalPoints, 0).toLocaleString()}
            </p>
          </div>
          
          <div className="bg-gray-800 rounded p-3">
            <div className="flex items-center gap-2 text-blue-400 mb-1">
              <UsersIcon className="w-4 h-4" />
              <span className="text-xs">Active Users</span>
            </div>
            <p className="text-lg font-bold text-white">
              {users.filter(u => u.tweetsSubmitted > 0).length}
            </p>
          </div>
          
          <div className="bg-gray-800 rounded p-3">
            <div className="flex items-center gap-2 text-purple-400 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Avg Points</span>
            </div>
            <p className="text-lg font-bold text-white">
              {users.length > 0 ? Math.round(users.reduce((sum, user) => sum + user.totalPoints, 0) / users.length) : 0}
            </p>
          </div>
          
          <div className="bg-gray-800 rounded p-3">
            <div className="flex items-center gap-2 text-orange-400 mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-xs">Total Tweets</span>
            </div>
            <p className="text-lg font-bold text-white">
              {users.reduce((sum, user) => sum + user.tweetsSubmitted, 0)}
            </p>
          </div>
        </div>
      </div>
      
      {/* Users Table */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Discord Info</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tier/Role</th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-gray-300"
                  onClick={() => handleSort('points')}
                >
                  Points {sortBy === 'points' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-gray-300"
                  onClick={() => handleSort('tweets')}
                >
                  Tweets {sortBy === 'tweets' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-gray-300"
                  onClick={() => handleSort('engagement')}
                >
                  Engagement {sortBy === 'engagement' && (sortOrder === 'desc' ? '↓' : '↑')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Recent Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading && currentUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading users...
                  </td>
                </tr>
              ) : currentUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    {searchTerm ? 'No users found matching your search' : 'No users found'}
                  </td>
                </tr>
              ) : (
                currentUsers.map(user => (
                  <tr key={user.discordId} className="hover:bg-gray-800/50 transition-colors">
                    {/* User Info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {user.profilePicture && (
                          <img 
                            src={user.profilePicture} 
                            alt={user.twitterHandle}
                            className="w-10 h-10 rounded-full border border-gray-700"
                            loading="lazy"
                          />
                        )}
                        <div>
                          <a 
                            href={`https://twitter.com/${user.twitterHandle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-white hover:text-green-300"
                          >
                            @{user.twitterHandle}
                          </a>
                          {user.discordUsername && (
                            <p className="text-xs text-gray-400">{user.discordUsername}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    {/* Discord Info */}
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <p className="text-gray-400 font-mono">{user.discordId}</p>
                        {user.discordServers && user.discordServers.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {user.discordServers.slice(0, 3).map((server, i) => (
                              <span key={i} className="px-2 py-0.5 bg-gray-800 text-gray-300 rounded text-xs">
                                {server}
                              </span>
                            ))}
                            {user.discordServers.length > 3 && (
                              <span className="text-gray-500 text-xs">+{user.discordServers.length - 3} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Tier/Role */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                        user.tier === 'hero' ? 'bg-purple-900 text-purple-300' :
                        user.tier === 'legend' ? 'bg-yellow-900 text-yellow-300' :
                        user.tier === 'star' ? 'bg-blue-900 text-blue-300' :
                        user.tier === 'rising' ? 'bg-green-900 text-green-300' :
                        'bg-gray-800 text-gray-300'
                      }`}>
                        {user.tier.toUpperCase()}
                      </span>
                    </td>
                    
                    {/* Points */}
                    <td className="px-4 py-3">
                      {editingUser === user.discordId ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={editedPoints[user.discordId] ?? user.totalPoints}
                            onChange={(e) => setEditedPoints({
                              ...editedPoints,
                              [user.discordId]: parseInt(e.target.value) || 0
                            })}
                            className="w-20 px-2 py-1 bg-black border border-gray-600 rounded text-white text-sm"
                            autoFocus
                          />
                          <button
                            onClick={() => adjustUserPoints(user.discordId)}
                            disabled={savingPoints === user.discordId}
                            className="p-1 bg-green-900 text-green-100 rounded hover:bg-green-800 disabled:opacity-50"
                          >
                            {savingPoints === user.discordId ? '...' : '✓'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingUser(null)
                              delete editedPoints[user.discordId]
                            }}
                            className="p-1 bg-gray-800 text-gray-100 rounded hover:bg-gray-700"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingUser(user.discordId)
                            setEditedPoints({
                              ...editedPoints,
                              [user.discordId]: user.totalPoints
                            })
                          }}
                          className="text-sm font-semibold text-green-400 hover:text-green-300 hover:underline"
                        >
                          {user.totalPoints.toLocaleString()}
                        </button>
                      )}
                    </td>
                    
                    {/* Tweets */}
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {user.tweetsSubmitted}
                    </td>
                    
                    {/* Engagement */}
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-300">
                        <span title="Likes">❤️ {user.totalLikes}</span>
                        <span title="Retweets">🔁 {user.totalRetweets}</span>
                        <span title="Comments">💬 {user.totalComments}</span>
                      </div>
                    </td>
                    
                    {/* Recent Activity */}
                    <td className="px-4 py-3">
                      {user.recentActivity && user.recentActivity.length > 0 ? (
                        <div className="text-xs">
                          <p className="text-gray-300">
                            {user.recentActivity[0].action}: +{user.recentActivity[0].points}pts
                          </p>
                          <p className="text-gray-500">
                            {new Date(user.recentActivity[0].timestamp).toLocaleString()}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">No recent activity</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!searchTerm && totalPages > 1 && (
          <div className="px-4 py-3 bg-gray-800 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Showing {startIndex + 1} to {Math.min(endIndex, totalUsers)} of {totalUsers} users
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-400" />
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 rounded text-sm ${
                          currentPage === pageNum
                            ? 'bg-green-900 text-green-100'
                            : 'hover:bg-gray-700 text-gray-400'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 