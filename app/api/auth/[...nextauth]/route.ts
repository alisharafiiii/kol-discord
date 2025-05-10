import NextAuth, { NextAuthOptions } from "next-auth";
import Twitter from "next-auth/providers/twitter";
import { identifyUser } from "@/lib/user-identity";

// Enable for debugging
const DEBUG = true;

// Basic log function
const log = (message: string, data?: any) => {
  if (DEBUG) {
    console.log(`\n[NEXTAUTH DEBUG] ${message}`);
    if (data) console.log(JSON.stringify(data, null, 2));
  }
};

// Configuration options
export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === "development",
  providers: [
    Twitter({
      clientId: process.env.TWITTER_CLIENT_ID || "",
      clientSecret: process.env.TWITTER_CLIENT_SECRET || "",
      version: "2.0",
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }: any) {
      if (account.provider !== "twitter") return true;
      
      try {
        // Prepare user data from Twitter profile
        const userData = {
          twitterHandle: profile?.data?.username ? `@${profile.data.username}` : undefined,
          name: profile?.data?.name || user.name,
          profileImageUrl: profile?.data?.profile_image_url || user.image,
          role: "user" as const,
          socialAccounts: {
            twitter: {
              handle: profile?.data?.username,
              followers: 0, // We would need to fetch this separately
            }
          }
        };
        
        // Use our identity management to find or create user
        await identifyUser(userData);
        
        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return true; // Still allow sign in even if our custom logic fails
      }
    },
    
    async session({ session, user, token }: any) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        
        // You can add more user data to the session here if needed
        if (token.name) session.user.name = token.name;
        if (token.picture) session.user.image = token.picture;
      }
      
      return session;
    },
    
    async jwt({ token, user, account, profile }: any) {
      // Initial sign in
      if (account && profile) {
        if (account.provider === "twitter") {
          token.twitterHandle = profile?.data?.username ? `@${profile.data.username}` : undefined;
        }
      }
      
      return token;
    },
  },
  pages: {
    signIn: "/",
    error: "/auth/error",
    signOut: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Log configuration on load
log('NextAuth configuration loaded', {
  url: process.env.NEXTAUTH_URL,
  clientId: process.env.TWITTER_CLIENT_ID ? "Configured" : "Missing",
  clientSecret: process.env.TWITTER_CLIENT_SECRET ? "Configured" : "Missing",
  secret: process.env.NEXTAUTH_SECRET ? "Configured" : "Missing"
});

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 