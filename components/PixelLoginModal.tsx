'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Twitter, X } from 'lucide-react'

interface PixelLoginModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function PixelLoginModal({ onClose, onSuccess }: PixelLoginModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleTwitterLogin = async () => {
    setIsLoading(true)
    try {
      const result = await signIn('twitter', { 
        redirect: false,
        callbackUrl: '/dashboard' 
      })
      
      if (result?.ok) {
        onSuccess()
      }
    } catch (error) {
      console.error('Login error:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-80 pixel-fade-in" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative pixel-container pixel-border bg-black p-8 max-w-md w-full pixel-bounce-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white pixel-hover"
        >
          <X className="w-6 h-6" />
        </button>
        
        {/* Content */}
        <div className="text-center">
          <h2 className="pixel-text text-3xl text-green-300 mb-2">WELCOME ANON</h2>
          <p className="pixel-text text-gray-400 mb-8">Login to view your points dashboard</p>
          
          {/* Login button */}
          <button
            onClick={handleTwitterLogin}
            disabled={isLoading}
            className="pixel-button bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 w-full flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="pixel-spinner" />
                <span className="pixel-text">CONNECTING...</span>
              </>
            ) : (
              <>
                <Twitter className="w-5 h-5" />
                <span className="pixel-text">LOGIN WITH X</span>
              </>
            )}
          </button>
          
          <p className="pixel-text text-xs text-gray-500 mt-4">
            Your Discord account must be linked to continue
          </p>
        </div>
      </div>
    </div>
  )
} 