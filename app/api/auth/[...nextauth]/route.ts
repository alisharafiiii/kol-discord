import NextAuth, { NextAuthOptions } from "next-auth";
import Twitter from "next-auth/providers/twitter";
import { saveProfileWithDuplicateCheck } from "@/lib/redis";

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
        // Get follower count from Twitter API
        let followerCount = 0;
        
        // Try to get follower data using Twitter API v2
        if (account.access_token) {
          try {
            // Fetch user data including public metrics
            const userId = profile?.data?.id;
            const response = await fetch(
              `https://api.twitter.com/2/users/${userId}?user.fields=public_metrics`,
              {
                headers: {
                  Authorization: `Bearer ${account.access_token}`,
                },
              }
            );
            
            if (response.ok) {
              const userData = await response.json();
              console.log("Twitter user data:", JSON.stringify(userData, null, 2));
              
              if (userData.data?.public_metrics?.followers_count) {
                followerCount = userData.data.public_metrics.followers_count;
              }
            }
          } catch (error) {
            console.error("Error fetching Twitter follower count:", error);
          }
        }
        
        // Prepare user data from Twitter profile
        const userData = {
          twitterHandle: profile?.data?.username ? `@${profile.data.username}` : undefined,
          name: profile?.data?.name || user.name,
          profileImageUrl: profile?.data?.profile_image_url || user.image,
          role: "user" as const,
          socialAccounts: {
            twitter: {
              handle: profile?.data?.username,
              followers: followerCount,
            }
          },
          // Store selected chains if available in session
          chains: Array.isArray(user.chains) ? user.chains : ["Ethereum", "Base"]
        };
        
        console.log("Saving user profile:", JSON.stringify(userData, null, 2));
        
        // Save or update user profile
        await saveProfileWithDuplicateCheck(userData as any);
        
        return true;
      } catch (error) {
        console.error("Error in Twitter auth callback:", error);
        return true; // Still allow sign in even if there's an error saving profile
      }
    },
    async session({ session, token, user }: any) {
      // Add user info to session
      if (session.user) {
        session.user.id = token.sub;
        // Add Twitter handle if available
        if (token.twitterHandle) {
          session.user.twitterHandle = token.twitterHandle;
        }
      }
      return session;
    },
    async jwt({ token, user, account, profile }: any) {
      // Add Twitter handle to token if available
      if (profile?.data?.username) {
        token.twitterHandle = `@${profile.data.username}`;
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