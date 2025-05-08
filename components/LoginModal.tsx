'use client'
import React, { useState, useRef, useMemo, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { getNames, getCode } from 'country-list'
import AdminPanel from './AdminPanel'

// Add phantom window type
declare global {
  interface Window {
    phantom?: {
      solana?: {
        isPhantom?: boolean;
        connect: () => Promise<{ publicKey: { toString: () => string } }>;
        disconnect: () => Promise<void>;
      }
    }
  }
}

const allCountries = getNames()
const audienceOptions = [
  'NFT Collectors',
  'DeFi Users',
  'Crypto Traders',
  'Blockchain Developers',
  'Gaming Community',
  'Art Collectors'
]

const chainOptions = [
  'Ethereum',
  'Solana',
  'Base',
  'Bitcoin',
  'TON',
  'Sui',
  'Polkadot',
  'Doge',
  'Sei',
  'Avalanche'
]

const contentTypeOptions = [
  'thread',
  'vids',
  'space',
  'stream'
]

const socialPlatforms = [
  { name: 'Instagram', urlTemplate: 'https://instagram.com/{handle}' },
  { name: 'YouTube', urlTemplate: 'https://youtube.com/@{handle}' },
  { name: 'TikTok', urlTemplate: 'https://tiktok.com/@{handle}' },
  { name: 'Discord', urlTemplate: '{handle}' },
  { name: 'LinkedIn', urlTemplate: 'https://linkedin.com/in/{handle}' },
  { name: 'Twitch', urlTemplate: 'https://twitch.tv/{handle}' },
  { name: 'Telegram', urlTemplate: 'https://t.me/{handle}' }
]

// Admin wallet address
const ADMIN_WALLET = '0x37Ed24e7c7311836FD01702A882937138688c1A9'

// Helper to get country code
const getCountryCode = (country: string) => getCode(country)?.toLowerCase() || ''

export default function LoginModal() {
  const { data: session } = useSession()
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const [stage, setStage] = useState<'hidden'|'choice'|'enter'|'apply'|'social'|'wallet'|'preview'|'success'>('hidden')
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const taps = useRef(0)
  const timer = useRef<number>()
  
  // Connected wallets state
  const [connectedWallets, setConnectedWallets] = useState<{
    coinbase: boolean;
    phantom: boolean;
    addresses: {coinbase?: string; phantom?: string};
  }>({
    coinbase: false,
    phantom: false,
    addresses: {}
  })

  // Update wallet state when Wagmi account changes
  useEffect(() => {
    if (isConnected && address) {
      // When a wallet is connected via Wagmi, update our internal state
      setConnectedWallets(prev => ({
        ...prev,
        coinbase: true, // Assume Coinbase for now, but this could be improved
        addresses: {
          ...prev.addresses,
          coinbase: address
        }
      }))
    } else {
      // If disconnected, clear the coinbase wallet
      setConnectedWallets(prev => ({
        ...prev,
        coinbase: false,
        addresses: {
          ...prev.addresses,
          coinbase: undefined
        }
      }))
    }
  }, [isConnected, address])

  // Step 1 - Campaign Fit state
  const [countrySearch, setCountrySearch] = useState('')
  const [audienceCountries, setAudienceCountries] = useState<string[]>([])
  const [audiences, setAudiences] = useState<string[]>([])
  const [chains, setChains] = useState<string[]>([])
  const [contentTypes, setContentTypes] = useState<string[]>([])
  const [pricePerPost, setPricePerPost] = useState('')
  const [monthlyBudget, setMonthlyBudget] = useState('')
  const [collabUrls, setCollabUrls] = useState(['', '', ''])
  
  // Step 2 - Social Platforms state
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null)
  const [socialProfiles, setSocialProfiles] = useState<Record<string, { handle: string, followers: string }>>(
    Object.fromEntries(socialPlatforms.map(platform => [platform.name, { handle: '', followers: '' }]))
  )
  
  // Preview state
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filteredCountries = useMemo(
    () => allCountries.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase())),
    [countrySearch]
  )

  const handleTripleTap = () => {
    taps.current++
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => (taps.current = 0), 500)
    if (taps.current === 3) setStage('choice')
  }
  ;(globalThis as any).openLogin = handleTripleTap

  const addCollabUrl = () => {
    setCollabUrls([...collabUrls, ''])
  }

  const updateCollabUrl = (index: number, value: string) => {
    const newUrls = [...collabUrls]
    newUrls[index] = value
    setCollabUrls(newUrls)
  }

  const updateSocialProfile = (platform: string, field: 'handle' | 'followers', value: string) => {
    setSocialProfiles(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value
      }
    }))
  }

  const togglePlatform = (platform: string) => {
    setExpandedPlatform(expandedPlatform === platform ? null : platform)
  }

  const getSocialUrl = (platform: string, handle: string) => {
    const platformInfo = socialPlatforms.find(p => p.name === platform)
    if (!platformInfo || !handle) return ''
    return platformInfo.urlTemplate.replace('{handle}', handle)
  }

  // Check if admin wallet is connected
  const isAdminWallet = 
    connectedWallets.coinbase && connectedWallets.addresses.coinbase === ADMIN_WALLET ||
    connectedWallets.phantom && connectedWallets.addresses.phantom === ADMIN_WALLET

  // Helper to mask wallet addresses
  const maskAddress = (addr: string) => `${addr.slice(0,4)}...${addr.slice(-4)}`

  // Show/hide country dropdown
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)

  // Real wallet connection handlers
  const connectCoinbaseWallet = () => {
    // Try to find the Coinbase Wallet connector, fallback to the first connector
    const connector = connectors.find(c => c.id === 'coinbaseWallet') ?? connectors[0]
    if (!connector) {
      console.error('No wallet connectors available')
      alert('No wallet connectors available. Please install a supported wallet.')
      return
    }
    connect({ connector })
  }

  // For Phantom, we need to detect if it's available in the browser
  const connectPhantomWallet = async () => {
    if (typeof window !== 'undefined' && window.phantom?.solana) {
      try {
        // Connect to Phantom wallet
        const response = await window.phantom.solana.connect()
        const publicKey = response.publicKey.toString()
        
        // Update our state with the connected Phantom wallet
        setConnectedWallets(prev => ({
          ...prev,
          phantom: true,
          addresses: {
            ...prev.addresses,
            phantom: publicKey
          }
        }))
      } catch (error) {
        console.error('Phantom connection error:', error)
        alert('Failed to connect Phantom wallet. Please ensure the Phantom extension is installed and unlocked.')
      }
    } else {
      console.warn('Phantom wallet not found')
      alert('Phantom wallet not found. Please install the Phantom browser extension.')
    }
  }

  const disconnectWallet = (type: 'coinbase' | 'phantom') => {
    if (type === 'coinbase' && isConnected) {
      // Use wagmi to disconnect
      disconnect()
    } else if (type === 'phantom') {
      // For Phantom wallet
      try {
        if (typeof window !== 'undefined' && window.phantom?.solana) {
          window.phantom.solana.disconnect().catch(console.error)
        }
      } catch (error) {
        console.error('Error disconnecting Phantom wallet:', error)
      }
    }
    
    // Also update our internal state
    setConnectedWallets(prev => {
      const newAddresses = {...prev.addresses}
      delete newAddresses[type]
      
      return {
        ...prev,
        [type]: false,
        addresses: newAddresses
      }
    })
  }

  const handleSubmit = async () => {
    if (!agreeToTerms) return
    
    // For debugging
    console.log('Session data:', session)
    
    // Use email as ID if id not available
    const userId = session?.user?.email || `twitter_${session?.user?.name}`
    
    if (!userId) {
      alert('You need to be logged in with Twitter to submit')
      return
    }

    setIsSubmitting(true)
    
    try {
      // Prepare social accounts data
      const socialAccounts: Record<string, { handle: string, followers: number }> = {}
      
      // Only include social profiles with handles
      Object.entries(socialProfiles).forEach(([platform, data]) => {
        if (data.handle) {
          socialAccounts[platform.toLowerCase()] = {
            handle: data.handle,
            followers: parseInt(data.followers) || 0
          }
        }
      })
      
      // Include Twitter from session
      if (session?.user?.name) {
        socialAccounts.twitter = {
          handle: session.user.name,
          followers: 0 // We don't have this info from auth
        }
      }
      
      // Prepare wallet addresses
      const walletAddresses: Record<string, string> = {}
      if (connectedWallets.coinbase && connectedWallets.addresses.coinbase) {
        walletAddresses.coinbase = connectedWallets.addresses.coinbase
      }
      if (connectedWallets.phantom && connectedWallets.addresses.phantom) {
        walletAddresses.phantom = connectedWallets.addresses.phantom
      }
      
      // Prepare form submission
      const formData = {
        id: userId,
        name: session?.user?.name || '',
        twitterHandle: session?.user?.name ? `@${session?.user?.name}` : '',
        profileImageUrl: session?.user?.image || '',
        country: audienceCountries,
        audienceTypes: audiences,
        chains: chains,
        contentTypes: contentTypes,
        postPricePerPost: pricePerPost,
        monthlySupportBudget: monthlyBudget,
        bestCollabUrls: collabUrls.filter(url => url.trim()),
        socialAccounts: socialAccounts,
        walletAddresses: walletAddresses,
        createdAt: new Date().toISOString(),
      }
      
      console.log('Submitting form data:', formData)
      
      // Submit to API
      const response = await fetch('/api/save-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('API error:', errorData)
        throw new Error('Failed to save profile')
      }
      
      // Success! Move to success stage
      setStage('success')
    } catch (error) {
      console.error('Error submitting form:', error)
      alert('Failed to save your profile. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle helpers for multi-select fields
  const toggleCountry = (c: string) => {
    setAudienceCountries(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  const toggleContentType = (type: string) => {
    setContentTypes(prev => prev.includes(type) ? prev.filter(x => x !== type) : [...prev, type])
  }

  // On mount, if we have come back from Twitter / X OAuth redirect, restore the last stage
  useEffect(() => {
    if (typeof window === 'undefined') return

    // If we already have a user session, try to resume the saved stage
    if (session?.user) {
      const saved = localStorage.getItem('loginStage') as typeof stage | null
      if (saved) {
        setStage(saved)
        localStorage.removeItem('loginStage')
      }
    }
  }, [session])

  if (stage === 'hidden') return null

  // Show AdminPanel if open
  if (showAdminPanel) {
    return <AdminPanel onClose={() => setShowAdminPanel(false)} />
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 font-mono text-green-300 p-6">
      <div className="absolute inset-0 animate-matrix bg-black opacity-50" />
      <div className="relative z-10 rounded border-4 border-green-400 bg-black p-6 space-y-4 max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Admin Panel Button (if admin wallet connected) */}
        {isAdminWallet && (
          <div className="absolute top-3 right-3">
            <button 
              className="px-3 py-1 bg-purple-600 text-white text-xs animate-pulse hover:bg-purple-500"
              onClick={() => setShowAdminPanel(true)}
            >
              Admin Panel
            </button>
          </div>
        )}
        
        {/* Choice */}
        {stage === 'choice' && (
          <div className="flex flex-col gap-3">
            <button onClick={() => setStage('enter')}>enter</button>
            <button onClick={() => setStage('apply')}>apply</button>
            <button onClick={() => setStage('hidden')} className="text-xs">close</button>
          </div>
        )}

        {/* Enter */}
        {stage === 'enter' && (
          <div className="flex flex-col gap-5">
            <h2 className="text-sm uppercase">Connect</h2>
            
            {/* X/Twitter Section */}
            <div className="border border-green-300 p-3">
              <label className="text-xs uppercase block mb-2">X/Twitter</label>
              {session?.user ? (
                <div className="flex items-center">
                  <img
                    src={session.user.image || '/logo.png'}
                    alt={session.user.name || ''}
                    className="w-8 h-8 rounded-full"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <span className="text-xs ml-2">{session.user.name}</span>
                  <button 
                    className="text-red-500 ml-auto"
                    onClick={() => signOut()}
                  >
                    x
                  </button>
                </div>
              ) : (
                <button 
                  className="bg-black border border-green-300 hover:bg-green-800 text-xs p-2"
                  onClick={() => {
                    // Save progress so that after OAuth redirect we resume from social step
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('loginStage', 'social')
                    }
                    signIn('twitter')
                  }}
                >
                  Login with 𝕏
                </button>
              )}
            </div>
            
            {/* Coinbase Wallet Section */}
            <div className="border border-green-300 p-3">
              <label className="text-xs uppercase block mb-2">Coinbase Wallet</label>
              {!connectedWallets.coinbase ? (
                <button 
                  className="bg-black border border-green-300 hover:bg-green-800 text-xs p-2"
                  onClick={connectCoinbaseWallet}
                >
                  Connect Coinbase Wallet
                </button>
              ) : (
                <div className="flex items-center">
                  <span className="text-xs">{maskAddress(connectedWallets.addresses.coinbase || '')}</span>
                  <button 
                    className="text-red-500 ml-2"
                    onClick={() => disconnectWallet('coinbase')}
                  >
                    x
                  </button>
                </div>
              )}
            </div>
            
            {/* Phantom Wallet Section */}
            <div className="border border-green-300 p-3">
              <label className="text-xs uppercase block mb-2">Phantom Wallet</label>
              {!connectedWallets.phantom ? (
                <button 
                  className="bg-black border border-green-300 hover:bg-green-800 text-xs p-2"
                  onClick={connectPhantomWallet}
                >
                  Connect Phantom Wallet
                </button>
              ) : (
                <div className="flex items-center">
                  <span className="text-xs">{maskAddress(connectedWallets.addresses.phantom || '')}</span>
                  <button 
                    className="text-red-500 ml-2"
                    onClick={() => disconnectWallet('phantom')}
                  >
                    x
                  </button>
                </div>
              )}
            </div>
            
            <button className="text-xs self-start" onClick={() => setStage('choice')}>back</button>
          </div>
        )}

        {/* Apply Step 1 – Campaign Fit */}
        {stage === 'apply' && (
          <form className="flex flex-col gap-3" onSubmit={e => { e.preventDefault(); setStage('social'); }}>
            <h2 className="text-sm uppercase">1. Campaign Fit</h2>
            
            {/* Audience Countries */}
            <label className="text-xs uppercase">Audience Countries (multi-select)</label>
            <div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCountryDropdown(prev => !prev)}
                  className="text-xs border border-green-300 px-2 py-1 hover:bg-green-800"
                >
                  {showCountryDropdown ? 'Hide Countries' : 'Select Countries'}
                </button>
                <div className="flex gap-1">
                  {audienceCountries.map(c => (
                    <img
                      key={c}
                      src={`https://flagcdn.com/w20/${getCountryCode(c)}.png`}
                      alt={c}
                      className="w-5 h-3"
                    />
                  ))}
                </div>
              </div>
              {showCountryDropdown && (
                <div className="mt-2 border border-green-300 p-2">
                  <input
                    type="text"
                    placeholder="Search countries..."
                    className="w-full bg-black border border-green-300 p-2 text-xs"
                    value={countrySearch}
                    onChange={e => setCountrySearch(e.target.value)}
                  />
                  <div className="mt-1 max-h-32 overflow-auto">
                    {filteredCountries.map(c => (
                      <div
                        key={c}
                        className={`p-2 text-xs cursor-pointer ${audienceCountries.includes(c) ? 'bg-green-800' : ''}`}
                        onClick={() => toggleCountry(c)}
                      >
                        {c}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {audienceCountries.length > 0 && (
              <div className="text-xs text-green-400 mt-1">
                Selected: {audienceCountries.join(', ')}
              </div>
            )}

            {/* Target Audience */}
            <label className="text-xs uppercase">Target Audience (multi-select)</label>
            <div className="grid grid-cols-2 gap-2">
              {audienceOptions.map(opt => (
                <label key={opt} className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    value={opt}
                    checked={audiences.includes(opt)}
                    onChange={() => setAudiences(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt])}
                  />
                  {opt}
                </label>
              ))}
            </div>

            {/* Active Chains */}
            <label className="text-xs uppercase">Active Chains (multi-select)</label>
            <div className="grid grid-cols-2 gap-2">
              {chainOptions.map(chain => (
                <label key={chain} className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    value={chain}
                    checked={chains.includes(chain)}
                    onChange={() => setChains(prev => prev.includes(chain) ? prev.filter(x => x !== chain) : [...prev, chain])}
                  />
                  {chain}
                </label>
              ))}
            </div>

            {/* Content Types */}
            <label className="text-xs uppercase">Content Types (multi-select)</label>
            <div className="grid grid-cols-2 gap-2">
              {contentTypeOptions.map(type => (
                <label key={type} className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    value={type}
                    checked={contentTypes.includes(type)}
                    onChange={() => toggleContentType(type)}
                  />
                  {type}
                </label>
              ))}
            </div>
            {contentTypes.length > 0 && (
              <div className="text-xs text-green-400 mt-1">
                Selected: {contentTypes.join(', ')}
              </div>
            )}

            {/* Pricing */}
            <label className="text-xs uppercase">Pricing</label>
            <input
              type="number"
              placeholder="Avg price per post (USD)"
              className="bg-black border border-green-300 p-2 text-xs"
              value={pricePerPost}
              onChange={e => setPricePerPost(e.target.value)}
            />
            <input
              type="number"
              placeholder="Monthly support budget (USD)"
              className="bg-black border border-green-300 p-2 text-xs"
              value={monthlyBudget}
              onChange={e => setMonthlyBudget(e.target.value)}
            />

            {/* Best Collab URLs */}
            <label className="text-xs uppercase">Best Collab URLs</label>
            {collabUrls.map((url, index) => (
              <input
                key={index}
                type="url"
                placeholder={`URL ${index + 1}`}
                className="bg-black border border-green-300 p-2 text-xs"
                value={url}
                onChange={e => updateCollabUrl(index, e.target.value)}
              />
            ))}
            <button 
              type="button" 
              className="text-xs self-start border border-green-300 px-2 py-1"
              onClick={addCollabUrl}
            >
              + add more
            </button>

            <div className="flex gap-4 mt-4">
              <button type="button" className="text-xs" onClick={() => setStage('choice')}>back</button>
              <button type="submit" className="px-4 py-2 bg-green-400 text-black hover:bg-green-200">next</button>
            </div>
          </form>
        )}

        {/* Social Platforms */}
        {stage === 'social' && (
          <form className="flex flex-col gap-3" onSubmit={e => { e.preventDefault(); setStage('wallet'); }}>
            <h2 className="text-sm uppercase">2. Social Platforms</h2>
            
            {/* Twitter/X Connection Section */}
            <div className="border border-green-300 p-3 mb-2">
              <label className="text-xs uppercase block mb-2">X (Twitter)</label>
              {session?.user ? (
                <div className="flex items-center">
                  <img
                    src={session.user.image || '/logo.png'}
                    alt={session.user.name || ''}
                    className="w-8 h-8 rounded-full"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <span className="text-xs ml-2">{session.user.name}</span>
                  <button 
                    className="text-red-500 ml-auto"
                    onClick={() => signOut()}
                  >
                    x
                  </button>
                </div>
              ) : (
                <button 
                  type="button"
                  className="bg-black border border-green-300 hover:bg-green-800 text-xs p-2"
                  onClick={() => {
                    // Save progress so that after OAuth redirect we resume from social step
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('loginStage', 'social')
                    }
                    signIn('twitter')
                  }}
                >
                  Connect X (Twitter) Account
                </button>
              )}
            </div>
            
            <p className="text-xs">Add other social platforms where you have a presence</p>
            
            <div className="flex flex-col gap-2">
              {socialPlatforms.map(platform => (
                <div key={platform.name} className="border border-green-300">
                  <button
                    type="button"
                    className={`w-full p-2 text-left text-xs ${expandedPlatform === platform.name ? 'bg-green-800' : ''}`}
                    onClick={() => togglePlatform(platform.name)}
                  >
                    {platform.name} {expandedPlatform === platform.name ? '▲' : '▼'}
                  </button>
                  
                  {expandedPlatform === platform.name && (
                    <div className="p-2 border-t border-green-300">
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          placeholder={`${platform.name} username/handle`}
                          className="bg-black border border-green-300 p-2 text-xs"
                          value={socialProfiles[platform.name].handle}
                          onChange={e => updateSocialProfile(platform.name, 'handle', e.target.value)}
                        />
                        <input
                          type="number"
                          placeholder="Number of followers"
                          className="bg-black border border-green-300 p-2 text-xs"
                          value={socialProfiles[platform.name].followers}
                          onChange={e => updateSocialProfile(platform.name, 'followers', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-4 mt-4">
              <button type="button" className="text-xs" onClick={() => setStage('apply')}>back</button>
              <button 
                type="submit" 
                className={`px-4 py-2 ${!session?.user ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-green-400 text-black hover:bg-green-200'}`}
                disabled={!session?.user}
              >
                next
              </button>
              {!session?.user && (
                <div className="text-xs text-red-400 ml-2">X (Twitter) account connection required to proceed</div>
              )}
            </div>
          </form>
        )}

        {/* Wallet Connect */}
        {stage === 'wallet' && (
          <div className="flex flex-col gap-3">
            <h2 className="uppercase text-sm">3. Connect Wallets (optional)</h2>
            
            {/* Coinbase Wallet */}
            <div className="border border-green-300 p-3">
              <label className="text-xs uppercase block mb-2">Coinbase Wallet</label>
              {!connectedWallets.coinbase ? (
                <button 
                  className="bg-black border border-green-300 hover:bg-green-800 text-xs p-2"
                  onClick={connectCoinbaseWallet}
                >
                  Connect Coinbase Wallet
                </button>
              ) : (
                <div className="flex items-center">
                  <span className="text-xs">{maskAddress(connectedWallets.addresses.coinbase || '')}</span>
                  <button 
                    className="text-red-500 ml-2"
                    onClick={() => disconnectWallet('coinbase')}
                  >
                    x
                  </button>
                </div>
              )}
            </div>
            
            {/* Phantom Wallet */}
            <div className="border border-green-300 p-3">
              <label className="text-xs uppercase block mb-2">Phantom Wallet</label>
              {!connectedWallets.phantom ? (
                <button 
                  className="bg-black border border-green-300 hover:bg-green-800 text-xs p-2"
                  onClick={connectPhantomWallet}
                >
                  Connect Phantom Wallet
                </button>
              ) : (
                <div className="flex items-center">
                  <span className="text-xs">{maskAddress(connectedWallets.addresses.phantom || '')}</span>
                  <button 
                    className="text-red-500 ml-2"
                    onClick={() => disconnectWallet('phantom')}
                  >
                    x
                  </button>
                </div>
              )}
            </div>
            
            <div className="mt-4 flex gap-4">
              <button className="text-xs" onClick={() => setStage('social')}>back</button>
              <button 
                className="px-3 py-1 bg-green-400 text-black hover:bg-green-200" 
                onClick={() => setStage('preview')}
              >
                next
              </button>
              <button 
                className="px-3 py-1 border border-green-300 hover:bg-green-800" 
                onClick={() => {
                  if (confirm("You won't be entered into on-chain raffles without a connected wallet. Continue anyway?")) {
                    setStage('preview')
                  }
                }}
              >
                skip
              </button>
            </div>
          </div>
        )}

        {/* Preview & Submit */}
        {stage === 'preview' && (
          <div className="flex flex-col gap-3">
            <h2 className="uppercase text-sm">4. Preview & Submit</h2>
            
            {/* Retro KOL Card Preview */}
            <div className="border-2 border-green-400 p-4 bg-black">
              {/* Profile Image */}
              <div className="flex gap-4">
                <div className="w-20 h-20">
                  <img 
                    src={session?.user?.image || '/logo.png'} 
                    alt="Profile" 
                    className="w-full h-full object-cover" 
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
                
                {/* Core Stats */}
                <div className="flex flex-col">
                  <span className="text-xl">{session?.user?.name || 'User'}</span>
                  {/* Only show Twitter handle if we can extract it from user email or explicitly set */}
                  {session?.user?.email && !session.user.email.includes(session?.user?.name || '') && (
                    <span className="text-xs">@{session?.user?.email.split('@')[0] || 'username'}</span>
                  )}
                  <span className="text-xs">Primary chains: {chains.join(', ') || 'None selected'}</span>
                </div>
              </div>
              
              {/* Details */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div>Audience Countries: {audienceCountries.join(', ') || 'Not specified'}</div>
                <div>Content Types: {contentTypes.join(', ') || 'Not specified'}</div>
                <div>Post price: ${pricePerPost || '0'}</div>
                <div>Budget: ${monthlyBudget || '0'}/month</div>
              </div>

              {/* Wallets */}
              {(connectedWallets.coinbase || connectedWallets.phantom) && (
                <div className="mt-2 text-xs">
                  <div className="uppercase">Connected Wallets:</div>
                  <div className="grid grid-cols-1 gap-1 mt-1">
                    {connectedWallets.coinbase && (
                      <div>Coinbase: {connectedWallets.addresses.coinbase}</div>
                    )}
                    {connectedWallets.phantom && (
                      <div>Phantom: {connectedWallets.addresses.phantom}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Social Handles */}
              <div className="mt-4 text-xs">
                <div className="uppercase">Social Handles:</div>
                <div className="grid grid-cols-1 gap-1 mt-1">
                  {Object.entries(socialProfiles)
                    .filter(([_, profile]) => profile.handle)
                    .map(([platform, profile]) => {
                      const url = getSocialUrl(platform, profile.handle)
                      return (
                        <div key={platform} className="flex items-center gap-2">
                          <span>{platform}:</span>
                          {url ? (
                            <a 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-green-400 hover:underline"
                            >
                              {profile.handle}
                            </a>
                          ) : (
                            <span>{profile.handle}</span>
                          )}
                          <span className="ml-auto">{profile.followers ? `${profile.followers} followers` : ''}</span>
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>
            
            {/* Terms Agreement */}
            <label className="flex items-center gap-2 text-xs mt-2">
              <input 
                type="checkbox" 
                checked={agreeToTerms}
                onChange={e => setAgreeToTerms(e.target.checked)}
              />
              I agree to the terms and conditions
            </label>
            
            <div className="flex gap-4 mt-4">
              <button className="text-xs" onClick={() => setStage('wallet')}>back</button>
              <button 
                onClick={handleSubmit}
                disabled={!agreeToTerms || isSubmitting}
                className={`px-4 py-2 ${
                  !agreeToTerms 
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                    : isSubmitting 
                      ? 'bg-yellow-500 text-black' 
                      : 'bg-green-400 text-black hover:bg-green-200'
                }`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        )}

        {/* Success Stage */}
        {stage === 'success' && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="text-xl text-green-400">Application Submitted!</div>
            <div className="animate-pulse text-4xl">✓</div>
            <p className="text-center text-xs mt-4">
              Thank you for applying to the KOL program.<br/>
              We'll review your application and get back to you soon.
            </p>
            <button 
              className="mt-4 px-4 py-2 bg-green-400 text-black hover:bg-green-200"
              onClick={() => setStage('hidden')}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 