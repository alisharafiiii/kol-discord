'use client'

import { signOut } from 'next-auth/react'
import { useEffect } from 'react'

export default function ForceLogoutPage() {
  useEffect(() => {
    // Clear all cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    // Clear local storage
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
    
    // Force sign out
    signOut({ 
      callbackUrl: '/',
      redirect: true 
    }).then(() => {
      // Additional cleanup after signout
      console.log('Forced logout complete');
    });
  }, []);
  
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl mb-4">Clearing all session data...</h1>
        <p className="text-gray-400">You will be redirected to the home page.</p>
      </div>
    </div>
  );
} 