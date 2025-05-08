import NextAuth, { AuthOptions, User, Account, Profile } from 'next-auth'
import TwitterProvider from 'next-auth/providers/twitter'
import { saveProfile } from '@/lib/redis'

interface TwitterProfile extends Profile {
  username?: string
  description?: string
  profile_image_url?: string
  public_metrics?: {
    followers_count?: number
    following_count?: number
  }
  location?: string
}

export const authOptions: AuthOptions = {
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: '2.0',
      authorization: {
        url: 'https://twitter.com/i/oauth2/authorize',
        params: { scope: 'tweet.read users.read offline.access' },
      },
      token: { url: 'https://api.twitter.com/2/oauth2/token' },
      userinfo: {
        url: 'https://api.twitter.com/2/users/me',
        params: { 'user.fields': 'profile_image_url,public_metrics,location,description' },
      },
    }),
  ],
  session: { strategy: 'jwt' as const },
  secret: process.env.NEXTAUTH_SECRET,
  events: {
    async signIn({ user, account, profile }: { user: User; account: Account | null; profile?: TwitterProfile }) {
      // map NextAuth user/profile to our InfluencerProfile
      const influencer = {
        id: user.id,
        name: user.name || '',
        twitterHandle: profile?.username || '',
        bio: profile?.description || '',
        profileImageUrl: profile?.profile_image_url || '',
        followerCount: profile?.public_metrics?.followers_count,
        followingCount: profile?.public_metrics?.following_count,
        location: profile?.location,
        approvalStatus: 'pending' as const,
        role: 'user' as const,
        createdAt: new Date().toISOString(),
      }
      await saveProfile(influencer)
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST } 