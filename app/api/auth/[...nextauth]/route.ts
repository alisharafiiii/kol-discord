import NextAuth, { AuthOptions } from 'next-auth'
import TwitterProvider from 'next-auth/providers/twitter'
import { saveProfile } from '@/lib/redis'

// Enable for debugging
const DEBUG = true

// Basic log function
const log = (message: string, data?: any) => {
  if (DEBUG) {
    console.log(`\n[NEXTAUTH DEBUG] ${message}`)
    if (data) console.log(JSON.stringify(data, null, 2))
  }
}

// Twitter provider
export const authOptions: AuthOptions = {
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: '2.0'
    }),
  ],
  debug: true,
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  logger: {
    error(code, metadata) {
      log(`Error: ${code}`, metadata)
    },
    warn(code) {
      log(`Warning: ${code}`)
    },
    debug(code, metadata) {
      log(`Debug: ${code}`, metadata)
    }
  }
}

// Log configuration on load
log('NextAuth configuration loaded', {
  url: process.env.NEXTAUTH_URL,
  clientId: process.env.TWITTER_CLIENT_ID ? "Configured" : "Missing",
  clientSecret: process.env.TWITTER_CLIENT_SECRET ? "Configured" : "Missing",
  secret: process.env.NEXTAUTH_SECRET ? "Configured" : "Missing"
})

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST } 