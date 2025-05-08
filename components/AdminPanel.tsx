'use client'
import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { InfluencerProfile } from '../lib/redis'

// Extend the InfluencerProfile type with additional fields we need
interface ExtendedInfluencerProfile extends InfluencerProfile {
  countries?: string;
  wallets?: Record<string, string>;
  walletType?: string;
  experience?: string;
  audienceLocations?: string[] | string;
  targetAudience?: string[] | string;
  audience?: string[] | string; // Alternative property name
  activeChains?: string[] | string;
  blockchains?: string; // Alternative property name
  contentType?: string[] | string;
  contentTypes?: string; // Alternative property name
  pricePerPost?: number;
  priceMonthly?: number;
  roiPoints?: number;
}

type Tab = 'dashboard' | 'search' | 'leaderboard'

// Helper function to safely get follower count from social accounts
const getFollowerCount = (data: any): number => {
  if (!data) return 0
  return 'followers' in data ? data.followers : 
         'subscribers' in data ? data.subscribers : 0
}

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  // New multi-select filters
  const [audienceLocations, setAudienceLocations] = useState<string[]>([])
  const [targetAudience, setTargetAudience] = useState<string[]>([])
  const [activeChains, setActiveChains] = useState<string[]>([])
  const [contentTypes, setContentTypes] = useState<string[]>([])
  const [platforms, setPlatforms] = useState<string[]>([])
  
  // Range filters
  const [pricePerPostRange, setPricePerPostRange] = useState<{min: number, max: number}>({min: 0, max: 10000})
  const [priceMonthlyRange, setPriceMonthlyRange] = useState<{min: number, max: number}>({min: 0, max: 50000})
  const [followerRange, setFollowerRange] = useState<{min: number, max: number}>({min: 0, max: 1000000})
  const [roiPointsRange, setRoiPointsRange] = useState<{min: number, max: number}>({min: 0, max: 100})
  
  // Debug mode
  const [debugMode, setDebugMode] = useState(false)
  const [debugUser, setDebugUser] = useState<string>('')
  
  // Search states for dropdowns
  const [countrySearch, setCountrySearch] = useState('')
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  
  const [users, setUsers] = useState<ExtendedInfluencerProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const { data: session } = useSession()
  
  // Countries list (more comprehensive)
  const countries = [
    { code: 'AF', name: 'Afghanistan' },
    { code: 'AX', name: 'Åland Islands' },
    { code: 'AL', name: 'Albania' },
    { code: 'DZ', name: 'Algeria' },
    { code: 'AS', name: 'American Samoa' },
    { code: 'AD', name: 'Andorra' },
    { code: 'AO', name: 'Angola' },
    { code: 'AI', name: 'Anguilla' },
    { code: 'AQ', name: 'Antarctica' },
    { code: 'AG', name: 'Antigua and Barbuda' },
    { code: 'AR', name: 'Argentina' },
    { code: 'AM', name: 'Armenia' },
    { code: 'AW', name: 'Aruba' },
    { code: 'AU', name: 'Australia' },
    { code: 'AT', name: 'Austria' },
    { code: 'AZ', name: 'Azerbaijan' },
    { code: 'BS', name: 'Bahamas' },
    { code: 'BH', name: 'Bahrain' },
    { code: 'BD', name: 'Bangladesh' },
    { code: 'BB', name: 'Barbados' },
    { code: 'BY', name: 'Belarus' },
    { code: 'BE', name: 'Belgium' },
    { code: 'BZ', name: 'Belize' },
    { code: 'BJ', name: 'Benin' },
    { code: 'BM', name: 'Bermuda' },
    { code: 'BT', name: 'Bhutan' },
    { code: 'BO', name: 'Bolivia' },
    { code: 'BQ', name: 'Bonaire, Sint Eustatius and Saba' },
    { code: 'BA', name: 'Bosnia and Herzegovina' },
    { code: 'BW', name: 'Botswana' },
    { code: 'BV', name: 'Bouvet Island' },
    { code: 'BR', name: 'Brazil' },
    { code: 'IO', name: 'British Indian Ocean Territory' },
    { code: 'BN', name: 'Brunei Darussalam' },
    { code: 'BG', name: 'Bulgaria' },
    { code: 'BF', name: 'Burkina Faso' },
    { code: 'BI', name: 'Burundi' },
    { code: 'CV', name: 'Cabo Verde' },
    { code: 'KH', name: 'Cambodia' },
    { code: 'CM', name: 'Cameroon' },
    { code: 'CA', name: 'Canada' },
    { code: 'KY', name: 'Cayman Islands' },
    { code: 'CF', name: 'Central African Republic' },
    { code: 'TD', name: 'Chad' },
    { code: 'CL', name: 'Chile' },
    { code: 'CN', name: 'China' },
    { code: 'CX', name: 'Christmas Island' },
    { code: 'CC', name: 'Cocos (Keeling) Islands' },
    { code: 'CO', name: 'Colombia' },
    { code: 'KM', name: 'Comoros' },
    { code: 'CG', name: 'Congo' },
    { code: 'CD', name: 'Congo, Democratic Republic of the' },
    { code: 'CK', name: 'Cook Islands' },
    { code: 'CR', name: 'Costa Rica' },
    { code: 'CI', name: 'Côte d\'Ivoire' },
    { code: 'HR', name: 'Croatia' },
    { code: 'CU', name: 'Cuba' },
    { code: 'CW', name: 'Curaçao' },
    { code: 'CY', name: 'Cyprus' },
    { code: 'CZ', name: 'Czechia' },
    { code: 'DK', name: 'Denmark' },
    { code: 'DJ', name: 'Djibouti' },
    { code: 'DM', name: 'Dominica' },
    { code: 'DO', name: 'Dominican Republic' },
    { code: 'EC', name: 'Ecuador' },
    { code: 'EG', name: 'Egypt' },
    { code: 'SV', name: 'El Salvador' },
    { code: 'GQ', name: 'Equatorial Guinea' },
    { code: 'ER', name: 'Eritrea' },
    { code: 'EE', name: 'Estonia' },
    { code: 'SZ', name: 'Eswatini' },
    { code: 'ET', name: 'Ethiopia' },
    { code: 'FK', name: 'Falkland Islands (Malvinas)' },
    { code: 'FO', name: 'Faroe Islands' },
    { code: 'FJ', name: 'Fiji' },
    { code: 'FI', name: 'Finland' },
    { code: 'FR', name: 'France' },
    { code: 'GF', name: 'French Guiana' },
    { code: 'PF', name: 'French Polynesia' },
    { code: 'TF', name: 'French Southern Territories' },
    { code: 'GA', name: 'Gabon' },
    { code: 'GM', name: 'Gambia' },
    { code: 'GE', name: 'Georgia' },
    { code: 'DE', name: 'Germany' },
    { code: 'GH', name: 'Ghana' },
    { code: 'GI', name: 'Gibraltar' },
    { code: 'GR', name: 'Greece' },
    { code: 'GL', name: 'Greenland' },
    { code: 'GD', name: 'Grenada' },
    { code: 'GP', name: 'Guadeloupe' },
    { code: 'GU', name: 'Guam' },
    { code: 'GT', name: 'Guatemala' },
    { code: 'GG', name: 'Guernsey' },
    { code: 'GN', name: 'Guinea' },
    { code: 'GW', name: 'Guinea-Bissau' },
    { code: 'GY', name: 'Guyana' },
    { code: 'HT', name: 'Haiti' },
    { code: 'HM', name: 'Heard Island and McDonald Islands' },
    { code: 'VA', name: 'Holy See' },
    { code: 'HN', name: 'Honduras' },
    { code: 'HK', name: 'Hong Kong' },
    { code: 'HU', name: 'Hungary' },
    { code: 'IS', name: 'Iceland' },
    { code: 'IN', name: 'India' },
    { code: 'ID', name: 'Indonesia' },
    { code: 'IR', name: 'Iran' },
    { code: 'IQ', name: 'Iraq' },
    { code: 'IE', name: 'Ireland' },
    { code: 'IM', name: 'Isle of Man' },
    { code: 'IL', name: 'Israel' },
    { code: 'IT', name: 'Italy' },
    { code: 'JM', name: 'Jamaica' },
    { code: 'JP', name: 'Japan' },
    { code: 'JE', name: 'Jersey' },
    { code: 'JO', name: 'Jordan' },
    { code: 'KZ', name: 'Kazakhstan' },
    { code: 'KE', name: 'Kenya' },
    { code: 'KI', name: 'Kiribati' },
    { code: 'KP', name: 'North Korea' },
    { code: 'KR', name: 'South Korea' },
    { code: 'KW', name: 'Kuwait' },
    { code: 'KG', name: 'Kyrgyzstan' },
    { code: 'LA', name: 'Lao People\'s Democratic Republic' },
    { code: 'LV', name: 'Latvia' },
    { code: 'LB', name: 'Lebanon' },
    { code: 'LS', name: 'Lesotho' },
    { code: 'LR', name: 'Liberia' },
    { code: 'LY', name: 'Libya' },
    { code: 'LI', name: 'Liechtenstein' },
    { code: 'LT', name: 'Lithuania' },
    { code: 'LU', name: 'Luxembourg' },
    { code: 'MO', name: 'Macao' },
    { code: 'MG', name: 'Madagascar' },
    { code: 'MW', name: 'Malawi' },
    { code: 'MY', name: 'Malaysia' },
    { code: 'MV', name: 'Maldives' },
    { code: 'ML', name: 'Mali' },
    { code: 'MT', name: 'Malta' },
    { code: 'MH', name: 'Marshall Islands' },
    { code: 'MQ', name: 'Martinique' },
    { code: 'MR', name: 'Mauritania' },
    { code: 'MU', name: 'Mauritius' },
    { code: 'YT', name: 'Mayotte' },
    { code: 'MX', name: 'Mexico' },
    { code: 'FM', name: 'Micronesia' },
    { code: 'MD', name: 'Moldova' },
    { code: 'MC', name: 'Monaco' },
    { code: 'MN', name: 'Mongolia' },
    { code: 'ME', name: 'Montenegro' },
    { code: 'MS', name: 'Montserrat' },
    { code: 'MA', name: 'Morocco' },
    { code: 'MZ', name: 'Mozambique' },
    { code: 'MM', name: 'Myanmar' },
    { code: 'NA', name: 'Namibia' },
    { code: 'NR', name: 'Nauru' },
    { code: 'NP', name: 'Nepal' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'NC', name: 'New Caledonia' },
    { code: 'NZ', name: 'New Zealand' },
    { code: 'NI', name: 'Nicaragua' },
    { code: 'NE', name: 'Niger' },
    { code: 'NG', name: 'Nigeria' },
    { code: 'NU', name: 'Niue' },
    { code: 'NF', name: 'Norfolk Island' },
    { code: 'MK', name: 'North Macedonia' },
    { code: 'MP', name: 'Northern Mariana Islands' },
    { code: 'NO', name: 'Norway' },
    { code: 'OM', name: 'Oman' },
    { code: 'PK', name: 'Pakistan' },
    { code: 'PW', name: 'Palau' },
    { code: 'PS', name: 'Palestine' },
    { code: 'PA', name: 'Panama' },
    { code: 'PG', name: 'Papua New Guinea' },
    { code: 'PY', name: 'Paraguay' },
    { code: 'PE', name: 'Peru' },
    { code: 'PH', name: 'Philippines' },
    { code: 'PN', name: 'Pitcairn' },
    { code: 'PL', name: 'Poland' },
    { code: 'PT', name: 'Portugal' },
    { code: 'PR', name: 'Puerto Rico' },
    { code: 'QA', name: 'Qatar' },
    { code: 'RE', name: 'Réunion' },
    { code: 'RO', name: 'Romania' },
    { code: 'RU', name: 'Russian Federation' },
    { code: 'RW', name: 'Rwanda' },
    { code: 'BL', name: 'Saint Barthélemy' },
    { code: 'SH', name: 'Saint Helena, Ascension and Tristan da Cunha' },
    { code: 'KN', name: 'Saint Kitts and Nevis' },
    { code: 'LC', name: 'Saint Lucia' },
    { code: 'MF', name: 'Saint Martin (French part)' },
    { code: 'PM', name: 'Saint Pierre and Miquelon' },
    { code: 'VC', name: 'Saint Vincent and the Grenadines' },
    { code: 'WS', name: 'Samoa' },
    { code: 'SM', name: 'San Marino' },
    { code: 'ST', name: 'Sao Tome and Principe' },
    { code: 'SA', name: 'Saudi Arabia' },
    { code: 'SN', name: 'Senegal' },
    { code: 'RS', name: 'Serbia' },
    { code: 'SC', name: 'Seychelles' },
    { code: 'SL', name: 'Sierra Leone' },
    { code: 'SG', name: 'Singapore' },
    { code: 'SX', name: 'Sint Maarten (Dutch part)' },
    { code: 'SK', name: 'Slovakia' },
    { code: 'SI', name: 'Slovenia' },
    { code: 'SB', name: 'Solomon Islands' },
    { code: 'SO', name: 'Somalia' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'GS', name: 'South Georgia and the South Sandwich Islands' },
    { code: 'SS', name: 'South Sudan' },
    { code: 'ES', name: 'Spain' },
    { code: 'LK', name: 'Sri Lanka' },
    { code: 'SD', name: 'Sudan' },
    { code: 'SR', name: 'Suriname' },
    { code: 'SJ', name: 'Svalbard and Jan Mayen' },
    { code: 'SE', name: 'Sweden' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'SY', name: 'Syrian Arab Republic' },
    { code: 'TW', name: 'Taiwan' },
    { code: 'TJ', name: 'Tajikistan' },
    { code: 'TZ', name: 'Tanzania' },
    { code: 'TH', name: 'Thailand' },
    { code: 'TL', name: 'Timor-Leste' },
    { code: 'TG', name: 'Togo' },
    { code: 'TK', name: 'Tokelau' },
    { code: 'TO', name: 'Tonga' },
    { code: 'TT', name: 'Trinidad and Tobago' },
    { code: 'TN', name: 'Tunisia' },
    { code: 'TR', name: 'Turkey' },
    { code: 'TM', name: 'Turkmenistan' },
    { code: 'TC', name: 'Turks and Caicos Islands' },
    { code: 'TV', name: 'Tuvalu' },
    { code: 'UG', name: 'Uganda' },
    { code: 'UA', name: 'Ukraine' },
    { code: 'AE', name: 'United Arab Emirates' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'US', name: 'United States' },
    { code: 'UM', name: 'United States Minor Outlying Islands' },
    { code: 'UY', name: 'Uruguay' },
    { code: 'UZ', name: 'Uzbekistan' },
    { code: 'VU', name: 'Vanuatu' },
    { code: 'VE', name: 'Venezuela' },
    { code: 'VN', name: 'Viet Nam' },
    { code: 'VG', name: 'Virgin Islands, British' },
    { code: 'VI', name: 'Virgin Islands, U.S.' },
    { code: 'WF', name: 'Wallis and Futuna' },
    { code: 'EH', name: 'Western Sahara' },
    { code: 'YE', name: 'Yemen' },
    { code: 'ZM', name: 'Zambia' },
    { code: 'ZW', name: 'Zimbabwe' }
  ]
  
  // Target audience options - match apply form options
  const targetAudienceOptions = [
    'Crypto Enthusiasts',
    'Traders',
    'Developers',
    'Artists',
    'Gamers',
    'Investors',
    'DeFi Users',
    'NFT Collectors',
    'Beginners',
    'Enterprises',
    'Tech Enthusiasts',
    'Blockchain Hobbyists'
  ]
  
  // Chain options - match apply form options
  const chainOptions = [
    'Ethereum',
    'Solana',
    'Bitcoin',
    'Polygon',
    'BNB Chain',
    'Avalanche',
    'Arbitrum',
    'Optimism',
    'Cosmos',
    'Cardano',
    'NEAR',
    'Polkadot',
    'Aptos',
    'Sui',
    'TON',
    'Base',
    'Blast'
  ]
  
  // Content type options - match apply form options
  const contentTypeOptions = [
    'Educational',
    'News',
    'Reviews',
    'Tutorials',
    'Market Analysis',
    'Technical Analysis',
    'Interviews',
    'Twitter Spaces',
    'AMAs',
    'Project Updates',
    'Memes',
    'Trading Tips',
    'Beginner Guides',
    'Deep Dives',
    'Podcasts',
    'Videos'
  ]
  
  // Platform options
  const platformOptions = [
    'Twitter',
    'Instagram',
    'YouTube',
    'TikTok',
    'Discord',
    'Telegram',
    'Twitch',
    'LinkedIn',
    'Medium',
    'GitHub',
    'Substack',
    'Reddit'
  ]
  
  // Toggle selection in multi-select arrays
  const toggleSelection = (value: string, currentSelections: string[], setSelections: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (currentSelections.includes(value)) {
      setSelections(currentSelections.filter(item => item !== value))
    } else {
      setSelections([...currentSelections, value])
    }
  }
  
  // Filter countries by search term
  const filteredCountries = countries.filter(country => 
    country.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
    country.code.toLowerCase().includes(countrySearch.toLowerCase())
  )
  
  // Fetch users from database on component mount
  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true)
        const response = await fetch('/api/admin/users')
        if (!response.ok) throw new Error('Failed to fetch users')
        const data = await response.json()
        setUsers(data.users)
        
        // Also fetch monthly data
        const statsResponse = await fetch('/api/admin/stats')
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setMonthlyData(statsData.monthlyData)
        }
      } catch (error) {
        console.error('Error fetching users:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchUsers()
  }, [])
  
  // Calculate platform totals for circle chart
  const platformTotals = users.reduce((acc, user) => {
    if (user.socialAccounts) {
      Object.entries(user.socialAccounts).forEach(([platform, data]) => {
        if (data) {
          const followerCount = getFollowerCount(data)
          acc[platform] = (acc[platform] || 0) + followerCount
        }
      })
    }
    return acc
  }, {} as Record<string, number>)
  
  // Get total numbers by status
  const statusTotals = users.reduce((acc, user) => {
    acc[user.approvalStatus] = (acc[user.approvalStatus] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  // Handle approving a profile
  const handleApprove = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId,
          adminName: session?.user?.name || 'Unknown Admin'
        }),
      })
      
      if (!response.ok) throw new Error('Failed to approve user')
      
      // Update local state to reflect the change
      setUsers(prev => 
        prev.map(user => 
          user.id === userId 
            ? { 
                ...user, 
                approvalStatus: 'approved', 
                updatedBy: session?.user?.name || 'Unknown Admin', 
                approvedBy: session?.user?.name || 'Unknown Admin'
              } 
            : user
        )
      )
    } catch (error) {
      console.error('Error approving user:', error)
      alert('Failed to approve user. Please try again.')
    }
  }
  
  // Handle rejecting a profile
  const handleReject = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId,
          adminName: session?.user?.name || 'Unknown Admin'
        }),
      })
      
      if (!response.ok) throw new Error('Failed to reject user')
      
      // Update local state to reflect the change
      setUsers(prev => 
        prev.map(user => 
          user.id === userId 
            ? { 
                ...user, 
                approvalStatus: 'rejected', 
                updatedBy: session?.user?.name || 'Unknown Admin', 
                rejectedBy: session?.user?.name || 'Unknown Admin'
              } 
            : user
        )
      )
    } catch (error) {
      console.error('Error rejecting user:', error)
      alert('Failed to reject user. Please try again.')
    }
  }
  
  // View user profile details
  const handleView = async (userId: string) => {
    try {
      window.open(`/profile/${userId}`, '_blank')
    } catch (error) {
      console.error('Error viewing user profile:', error)
      alert('Failed to open user profile. Please try again.')
    }
  }
  
  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    // Debug output for a specific user
    const isDebugUser = debugMode && user.name === debugUser
    if (isDebugUser) {
      console.log('DEBUG - User data:', user)
    }
    
    const matchesSearch = 
      searchTerm === '' || 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.twitterHandle && user.twitterHandle.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = 
      statusFilter === 'all' || 
      user.approvalStatus === statusFilter
    
    // Audience location filter - check possible locations
    const userLocations = user.audienceLocations || user.countries
    let matchesAudienceLocations = audienceLocations.length === 0
    
    if (audienceLocations.length > 0 && userLocations) {
      // Handle different formats
      const locationsArray = Array.isArray(userLocations) 
        ? userLocations 
        : typeof userLocations === 'string'
          ? userLocations.split(',').map(loc => loc.trim())
          : []
          
      // Check for any match
      matchesAudienceLocations = audienceLocations.some(selectedLoc => 
        locationsArray.some(userLoc => 
          userLoc.toLowerCase().includes(selectedLoc.toLowerCase())
        )
      )
      
      if (isDebugUser) {
        console.log('DEBUG - Locations filter:', { 
          audienceLocations, 
          userLocations,
          locationsArray,
          matchesAudienceLocations
        })
      }
    }
    
    // Target audience filter
    const userAudience = user.targetAudience || user.audience
    let matchesTargetAudience = targetAudience.length === 0
    
    if (targetAudience.length > 0 && userAudience) {
      // Handle different formats
      const audienceArray = Array.isArray(userAudience) 
        ? userAudience 
        : typeof userAudience === 'string'
          ? userAudience.split(',').map(a => a.trim())
          : []
          
      // Check for any match
      matchesTargetAudience = targetAudience.some(selectedAudience => 
        audienceArray.some(userAud => 
          userAud.toLowerCase().includes(selectedAudience.toLowerCase())
        )
      )
      
      if (isDebugUser) {
        console.log('DEBUG - Target Audience filter:', { 
          targetAudience, 
          userAudience,
          audienceArray,
          matchesTargetAudience
        })
      }
    }
    
    // Active chains filter - check if chains exist first
    const userChains = user.activeChains || user.chains || user.blockchains
    let matchesActiveChains = activeChains.length === 0
    
    if (activeChains.length > 0 && userChains) {
      // Convert to array if string
      const chainsArray = Array.isArray(userChains) 
        ? userChains 
        : typeof userChains === 'string'
          ? userChains.split(',').map(c => c.trim())
          : []
          
      // Check if any selected chain matches
      matchesActiveChains = activeChains.some(chain => 
        chainsArray.some(userChain => 
          userChain.toLowerCase().includes(chain.toLowerCase())
        )
      )
      
      if (isDebugUser) {
        console.log('DEBUG - Chains filter:', { 
          activeChains, 
          userChains,
          chainsArray,
          matchesActiveChains
        })
      }
    }
    
    // Content type filter
    const userContentType = user.contentType || user.contentTypes
    let matchesContentTypes = contentTypes.length === 0
    
    if (contentTypes.length > 0 && userContentType) {
      // Handle different formats
      const contentArray = Array.isArray(userContentType) 
        ? userContentType 
        : typeof userContentType === 'string'
          ? userContentType.split(',').map(c => c.trim())
          : []
          
      // Check for any match
      matchesContentTypes = contentTypes.some(selectedType => 
        contentArray.some(userType => 
          userType.toLowerCase().includes(selectedType.toLowerCase())
        )
      )
      
      if (isDebugUser) {
        console.log('DEBUG - Content Type filter:', { 
          contentTypes, 
          userContentType,
          contentArray,
          matchesContentTypes
        })
      }
    }
    
    // Price per post range filter
    const matchesPricePerPost = 
      pricePerPostRange.min === 0 && pricePerPostRange.max === 10000 || // Default range = all
      user.pricePerPost === undefined ||
      (user.pricePerPost && 
       user.pricePerPost >= pricePerPostRange.min && 
       user.pricePerPost <= pricePerPostRange.max)
    
    // Price monthly range filter
    const matchesPriceMonthly = 
      priceMonthlyRange.min === 0 && priceMonthlyRange.max === 50000 || // Default range = all
      user.priceMonthly === undefined ||
      (user.priceMonthly && 
       user.priceMonthly >= priceMonthlyRange.min && 
       user.priceMonthly <= priceMonthlyRange.max)
    
    // Platform filter - case insensitive
    let matchesPlatforms = platforms.length === 0
    
    if (platforms.length > 0 && user.socialAccounts) {
      const userPlatforms = Object.keys(user.socialAccounts).map(p => p.toLowerCase())
      
      matchesPlatforms = platforms.some(platform => 
        userPlatforms.includes(platform.toLowerCase())
      )
      
      if (isDebugUser) {
        console.log('DEBUG - Platforms filter:', { 
          platforms,
          userPlatforms,
          matchesPlatforms
        })
      }
    }
    
    // Follower range filter - calculate total followers across all platforms
    const totalFollowers = user.socialAccounts ? 
      Object.values(user.socialAccounts).reduce((sum, account) => sum + getFollowerCount(account), 0) : 0
    
    const matchesFollowerRange = 
      followerRange.min === 0 && followerRange.max === 1000000 || // Default range = all
      (totalFollowers >= followerRange.min && totalFollowers <= followerRange.max)
    
    // ROI points filter
    const matchesRoiPoints = 
      roiPointsRange.min === 0 && roiPointsRange.max === 100 || // Default range = all
      user.roiPoints === undefined ||
      (user.roiPoints && 
       user.roiPoints >= roiPointsRange.min && 
       user.roiPoints <= roiPointsRange.max)
    
    // Log all filter results for debug user
    if (isDebugUser) {
      console.log('DEBUG - Filter results:', {
        name: user.name,
        matchesSearch,
        matchesStatus,
        matchesAudienceLocations,
        matchesTargetAudience,
        matchesActiveChains,
        matchesContentTypes,
        matchesPricePerPost,
        matchesPriceMonthly,
        matchesPlatforms,
        matchesFollowerRange,
        matchesRoiPoints
      })
    }
    
    return matchesSearch && matchesStatus && matchesAudienceLocations && 
           matchesTargetAudience && matchesActiveChains && matchesContentTypes && 
           matchesPricePerPost && matchesPriceMonthly && matchesPlatforms && 
           matchesFollowerRange && matchesRoiPoints
  })
  
  // Sort users by total followers for leaderboard
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const getTotalFollowers = (user: ExtendedInfluencerProfile) => {
      if (!user.socialAccounts) return 0
      
      return Object.values(user.socialAccounts).reduce((sum, account) => 
        sum + getFollowerCount(account), 0)
    }
    
    return getTotalFollowers(b) - getTotalFollowers(a)
  })
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 font-mono text-green-300 p-4">
      <div className="absolute inset-0 animate-matrix bg-black opacity-30" />
      <div className="relative z-10 rounded border-4 border-green-400 bg-black p-6 w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl uppercase tracking-wider">Admin Panel</h1>
          <button 
            onClick={onClose}
            className="px-4 py-1 border border-green-300 hover:bg-green-800"
          >
            Close
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-green-300 mb-6">
          <button 
            className={`px-4 py-2 ${activeTab === 'dashboard' ? 'bg-green-800' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={`px-4 py-2 ${activeTab === 'search' ? 'bg-green-800' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            Search
          </button>
          <button 
            className={`px-4 py-2 ${activeTab === 'leaderboard' ? 'bg-green-800' : ''}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            Leaderboard
          </button>
        </div>
        
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-green-400 animate-pulse">Loading data...</div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status Overview */}
                <div className="border border-green-300 p-4">
                  <h2 className="text-sm uppercase mb-4">Users by Status</h2>
                  <div className="flex justify-around h-60">
                    <div className="flex flex-col items-center">
                      <div className="text-2xl">{statusTotals.approved || 0}</div>
                      <div className="h-40 w-8 bg-green-800 relative mt-2">
                        <div 
                          className="absolute bottom-0 w-full bg-green-400" 
                          style={{ height: `${((statusTotals.approved || 0) / (users.length || 1)) * 100}%` }}
                        ></div>
                      </div>
                      <div className="text-xs mt-2">Approved</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-2xl">{statusTotals.pending || 0}</div>
                      <div className="h-40 w-8 bg-green-800 relative mt-2">
                        <div 
                          className="absolute bottom-0 w-full bg-yellow-400" 
                          style={{ height: `${((statusTotals.pending || 0) / (users.length || 1)) * 100}%` }}
                        ></div>
                      </div>
                      <div className="text-xs mt-2">Pending</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-2xl">{statusTotals.rejected || 0}</div>
                      <div className="h-40 w-8 bg-green-800 relative mt-2">
                        <div 
                          className="absolute bottom-0 w-full bg-red-500" 
                          style={{ height: `${((statusTotals.rejected || 0) / (users.length || 1)) * 100}%` }}
                        ></div>
                      </div>
                      <div className="text-xs mt-2">Rejected</div>
                    </div>
                  </div>
                </div>
                
                {/* Platform Distribution */}
                <div className="border border-green-300 p-4">
                  <h2 className="text-sm uppercase mb-4">Followers by Platform</h2>
                  <div className="flex justify-center">
                    <div className="relative w-60 h-60">
                      {/* Simple pie chart implementation */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        {Object.keys(platformTotals).length === 0 ? (
                          <div className="w-40 h-40 rounded-full border-2 border-green-300 flex items-center justify-center">
                            <span className="text-xs text-center">No follower data</span>
                          </div>
                        ) : (
                          <div className="w-40 h-40 relative">
                            {/* Full colored background circle for single platform case */}
                            {Object.values(platformTotals).filter(v => v > 0).length === 1 && (
                              <div className={`absolute inset-0 rounded-full ${
                                Object.keys(platformTotals).find(key => platformTotals[key] > 0) === 'twitter' ? 'bg-blue-500' :
                                Object.keys(platformTotals).find(key => platformTotals[key] > 0) === 'instagram' ? 'bg-pink-500' :
                                Object.keys(platformTotals).find(key => platformTotals[key] > 0) === 'youtube' ? 'bg-red-500' :
                                Object.keys(platformTotals).find(key => platformTotals[key] > 0) === 'tiktok' ? 'bg-purple-500' :
                                Object.keys(platformTotals).find(key => platformTotals[key] > 0) === 'discord' ? 'bg-indigo-500' :
                                Object.keys(platformTotals).find(key => platformTotals[key] > 0) === 'telegram' ? 'bg-blue-400' :
                                Object.keys(platformTotals).find(key => platformTotals[key] > 0) === 'twitch' ? 'bg-purple-600' :
                                Object.keys(platformTotals).find(key => platformTotals[key] > 0) === 'linkedin' ? 'bg-blue-700' :
                                Object.keys(platformTotals).find(key => platformTotals[key] > 0) === 'github' ? 'bg-gray-600' :
                                'bg-green-500'
                              } border-2 border-green-300`}></div>
                            )}
                            
                            {/* Create segments for multiple platforms */}
                            {Object.values(platformTotals).filter(v => v > 0).length > 1 && (
                              <div className="absolute inset-0 rounded-full border-2 border-green-300 overflow-hidden">
                                {/* Simplified segment approach - divide circle into 24 slices */}
                                {Array.from({ length: 24 }).map((_, i) => {
                                  const platforms = Object.keys(platformTotals).filter(p => platformTotals[p] > 0);
                                  if (platforms.length === 0) return null;
                                  
                                  const totalFollowers = Object.values(platformTotals).reduce((a, b) => a + b, 0);
                                  // Calculate which slice this belongs to based on percentage
                                  const slicePercent = i / 24;
                                  
                                  // Sort platforms by follower count
                                  const sortedPlatforms = [...platforms].sort((a, b) => 
                                    platformTotals[b] - platformTotals[a]
                                  );
                                  
                                  // Find which platform this slice belongs to
                                  let cumPercent = 0;
                                  let platform = sortedPlatforms[0];
                                  
                                  for (const p of sortedPlatforms) {
                                    cumPercent += platformTotals[p] / totalFollowers;
                                    if (slicePercent <= cumPercent) {
                                      platform = p;
                                      break;
                                    }
                                  }
                                  
                                  // Calculate position based on slice index
                                  const angle = (i / 24) * Math.PI * 2;
                                  const nextAngle = ((i + 1) / 24) * Math.PI * 2;
                                  
                                  // Calculate CSS for pie slice shape
                                  const rotate = `rotate(${i * 15}deg)`;
                                  
                                  // Color based on platform
                                  const colors: Record<string, string> = {
                                    twitter: 'bg-blue-500',
                                    instagram: 'bg-pink-500',
                                    youtube: 'bg-red-500',
                                    tiktok: 'bg-purple-500',
                                    discord: 'bg-indigo-500',
                                    telegram: 'bg-blue-400',
                                    twitch: 'bg-purple-600',
                                    linkedin: 'bg-blue-700',
                                    github: 'bg-gray-600',
                                  };
                                  
                                  const color = colors[platform] || 'bg-green-500';
                                  
                                  return (
                                    <div 
                                      key={i}
                                      className={`absolute top-0 left-0 w-full h-full ${color}`}
                                      style={{
                                        clipPath: 'polygon(50% 50%, 100% 0%, 100% 33%)',
                                        transform: rotate,
                                        transformOrigin: 'center',
                                      }}
                                    ></div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Legend */}
                      <div className="absolute right-0 top-0 text-xs">
                        {Object.entries(platformTotals).map(([platform, count], i) => (
                          <div key={platform} className="flex items-center mt-1">
                            <div 
                              className={`w-3 h-3 mr-1 ${
                                platform === 'twitter' ? 'bg-blue-500' :
                                platform === 'instagram' ? 'bg-pink-500' :
                                platform === 'youtube' ? 'bg-red-500' :
                                platform === 'tiktok' ? 'bg-purple-500' :
                                platform === 'discord' ? 'bg-indigo-500' :
                                platform === 'telegram' ? 'bg-blue-400' :
                                platform === 'twitch' ? 'bg-purple-600' :
                                platform === 'linkedin' ? 'bg-blue-700' :
                                platform === 'github' ? 'bg-gray-600' :
                                'bg-green-500'
                              }`}
                            ></div>
                            <div>
                              {platform}: {count.toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Monthly Trends */}
                <div className="border border-green-300 p-4 col-span-1 md:col-span-2">
                  <h2 className="text-sm uppercase mb-4">Monthly Trends</h2>
                  {monthlyData.length > 0 ? (
                    <div className="h-60 flex items-end">
                      {monthlyData.map((data, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center">
                          <div className="flex h-48 space-x-1">
                            <div className="w-4 bg-green-800 relative">
                              <div 
                                className="absolute bottom-0 w-full bg-green-400" 
                                style={{ height: `${data.approved * 2}px` }}
                              ></div>
                            </div>
                            <div className="w-4 bg-green-800 relative">
                              <div 
                                className="absolute bottom-0 w-full bg-yellow-400" 
                                style={{ height: `${data.pending * 2}px` }}
                              ></div>
                            </div>
                            <div className="w-4 bg-green-800 relative">
                              <div 
                                className="absolute bottom-0 w-full bg-red-500" 
                                style={{ height: `${data.rejected * 2}px` }}
                              ></div>
                            </div>
                          </div>
                          <div className="text-xs mt-2">{data.month}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-60 flex items-center justify-center">
                      <div className="text-green-400">No monthly data available</div>
                    </div>
                  )}
                  <div className="flex justify-center mt-2 text-xs">
                    <div className="flex items-center mx-2">
                      <div className="w-3 h-3 bg-green-400 mr-1"></div>
                      <span>Approved</span>
                    </div>
                    <div className="flex items-center mx-2">
                      <div className="w-3 h-3 bg-yellow-400 mr-1"></div>
                      <span>Pending</span>
                    </div>
                    <div className="flex items-center mx-2">
                      <div className="w-3 h-3 bg-red-500 mr-1"></div>
                      <span>Rejected</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Search Tab */}
            {activeTab === 'search' && (
              <div>
                <div className="flex flex-wrap gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Search by name or handle..."
                    className="bg-black border border-green-300 p-2 text-xs flex-1"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                  
                  <select 
                    className="bg-black border border-green-300 p-2 text-xs"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                
                {/* Advanced Filters Section */}
                <div className="border border-green-300 p-4 mb-4">
                  <h3 className="text-sm uppercase mb-3">Advanced Filters</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    {/* 1. Audience Location filter */}
                    <div className="relative">
                      <label className="text-xs block mb-1">Audience Location</label>
                      <div className="flex flex-wrap gap-1 mb-1">
                        {audienceLocations.map(loc => {
                          const country = countries.find(c => c.code === loc)
                          return (
                            <div key={loc} className="bg-green-900 text-xs px-2 py-1 rounded flex items-center">
                              {country?.name || loc}
                              <button 
                                className="ml-1 text-red-500"
                                onClick={() => setAudienceLocations(prev => prev.filter(l => l !== loc))}
                              >
                                ×
                              </button>
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex">
                        <input
                          type="text"
                          placeholder="Search countries..."
                          className="bg-black border border-green-300 p-2 text-xs flex-1"
                          value={countrySearch}
                          onChange={e => setCountrySearch(e.target.value)}
                          onFocus={() => setShowCountryDropdown(true)}
                        />
                      </div>
                      {showCountryDropdown && (
                        <div className="absolute z-10 bg-black border border-green-300 mt-1 max-h-40 overflow-y-auto w-full">
                          {filteredCountries.map(country => (
                            <div 
                              key={country.code}
                              className={`p-2 text-xs cursor-pointer hover:bg-green-900 ${
                                audienceLocations.includes(country.code) ? 'bg-green-900' : ''
                              }`}
                              onClick={() => {
                                toggleSelection(country.code, audienceLocations, setAudienceLocations)
                                // Don't close dropdown, allow multiple selections
                              }}
                            >
                              {country.name} ({country.code})
                            </div>
                          ))}
                          <div className="p-2 border-t border-green-300">
                            <button 
                              className="text-xs w-full text-center"
                              onClick={() => setShowCountryDropdown(false)}
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* 2. Target Audience filter */}
                    <div>
                      <label className="text-xs block mb-1">Target Audience</label>
                      <div className="flex justify-between mb-2">
                        <div className="flex gap-2">
                          <button 
                            className="text-xs px-2 py-1 bg-green-900 rounded"
                            onClick={() => setTargetAudience(targetAudienceOptions)}
                          >
                            Select All
                          </button>
                          <button 
                            className="text-xs px-2 py-1 bg-black border border-green-300 rounded"
                            onClick={() => setTargetAudience([])}
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {targetAudienceOptions.map(option => (
                          <div 
                            key={option}
                            className={`text-xs px-2 py-1 rounded cursor-pointer ${
                              targetAudience.includes(option) ? 'bg-green-900' : 'bg-black border border-green-300'
                            }`}
                            onClick={() => toggleSelection(option, targetAudience, setTargetAudience)}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* 3. Active Chains filter */}
                    <div>
                      <label className="text-xs block mb-1">Active Chains</label>
                      <div className="flex justify-between mb-2">
                        <div className="flex gap-2">
                          <button 
                            className="text-xs px-2 py-1 bg-green-900 rounded"
                            onClick={() => setActiveChains(chainOptions)}
                          >
                            Select All
                          </button>
                          <button 
                            className="text-xs px-2 py-1 bg-black border border-green-300 rounded"
                            onClick={() => setActiveChains([])}
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {chainOptions.map(chain => (
                          <div 
                            key={chain}
                            className={`text-xs px-2 py-1 rounded cursor-pointer ${
                              activeChains.includes(chain) ? 'bg-green-900' : 'bg-black border border-green-300'
                            }`}
                            onClick={() => toggleSelection(chain, activeChains, setActiveChains)}
                          >
                            {chain}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* 4. Content Type filter */}
                    <div>
                      <label className="text-xs block mb-1">Content Type</label>
                      <div className="flex justify-between mb-2">
                        <div className="flex gap-2">
                          <button 
                            className="text-xs px-2 py-1 bg-green-900 rounded"
                            onClick={() => setContentTypes(contentTypeOptions)}
                          >
                            Select All
                          </button>
                          <button 
                            className="text-xs px-2 py-1 bg-black border border-green-300 rounded"
                            onClick={() => setContentTypes([])}
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {contentTypeOptions.map(type => (
                          <div 
                            key={type}
                            className={`text-xs px-2 py-1 rounded cursor-pointer ${
                              contentTypes.includes(type) ? 'bg-green-900' : 'bg-black border border-green-300'
                            }`}
                            onClick={() => toggleSelection(type, contentTypes, setContentTypes)}
                          >
                            {type}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* 5. Price Per Post Range */}
                    <div>
                      <label className="text-xs block mb-1">
                        Price Per Post: ${pricePerPostRange.min} - ${pricePerPostRange.max}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          className="bg-black border border-green-300 p-2 text-xs w-20"
                          value={pricePerPostRange.min}
                          onChange={e => setPricePerPostRange({...pricePerPostRange, min: Number(e.target.value)})}
                        />
                        <span>-</span>
                        <input
                          type="number"
                          placeholder="Max"
                          className="bg-black border border-green-300 p-2 text-xs w-20"
                          value={pricePerPostRange.max}
                          onChange={e => setPricePerPostRange({...pricePerPostRange, max: Number(e.target.value)})}
                        />
                      </div>
                    </div>
                    
                    {/* 6. Price Monthly Range */}
                    <div>
                      <label className="text-xs block mb-1">
                        Monthly Price: ${priceMonthlyRange.min} - ${priceMonthlyRange.max}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          className="bg-black border border-green-300 p-2 text-xs w-20"
                          value={priceMonthlyRange.min}
                          onChange={e => setPriceMonthlyRange({...priceMonthlyRange, min: Number(e.target.value)})}
                        />
                        <span>-</span>
                        <input
                          type="number"
                          placeholder="Max"
                          className="bg-black border border-green-300 p-2 text-xs w-20"
                          value={priceMonthlyRange.max}
                          onChange={e => setPriceMonthlyRange({...priceMonthlyRange, max: Number(e.target.value)})}
                        />
                      </div>
                    </div>
                    
                    {/* 7. Platform filter */}
                    <div>
                      <label className="text-xs block mb-1">Platforms</label>
                      <div className="flex justify-between mb-2">
                        <div className="flex gap-2">
                          <button 
                            className="text-xs px-2 py-1 bg-green-900 rounded"
                            onClick={() => setPlatforms(platformOptions)}
                          >
                            Select All
                          </button>
                          <button 
                            className="text-xs px-2 py-1 bg-black border border-green-300 rounded"
                            onClick={() => setPlatforms([])}
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {platformOptions.map(platform => (
                          <div 
                            key={platform}
                            className={`text-xs px-2 py-1 rounded cursor-pointer ${
                              platforms.includes(platform) ? 'bg-green-900' : 'bg-black border border-green-300'
                            }`}
                            onClick={() => toggleSelection(platform, platforms, setPlatforms)}
                          >
                            {platform}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* 9. Follower Range */}
                    <div>
                      <label className="text-xs block mb-1">
                        Follower Range: {followerRange.min.toLocaleString()} - {followerRange.max.toLocaleString()}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          className="bg-black border border-green-300 p-2 text-xs w-20"
                          value={followerRange.min}
                          onChange={e => setFollowerRange({...followerRange, min: Number(e.target.value)})}
                        />
                        <span>-</span>
                        <input
                          type="number"
                          placeholder="Max"
                          className="bg-black border border-green-300 p-2 text-xs w-20"
                          value={followerRange.max}
                          onChange={e => setFollowerRange({...followerRange, max: Number(e.target.value)})}
                        />
                      </div>
                    </div>
                    
                    {/* 10. ROI Points Range */}
                    <div>
                      <label className="text-xs block mb-1">
                        ROI Points: {roiPointsRange.min} - {roiPointsRange.max}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          className="bg-black border border-green-300 p-2 text-xs w-20"
                          value={roiPointsRange.min}
                          onChange={e => setRoiPointsRange({...roiPointsRange, min: Number(e.target.value)})}
                        />
                        <span>-</span>
                        <input
                          type="number"
                          placeholder="Max"
                          className="bg-black border border-green-300 p-2 text-xs w-20"
                          value={roiPointsRange.max}
                          onChange={e => setRoiPointsRange({...roiPointsRange, max: Number(e.target.value)})}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Reset Filters button */}
                  <button 
                    className="px-3 py-1 border border-red-500 text-red-500 hover:bg-red-900 hover:text-white text-xs"
                    onClick={() => {
                      setAudienceLocations([])
                      setTargetAudience([])
                      setActiveChains([])
                      setContentTypes([])
                      setPlatforms([])
                      setPricePerPostRange({min: 0, max: 10000})
                      setPriceMonthlyRange({min: 0, max: 50000})
                      setFollowerRange({min: 0, max: 1000000})
                      setRoiPointsRange({min: 0, max: 100})
                    }}
                  >
                    Reset Filters
                  </button>
                  
                  {/* Debug toggle */}
                  <div className="flex items-center mt-4 border-t border-green-300 pt-2">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="form-checkbox h-4 w-4 text-green-400 bg-black border-green-300"
                        checked={debugMode}
                        onChange={e => setDebugMode(e.target.checked)}
                      />
                      <span className="ml-2 text-xs">Debug Mode</span>
                    </label>
                    
                    {debugMode && (
                      <div className="ml-4 flex-1">
                        <input
                          type="text"
                          placeholder="Debug User Name"
                          className="bg-black border border-yellow-400 p-2 text-xs w-full"
                          value={debugUser}
                          onChange={e => setDebugUser(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-green-300">
                        <th className="p-2 text-left">ID</th>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Twitter</th>
                        <th className="p-2 text-left">Created</th>
                        <th className="p-2 text-left">Status</th>
                        <th className="p-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map(user => (
                          <tr key={user.id} className="border-b border-green-300/30 hover:bg-green-900/20">
                            <td className="p-2">{user.id.substr(0, 8)}...</td>
                            <td className="p-2">{user.name}</td>
                            <td className="p-2">{user.twitterHandle || 'N/A'}</td>
                            <td className="p-2">{new Date(user.createdAt).toLocaleDateString()}</td>
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded text-black ${
                                user.approvalStatus === 'approved' ? 'bg-green-400' :
                                user.approvalStatus === 'pending' ? 'bg-yellow-400' :
                                'bg-red-500'
                              }`}>
                                {user.approvalStatus}
                              </span>
                            </td>
                            <td className="p-2">
                              <button 
                                className="px-2 py-1 border border-green-300 hover:bg-green-800 text-xs mr-1"
                                onClick={() => handleView(user.id)}
                              >
                                View
                              </button>
                              {user.approvalStatus !== 'approved' && (
                                <button 
                                  className="px-2 py-1 border border-green-300 hover:bg-green-800 text-xs"
                                  onClick={() => handleApprove(user.id)}
                                >
                                  Approve
                                </button>
                              )}
                              {user.approvalStatus !== 'rejected' && (
                                <button 
                                  className="px-2 py-1 border border-red-500 text-red-500 hover:bg-red-900 hover:text-white text-xs ml-1"
                                  onClick={() => handleReject(user.id)}
                                >
                                  Reject
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-4 text-center">No users found matching your criteria</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Leaderboard Tab */}
            {activeTab === 'leaderboard' && (
              <div>
                <div className="flex flex-wrap gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Search by name or handle..."
                    className="bg-black border border-green-300 p-2 text-xs flex-1"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                  
                  <select 
                    className="bg-black border border-green-300 p-2 text-xs"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-green-300">
                        <th className="p-2 text-left">Rank</th>
                        <th className="p-2 text-left">KOL</th>
                        <th className="p-2 text-left">Twitter</th>
                        <th className="p-2 text-right">Twitter Followers</th>
                        <th className="p-2 text-right">Instagram Followers</th>
                        <th className="p-2 text-right">YouTube Followers</th>
                        <th className="p-2 text-right">Total Followers</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {sortedUsers.length > 0 ? (
                        sortedUsers.map((user, index) => (
                          <tr key={user.id} className="border-b border-green-300/30 hover:bg-green-900/20">
                            <td className="p-2">{index + 1}</td>
                            <td className="p-2">{user.name}</td>
                            <td className="p-2">{user.twitterHandle || 'N/A'}</td>
                            <td className="p-2 text-right">
                              {getFollowerCount(user.socialAccounts?.twitter).toLocaleString()}
                            </td>
                            <td className="p-2 text-right">
                              {getFollowerCount(user.socialAccounts?.instagram).toLocaleString()}
                            </td>
                            <td className="p-2 text-right">
                              {getFollowerCount(user.socialAccounts?.youtube).toLocaleString()}
                            </td>
                            <td className="p-2 text-right font-bold">
                              {Object.values(user.socialAccounts || {}).reduce((sum, account) => 
                                sum + getFollowerCount(account), 0).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-4 text-center">No users found matching your criteria</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 