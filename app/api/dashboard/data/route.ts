import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { redis } from '@/lib/redis'
import { ProfileService } from '@/lib/services/profile-service'
import { EngagementService } from '@/lib/services/engagement-service'

export async function GET(request: NextRequest) {
  try {
    // Get session
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const profile = await ProfileService.getProfileByHandle(session.user.name)
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get Discord connection
    const discordConnection = await redis.get(`engagement:twitter:${session.user.name?.toLowerCase()}`)
    if (!discordConnection) {
      return NextResponse.json({ error: 'Discord account not linked' }, { status: 400 })
    }

    // Get engagement data
    const engagementData = await redis.json.get(`engagement:connection:${discordConnection}`) as any
    if (!engagementData) {
      return NextResponse.json({ error: 'Engagement data not found' }, { status: 404 })
    }

    // Get weekly points (last 7 days)
    const weeklyPoints = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      // Get points for this day
      const dayStart = date.getTime()
      const dayEnd = dayStart + (24 * 60 * 60 * 1000)
      
      // Get engagement logs for this day
      const logs = await EngagementService.getUserEngagements(discordConnection, 1000)
      const dayLogs = logs.filter(log => {
        const logTime = new Date(log.timestamp).getTime()
        return logTime >= dayStart && logTime < dayEnd
      })
      
      const dayPoints = dayLogs.reduce((sum, log) => sum + log.points, 0)
      
      weeklyPoints.push({
        date: dateStr,
        points: dayPoints
      })
    }

    // Get recent transactions (last 10)
    const recentLogs = await EngagementService.getUserEngagements(discordConnection, 10)
    const recentTransactions = recentLogs.map(log => ({
      id: log.id,
      action: log.interactionType,
      points: log.points,
      timestamp: log.timestamp,
      description: getTransactionDescription(log)
    }))

    // Return dashboard data
    return NextResponse.json({
      user: {
        discordId: discordConnection,
        twitterHandle: session.user.name || '',
        profilePicture: profile.profileImageUrl || session.user.image || '',
        totalPoints: engagementData.totalPoints || 0,
        tier: engagementData.tier || 'micro'
      },
      weeklyPoints,
      recentTransactions
    })

  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}

function getTransactionDescription(log: any): string {
  const actionMap: Record<string, string> = {
    like: 'Liked a tweet',
    retweet: 'Retweeted',
    reply: 'Replied to tweet',
    comment: 'Commented on tweet',
    submit: 'Submitted tweet',
    bonus: 'Bonus points',
    adjustment: 'Points adjustment'
  }
  
  return actionMap[log.interactionType] || log.interactionType
} 