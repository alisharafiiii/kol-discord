import { NextAuthOptions } from "next-auth"
import TwitterProvider from "next-auth/providers/twitter"

// Define NextAuth options for serverside use
export const authOptions: NextAuthOptions = {
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID || "",
      clientSecret: process.env.TWITTER_CLIENT_SECRET || "",
      version: "2.0",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // Save Twitter token and user info in JWT
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
      }
      
      // Store Twitter handle in the token if available
      if (profile) {
        // Twitter v2 API returns username in a 'data' property
        token.twitterHandle = (profile as any)?.data?.username;
      }
      
      return token;
    },
    // Make token data available in the session
    async session({ session, token }: { session: any; token: any }) {
      session.accessToken = token.accessToken;
      session.provider = token.provider;
      session.twitterHandle = token.twitterHandle;
      
      return session;
    },
  },
}; 