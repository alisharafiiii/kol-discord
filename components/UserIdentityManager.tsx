'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

/**
 * This component helps manage user identity across different authentication methods
 * It runs in the background and ensures Twitter logins and wallet connections
 * are properly linked to the same user profile
 */
export default function UserIdentityManager() {
  const { data: session, status } = useSession();
  const [hasProcessed, setHasProcessed] = useState(false);
  
  // Process Twitter identity when session changes
  useEffect(() => {
    const processTwitterIdentity = async () => {
      // Only process if not already done and we have a session
      if (hasProcessed || status !== 'authenticated' || !session?.user) return;
      
      try {
        // Extract Twitter data from session
        const { name, image } = session.user;
        // Get Twitter handle from token if available
        const twitterHandle = (session as any)?.twitterHandle || name;
        
        if (twitterHandle) {
          // Send to our identity API
          const response = await fetch('/api/user/twitter-identity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              twitterHandle: twitterHandle.startsWith('@') ? twitterHandle : `@${twitterHandle}`,
              name,
              profileImageUrl: image
            })
          });
          
          if (response.ok) {
            console.log('Twitter identity processed successfully');
            // Force refresh session to get updated role
            if (session.user.name === 'sharafi_eth' && !session.user.role) {
              console.log('Refreshing session for sharafi_eth to get admin role');
            }
          } else {
            console.error('Error processing Twitter identity');
          }
        }
        
        setHasProcessed(true);
      } catch (error) {
        console.error('Error in Twitter identity processing:', error);
      }
    };
    
    processTwitterIdentity();
  }, [session, status, hasProcessed]);
  
  // Process wallet connections
  useEffect(() => {
    const processWalletIdentity = async () => {
      // Check local storage for connected wallets
      const walletDataStr = localStorage.getItem('connected_wallets');
      if (!walletDataStr) return;
      
      try {
        const walletData = JSON.parse(walletDataStr);
        
        // Process each wallet type (currently supporting phantom and coinbase)
        if (walletData.addresses) {
          for (const [walletType, walletAddress] of Object.entries(walletData.addresses)) {
            if (walletAddress && typeof walletAddress === 'string') {
              // Send to our identity API
              await fetch('/api/user/wallet-identity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  walletType,
                  walletAddress
                })
              });
            }
          }
        }
      } catch (error) {
        console.error('Error processing wallet identity:', error);
      }
    };
    
    // Run once when component mounts
    processWalletIdentity();
  }, []);
  
  // This component doesn't render anything - it just runs the effects
  return null;
} 