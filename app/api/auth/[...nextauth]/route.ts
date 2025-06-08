import NextAuth, { NextAuthOptions } from "next-auth";
import Twitter from "next-auth/providers/twitter";
import { saveProfileWithDuplicateCheck } from "@/lib/redis";
import { nanoid } from 'nanoid';

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
        // Use Bearer token from environment variable for better access
        const bearerToken = process.env.TWITTER_BEARER_TOKEN || account.access_token;
        
        if (bearerToken) {
          try {
            // Fetch user data including public metrics
            const userId = profile?.data?.id;
            const response = await fetch(
              `https://api.twitter.com/2/users/${userId}?user.fields=public_metrics,profile_image_url`,
              {
                headers: {
                  Authorization: `Bearer ${bearerToken}`,
                },
              }
            );
            
            if (response.ok) {
              const userData = await response.json();
              console.log("Twitter user data:", JSON.stringify(userData, null, 2));
              
              if (userData.data?.public_metrics?.followers_count) {
                followerCount = userData.data.public_metrics.followers_count;
              }
            } else {
              console.error("Twitter API response error:", response.status, await response.text());
            }
          } catch (error) {
            console.error("Error fetching Twitter follower count:", error);
          }
        }
        
        // IMPORTANT: Use the correct Twitter handle from profile data (without @ prefix)
        const twitterHandle = profile?.data?.username || undefined;
        
        // Generate a unique ID based on Twitter username to prevent duplicates
        const profileId = twitterHandle ? `user_${profile.data.username.toLowerCase()}` : `user_${nanoid()}`;
        
        // Prepare user data from Twitter profile
        // DON'T set role or approvalStatus - let saveProfileWithDuplicateCheck handle existing users
        const userData = {
          id: profileId, // Use consistent ID based on Twitter username
          twitterHandle: twitterHandle,
          name: profile?.data?.name || user.name,
          profileImageUrl: profile?.data?.profile_image_url || user.image,
          createdAt: new Date().toISOString(),
          followerCount: followerCount, // Store follower count at top level
          socialAccounts: {
            twitter: {
              handle: profile?.data?.username,
              followers: followerCount,
            }
          },
          // Store selected chains if available in session
          chains: Array.isArray(user.chains) ? user.chains : ["Ethereum", "Base"]
        };
        
        console.log("Saving user profile with correct handle:", JSON.stringify(userData, null, 2));
        
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
        // Add follower count if available
        if (token.followerCount) {
          session.user.followerCount = token.followerCount;
        }
      }
      
      // Also add Twitter handle at top level for easier access
      if (token.twitterHandle) {
        session.twitterHandle = token.twitterHandle;
      }
      
      return session;
    },
    async jwt({ token, user, account, profile }: any) {
      // Add Twitter handle to token if available (without @ prefix)
      if (profile?.data?.username) {
        token.twitterHandle = profile.data.username; // Store without @ prefix
      }
      
      // Store follower count if it's a new sign in
      if (account && profile) {
        // Try to get follower count during JWT creation as well
        const bearerToken = process.env.TWITTER_BEARER_TOKEN;
        if (bearerToken && profile?.data?.id) {
          try {
            const response = await fetch(
              `https://api.twitter.com/2/users/${profile.data.id}?user.fields=public_metrics`,
              {
                headers: {
                  Authorization: `Bearer ${bearerToken}`,
                },
              }
            );
            
            if (response.ok) {
              const userData = await response.json();
              if (userData.data?.public_metrics?.followers_count) {
                token.followerCount = userData.data.public_metrics.followers_count;
              }
            }
          } catch (error) {
            console.error("Error fetching follower count in JWT:", error);
          }
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