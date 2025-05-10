'use client'
import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { InfluencerProfile } from '../lib/redis'
import Image from 'next/image'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js'
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

// We'll create a new interface without extending InfluencerProfile to avoid type conflicts
interface KOLProfile {
  id: string;
  name: string;
  handle?: string;
  email?: string;
  approvalStatus?: string;
  followers?: number;
  countries?: string;
  wallets?: Record<string, string>;
  walletType?: string;
  experience?: string;
  audienceLocations?: string[] | string;
  targetAudience?: string[] | string;
  audience?: string[] | string;
  activeChains?: string[] | string;
  chains?: string[];
  blockchains?: string;
  contentType?: string[] | string;
  contentTypes?: string;
  pricePerPost?: number;
  priceMonthly?: number;
  roiPoints?: number;
  createdAt?: string;
  country?: string;
  walletCount?: number;
  platformsUsed?: string[];
}

// Constants for filter options
const audienceOptions = [
  'NFT Collectors',
  'DeFi Users',
  'Crypto Traders',
  'Blockchain Developers',
  'Gaming Community',
  'Art Collectors'
];

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
];

const contentTypeOptions = [
  'Thread',
  'Video',
  'Stream',
  'Space'
];

const platformOptions = [
  'Twitter',
  'Farcaster',
  'Twitch',
  'YouTube',
  'Discord',
  'Telegram',
  'Instagram',
  'TikTok'
];

const allCountries = [
  'United States', 'Japan', 'United Kingdom', 'Germany', 'India', 
  'Brazil', 'Canada', 'Australia', 'France', 'China',
  'Russia', 'South Korea', 'Singapore', 'UAE', 'Nigeria'
];

interface StatusTotals {
  approved: number;
  pending: number;
  rejected: number;
  [key: string]: number;
}

// Chart data types
type LineChartData = ChartData<'line'>;
type BarChartData = ChartData<'bar'>;
type PieChartData = ChartData<'pie'>;
type DoughnutChartData = ChartData<'doughnut'>;

// Chart options types
type LineChartOptions = ChartOptions<'line'>;
type BarChartOptions = ChartOptions<'bar'>;
type PieChartOptions = ChartOptions<'pie'>;
type DoughnutChartOptions = ChartOptions<'doughnut'>;

type Tab = 'dashboard' | 'search' | 'leaderboard' | 'roles'

// Helper function to safely get follower count from social accounts
const getFollowerCount = (data: unknown): number => {
  if (!data) return 0
  if (typeof data === 'object' && data !== null) {
    if ('followers' in data && typeof data.followers === 'number') {
      return data.followers
    }
    if ('subscribers' in data && typeof data.subscribers === 'number') {
      return data.subscribers
    }
  }
  return 0
}

interface AdminPanelProps {
  onClose: () => void;
}

// Chart utility functions
const generateRandomDates = (days: number) => {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }
  
  return dates;
};

const generateRandomTrend = (days: number, minRange: number, maxRange: number) => {
  return Array(days).fill(0).map(() => Math.floor(Math.random() * (maxRange - minRange) + minRange));
};

const getTop5Countries = (users: KOLProfile[]) => {
  const countryCounts: Record<string, number> = {};
  
  users.forEach(user => {
    if (user.country) {
      countryCounts[user.country] = (countryCounts[user.country] || 0) + 1;
    }
  });
  
  return Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
};

const getChainDistribution = (users: KOLProfile[]) => {
  const chainCounts: Record<string, number> = {};
  
  users.forEach(user => {
    if (user.chains && user.chains.length > 0) {
      user.chains.forEach(chain => {
        chainCounts[chain] = (chainCounts[chain] || 0) + 1;
      });
    }
  });
  
  return chainCounts;
};

const getContentTypeDistribution = (users: KOLProfile[]) => {
  const contentTypeCounts: Record<string, number> = {
    'Thread': 0,
    'Video': 0,
    'Stream': 0,
    'Space': 0,
    'Other': 0
  };
  
  users.forEach(user => {
    if (user.contentType) {
      const types = Array.isArray(user.contentType) ? user.contentType : [user.contentType];
      
      types.forEach(type => {
        if (type in contentTypeCounts) {
          contentTypeCounts[type] += 1;
        } else {
          contentTypeCounts['Other'] += 1;
        }
      });
    }
  });
  
  return contentTypeCounts;
};

const getWalletConnectionRatio = (users: KOLProfile[]) => {
  const walletCounts: Record<string, number> = {
    '0 Wallets': 0,
    '1 Wallet': 0,
    '2 Wallets': 0,
    '3+ Wallets': 0
  };
  
  users.forEach(user => {
    const count = user.walletCount || 0;
    
    if (count === 0) walletCounts['0 Wallets']++;
    else if (count === 1) walletCounts['1 Wallet']++;
    else if (count === 2) walletCounts['2 Wallets']++;
    else walletCounts['3+ Wallets']++;
  });
  
  return walletCounts;
};

const getPlatformsDistribution = (users: KOLProfile[]) => {
  const platformCounts: Record<string, number> = {};
  
  users.forEach(user => {
    if (user.platformsUsed && user.platformsUsed.length > 0) {
      user.platformsUsed.forEach(platform => {
        platformCounts[platform] = (platformCounts[platform] || 0) + 1;
      });
    }
  });
  
  return Object.entries(platformCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
};

// Add ProfileModal component before AdminPanel component
function ProfileModal({ 
  user, 
  onClose, 
  onStatusChange 
}: { 
  user: KOLProfile; 
  onClose: () => void; 
  onStatusChange: (userId: string, newStatus: 'approved' | 'pending' | 'rejected') => void;
}) {
  if (!user) return null;
  
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80">
      <div 
        className="absolute inset-0"
        onClick={onClose}
      ></div>
      <div className="relative z-10 bg-black border-2 border-green-400 p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <button 
          className="absolute top-2 right-2 text-green-300 hover:text-green-100"
          onClick={onClose}
        >
          ✕
        </button>
        
        <h2 className="text-xl mb-4 uppercase tracking-widest border-b border-green-400 pb-2">
          User Profile
        </h2>
        
        <div className="grid grid-cols-2 gap-6">
          {/* Basic Info */}
          <div className="mb-4">
            <h3 className="text-md border-b border-green-300/50 mb-2 pb-1">Basic Info</h3>
            <div className="space-y-1">
              <div className="flex">
                <span className="font-bold mr-2 w-24">ID:</span>
                <span className="text-xs font-mono pt-1">{user.id}</span>
              </div>
              <div className="flex">
                <span className="font-bold mr-2 w-24">Name:</span>
                <span>{user.name}</span>
              </div>
              {user.handle && (
                <div className="flex">
                  <span className="font-bold mr-2 w-24">Handle:</span>
                  <span>{user.handle}</span>
                </div>
              )}
              {user.email && (
                <div className="flex">
                  <span className="font-bold mr-2 w-24">Email:</span>
                  <span>{user.email}</span>
                </div>
              )}
              <div className="flex">
                <span className="font-bold mr-2 w-24">Status:</span>
                <span 
                  className={`px-2 rounded ${
                    user.approvalStatus === 'approved' 
                      ? 'bg-green-900 text-green-300' 
                      : user.approvalStatus === 'rejected'
                        ? 'bg-red-900 text-red-300'
                        : 'bg-yellow-900 text-yellow-300'
                  }`}
                >
                  {user.approvalStatus || 'pending'}
                </span>
              </div>
              {user.createdAt && (
                <div className="flex">
                  <span className="font-bold mr-2 w-24">Created:</span>
                  <span>{new Date(user.createdAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Stats */}
          <div className="mb-4">
            <h3 className="text-md border-b border-green-300/50 mb-2 pb-1">Stats</h3>
            <div className="space-y-1">
              <div className="flex">
                <span className="font-bold mr-2 w-24">Followers:</span>
                <span>{user.followers?.toLocaleString() || '0'}</span>
              </div>
              {user.country && (
                <div className="flex">
                  <span className="font-bold mr-2 w-24">Country:</span>
                  <span>{user.country}</span>
                </div>
              )}
              {user.pricePerPost && (
                <div className="flex">
                  <span className="font-bold mr-2 w-24">Per Post:</span>
                  <span>${user.pricePerPost}</span>
                </div>
              )}
              {user.priceMonthly && (
                <div className="flex">
                  <span className="font-bold mr-2 w-24">Monthly:</span>
                  <span>${user.priceMonthly}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Content */}
          <div className="mb-4">
            <h3 className="text-md border-b border-green-300/50 mb-2 pb-1">Content</h3>
            <div className="space-y-1">
              <div className="flex items-start">
                <span className="font-bold mr-2 w-24">Content Types:</span>
                <span>
                  {Array.isArray(user.contentType) 
                    ? user.contentType.join(', ')
                    : typeof user.contentType === 'string'
                      ? user.contentType
                      : user.contentTypes || 'Not specified'}
                </span>
              </div>
              <div className="flex items-start">
                <span className="font-bold mr-2 w-24">Audience:</span>
                <span>
                  {Array.isArray(user.targetAudience) 
                    ? user.targetAudience.join(', ')
                    : typeof user.targetAudience === 'string'
                      ? user.targetAudience
                      : user.audience || 'Not specified'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Blockchain */}
          <div className="mb-4">
            <h3 className="text-md border-b border-green-300/50 mb-2 pb-1">Blockchain</h3>
            <div className="space-y-1">
              <div className="flex items-start">
                <span className="font-bold mr-2 w-24">Chains:</span>
                <span>
                  {Array.isArray(user.chains)
                    ? user.chains.join(', ')
                    : typeof user.chains === 'string'
                      ? user.chains
                      : user.blockchains || user.activeChains || 'Not specified'}
                </span>
              </div>
              <div className="flex items-start">
                <span className="font-bold mr-2 w-24">Wallets:</span>
                <div className="flex-1">
                  {user.wallets && Object.keys(user.wallets).length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {Object.entries(user.wallets).map(([type, address]) => (
                        <div key={type} className="text-xs font-mono">
                          <span className="text-gray-400">{type}:</span> {address}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span>No wallets connected</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Platforms */}
          <div className="col-span-2 mb-4">
            <h3 className="text-md border-b border-green-300/50 mb-2 pb-1">Social Platforms</h3>
            <div className="space-y-1">
              {user.platformsUsed && user.platformsUsed.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {user.platformsUsed.map(platform => (
                    <div key={platform} className="flex items-center">
                      <span className="font-bold mr-2 w-24">{platform}:</span>
                      <span>Connected</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span>No platforms specified</span>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="col-span-2 flex justify-end space-x-2 pt-4 border-t border-green-300/30">
            <select
              value={user.approvalStatus || 'pending'}
              onChange={(e) => {
                onStatusChange(user.id, e.target.value as 'approved' | 'pending' | 'rejected');
              }}
              className={`text-xs p-2 bg-black border ${
                user.approvalStatus === 'approved' 
                  ? 'border-green-500 text-green-400' 
                  : user.approvalStatus === 'rejected'
                    ? 'border-red-500 text-red-400'
                    : 'border-yellow-500 text-yellow-400'
              }`}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button 
              className="bg-green-800 text-green-100 px-4 py-2 text-xs hover:bg-green-700"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [statusTotals, setStatusTotals] = useState<StatusTotals>({
    approved: 0,
    pending: 0,
    rejected: 0
  })
  
  // Chart data states
  const [signupTrendData, setSignupTrendData] = useState<any>(null)
  const [approvalStatusData, setApprovalStatusData] = useState<any>(null)
  const [countryDistributionData, setCountryDistributionData] = useState<any>(null)
  const [chainDistributionData, setChainDistributionData] = useState<any>(null)
  const [contentTypeData, setContentTypeData] = useState<any>(null)
  const [walletConnectionData, setWalletConnectionData] = useState<any>(null)
  const [platformsDistributionData, setPlatformsDistributionData] = useState<any>(null)
  
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
  
  // Show/hide advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  
  // Debug mode
  const [debugMode, setDebugMode] = useState(false)
  const [debugUser, setDebugUser] = useState<string>('')
  
  // Search states for dropdowns
  const [countrySearch, setCountrySearch] = useState('')
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  
  const [users, setUsers] = useState<KOLProfile[]>([])
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
  
  // Load users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Fetch data from the backend API instead of using mock data
        const response = await fetch('/api/admin/get-users');
        
        if (!response.ok) {
          throw new Error('Failed to fetch users data');
        }
        
        const userData = await response.json();
        
        // Use the real data if available, or fall back to mock data for development
        const usersData: KOLProfile[] = userData.users.length > 0 
          ? userData.users.map((user: any) => ({
              id: user.id || `user_${Math.random().toString(36).substring(7)}`,
              name: user.name || 'No Name',
              handle: user.handle || `@user_${Math.random().toString(36).substring(7)}`,
              email: user.email,
              approvalStatus: user.approvalStatus || 'pending',
              followers: user.totalFollowers || Math.floor(Math.random() * 100000),
              chains: user.chains || [chainOptions[Math.floor(Math.random() * chainOptions.length)]],
              createdAt: user.createdAt || new Date().toISOString(),
              country: user.country || 'United States',
              walletCount: user.wallets ? Object.keys(user.wallets).length : 0,
              contentType: user.contentType || ['Thread'],
              platformsUsed: user.socialProfiles ? Object.keys(user.socialProfiles) : ['Twitter']
            }))
          : generateMockUsers();
        
        setUsers(usersData);
        
        // Calculate status totals
        const totals: StatusTotals = usersData.reduce((acc: StatusTotals, user) => {
          const status = user.approvalStatus || 'pending';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {approved: 0, pending: 0, rejected: 0});
        
        setStatusTotals(totals);
        
        // Fetch signup trend data from API
        try {
          const trendResponse = await fetch('/api/admin/stats?type=signups');
          if (trendResponse.ok) {
            const trendData = await trendResponse.json();
            
            // If we have real data, use it
            if (trendData && trendData.dates && trendData.counts) {
              setSignupTrendData({
                labels: trendData.dates,
                datasets: [
                  {
                    label: 'New Signups',
                    data: trendData.counts,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    tension: 0.3
                  }
                ]
              });
            } else {
              // Fallback to generated data
              const signupDates = generateRandomDates(30);
              const signupCounts = generateRandomTrend(30, 0, 10);
              
              setSignupTrendData({
                labels: signupDates,
                datasets: [
                  {
                    label: 'New Signups',
                    data: signupCounts,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    tension: 0.3
                  }
                ]
              });
            }
          }
        } catch (error) {
          console.error('Error fetching signup trend data:', error);
          // Fallback to generated data if API fails
          const signupDates = generateRandomDates(30);
          const signupCounts = generateRandomTrend(30, 0, 10);
          
          setSignupTrendData({
            labels: signupDates,
            datasets: [
              {
                label: 'New Signups',
                data: signupCounts,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                tension: 0.3
              }
            ]
          });
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching users:', error);
        // Fallback to mock data if API fails
        const mockUsers = generateMockUsers();
        setUsers(mockUsers);
        
        const totals: StatusTotals = mockUsers.reduce((acc: StatusTotals, user) => {
          const status = user.approvalStatus || 'pending';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {approved: 0, pending: 0, rejected: 0});
        
        setStatusTotals(totals);
        setLoading(false);
      }
    };
    
    fetchUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Helper function to generate mock users for development or fallback
  const generateMockUsers = (): KOLProfile[] => {
    return Array(15).fill(0).map((_, i) => {
      // Generate random date in the last 30 days
      const randomDate = new Date();
      randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 30));
      
      // Generate random number of wallets (0-3)
      const walletCount = Math.floor(Math.random() * 4);
      
      // Generate random content type
      const contentTypes = ['Thread', 'Video', 'Stream', 'Space'];
      const randomContentType = [contentTypes[Math.floor(Math.random() * contentTypes.length)]];
      
      // Generate random country
      const countries = ['United States', 'Japan', 'United Kingdom', 'Germany', 'India', 'Brazil', 'Canada', 'Australia'];
      const randomCountry = countries[Math.floor(Math.random() * countries.length)];
      
      // Generate random platforms
      const platforms = ['Twitter', 'Farcaster', 'Twitch', 'YouTube', 'Discord', 'Telegram', 'Instagram', 'TikTok'];
      const randomPlatforms: string[] = [];
      const numPlatforms = Math.floor(Math.random() * 3) + 1; // 1-3 platforms
      
      for (let j = 0; j < numPlatforms; j++) {
        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        if (!randomPlatforms.includes(platform)) {
          randomPlatforms.push(platform);
        }
      }
      
      // Get a random blockchain
      const randomChain = chainOptions[Math.floor(Math.random() * chainOptions.length)];
      
      return {
        id: `user_${i}`,
        name: `User ${i}`,
        handle: `@user${i}`,
        email: `user${i}@example.com`,
        approvalStatus: ['approved', 'pending', 'rejected'][Math.floor(Math.random() * 3)],
        followers: Math.floor(Math.random() * 100000),
        chains: [randomChain],
        createdAt: randomDate.toISOString(),
        country: randomCountry,
        walletCount: walletCount,
        contentType: randomContentType,
        platformsUsed: randomPlatforms
      };
    });
  };
  
  // Filter users based on search and status
  const filteredUsers = users.filter(user => {
    // Apply search filter
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.handle && user.handle.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (debugMode && debugUser && user.id === debugUser)
    
    // Apply status filter
    const matchesStatus = statusFilter === 'all' || user.approvalStatus === statusFilter
    
    return matchesSearch && matchesStatus
  })
  
  // Update chart data when users or status totals change
  useEffect(() => {
    if (users.length > 0 && !loading) {
      updateChartData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, statusTotals, loading]);
  
  // Handle approval status change
  const handleApprove = (userId: string) => {
    setUsers(prev => prev.map(user => 
      user.id === userId ? {...user, approvalStatus: 'approved'} : user
    ))
  }
  
  const handleReject = (userId: string) => {
    setUsers(prev => prev.map(user => 
      user.id === userId ? {...user, approvalStatus: 'rejected'} : user
    ))
  }
  
  const handleView = (userId: string) => {
    // Find the user from the list
    const user = users.find(u => u.id === userId);
    if (user) {
      // Simple alert with user details
      alert(`User Profile: ${user.name}\nHandle: ${user.handle || 'N/A'}\nFollowers: ${user.followers?.toLocaleString() || '0'}\nApproval Status: ${user.approvalStatus || 'pending'}`);
    } else {
      console.error(`User not found with ID: ${userId}`);
    }
  }
  
  // Update all chart data based on current users
  const updateChartData = () => {
    // Approval status pie chart
    setApprovalStatusData({
      labels: ['Approved', 'Pending', 'Rejected'],
      datasets: [
        {
          data: [statusTotals.approved || 0, statusTotals.pending || 0, statusTotals.rejected || 0],
          backgroundColor: [
            'rgba(75, 192, 192, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(255, 99, 132, 0.8)'
          ],
          borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(255, 99, 132, 1)'
          ],
          borderWidth: 1
        }
      ]
    });
    
    // Country distribution
    const topCountries = getTop5Countries(users);
    setCountryDistributionData({
      labels: topCountries.map(country => country[0]),
      datasets: [
        {
          label: 'Users by Country',
          data: topCountries.map(country => country[1]),
          backgroundColor: 'rgba(54, 162, 235, 0.8)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }
      ]
    });
    
    // Chain distribution
    const chainCounts = getChainDistribution(users);
    setChainDistributionData({
      labels: Object.keys(chainCounts),
      datasets: [
        {
          label: 'Users by Chain',
          data: Object.values(chainCounts),
          backgroundColor: [
            'rgba(75, 192, 192, 0.8)',
            'rgba(255, 99, 132, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(153, 102, 255, 0.8)'
          ],
          borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1
        }
      ]
    });
    
    // Content type distribution
    const contentTypeCounts = getContentTypeDistribution(users);
    setContentTypeData({
      labels: Object.keys(contentTypeCounts),
      datasets: [
        {
          data: Object.values(contentTypeCounts),
          backgroundColor: [
            'rgba(75, 192, 192, 0.8)',
            'rgba(255, 99, 132, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(153, 102, 255, 0.8)'
          ],
          borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1
        }
      ]
    });
    
    // Wallet connection ratio
    const walletCounts = getWalletConnectionRatio(users);
    setWalletConnectionData({
      labels: Object.keys(walletCounts),
      datasets: [
        {
          data: Object.values(walletCounts),
          backgroundColor: [
            'rgba(54, 162, 235, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(153, 102, 255, 0.8)'
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1,
          borderRadius: 5,
          spacing: 2
        }
      ]
    });
    
    // Platforms distribution
    const platformsData = getPlatformsDistribution(users);
    setPlatformsDistributionData({
      labels: platformsData.map(platform => platform[0]),
      datasets: [
        {
          label: 'Users by Platform',
          data: platformsData.map(platform => platform[1]),
          backgroundColor: 'rgba(153, 102, 255, 0.8)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 1
        }
      ]
    });
  };
  
  // Function to update user status
  const updateUserStatus = async (userId: string, newStatus: 'approved' | 'pending' | 'rejected') => {
    try {
      // Optimistically update UI first
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, approvalStatus: newStatus } 
            : user
        )
      );
      
      // Update status totals
      setStatusTotals(prev => {
        const user = users.find(u => u.id === userId);
        const oldStatus = user?.approvalStatus || 'pending';
        
        return {
          ...prev,
          [oldStatus]: (prev[oldStatus] || 0) - 1,
          [newStatus]: (prev[newStatus] || 0) + 1
        };
      });
      
      // Then send update to server
      const response = await fetch('/api/admin/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          status: newStatus
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user status');
      }
      
      console.log(`Successfully updated user ${userId} status to ${newStatus}`);
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Failed to update user status. Please try again.');
      
      // Revert the optimistic update if the API call fails
      setUsers(prevUsers => [...prevUsers]); // Re-fetch from server would be better
    }
  };
  
  /* =====================
     Roles management state
  ====================== */
  const roleOptions = ['admin', 'core', 'scout', 'viewer'] as const
  type RoleOption = typeof roleOptions[number]

  const [rolesList, setRolesList] = useState<Array<{ wallet: string; role: RoleOption }>>([])
  const [newWallet, setNewWallet] = useState('')
  const [newRole, setNewRole] = useState<RoleOption>('viewer')

  // Fetch roles when the tab becomes active
  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/admin/roles')
      if (res.ok) {
        const data = await res.json()
        setRolesList(data)
      }
    } catch (err) {
      console.error('Failed to fetch roles', err)
    }
  }

  useEffect(() => {
    if (activeTab === 'roles') {
      fetchRoles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const handleSaveRole = async () => {
    if (!newWallet) return
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: newWallet.trim(), role: newRole })
      })
      if (res.ok) {
        setNewWallet('')
        fetchRoles()
      }
    } catch (err) {
      console.error('Failed to save role', err)
    }
  }
  
  return (
    <div className="fixed inset-0 z-50 bg-black font-mono text-green-300 p-4 overflow-auto">
      <div className="max-w-6xl mx-auto">
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
          {/* Roles management tab – visible to admins only.  */}
          <button
            className={`px-4 py-2 ${activeTab === 'roles' ? 'bg-green-800' : ''}`}
            onClick={() => setActiveTab('roles')}
          >
            Roles
          </button>
        </div>
        
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex justify-around mb-8">
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
                    className="absolute bottom-0 w-full bg-red-400" 
                    style={{ height: `${((statusTotals.rejected || 0) / (users.length || 1)) * 100}%` }}
                  ></div>
                </div>
                <div className="text-xs mt-2">Rejected</div>
              </div>
            </div>
            
            {/* Charts section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* User Signup Trend */}
              <div className="border border-green-300 p-4">
                <h3 className="text-lg mb-4">User Signup Trend</h3>
                <div className="h-64 bg-black">
                  {signupTrendData && <Line 
                    data={signupTrendData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: { color: 'rgba(134, 239, 172, 0.8)' },
                          grid: { color: 'rgba(134, 239, 172, 0.1)' }
                        },
                        x: {
                          ticks: { color: 'rgba(134, 239, 172, 0.8)' },
                          grid: { color: 'rgba(134, 239, 172, 0.1)' }
                        }
                      },
                      plugins: {
                        legend: {
                          labels: { color: 'rgba(134, 239, 172, 0.8)' }
                        }
                      }
                    }}
                  />}
                </div>
              </div>
              
              {/* Approval Status Breakdown */}
              <div className="border border-green-300 p-4">
                <h3 className="text-lg mb-4">Approval Status</h3>
                <div className="h-64 bg-black flex items-center justify-center">
                  {approvalStatusData && <Pie 
                    data={approvalStatusData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: { color: 'rgba(134, 239, 172, 0.8)' }
                        }
                      }
                    }}
                  />}
                </div>
              </div>
              
              {/* Users by Country */}
              <div className="border border-green-300 p-4">
                <h3 className="text-lg mb-4">Users by Country</h3>
                <div className="h-64 bg-black">
                  {countryDistributionData && <Bar 
                    data={countryDistributionData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      indexAxis: 'y',
                      scales: {
                        y: {
                          ticks: { color: 'rgba(134, 239, 172, 0.8)' },
                          grid: { color: 'rgba(134, 239, 172, 0.1)' }
                        },
                        x: {
                          beginAtZero: true,
                          ticks: { color: 'rgba(134, 239, 172, 0.8)' },
                          grid: { color: 'rgba(134, 239, 172, 0.1)' }
                        }
                      },
                      plugins: {
                        legend: {
                          display: false
                        }
                      }
                    }}
                  />}
                </div>
              </div>
              
              {/* Users by Chain */}
              <div className="border border-green-300 p-4">
                <h3 className="text-lg mb-4">Users by Chain</h3>
                <div className="h-64 bg-black">
                  {chainDistributionData && <Bar 
                    data={chainDistributionData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: { color: 'rgba(134, 239, 172, 0.8)' },
                          grid: { color: 'rgba(134, 239, 172, 0.1)' }
                        },
                        x: {
                          ticks: { color: 'rgba(134, 239, 172, 0.8)' },
                          grid: { color: 'rgba(134, 239, 172, 0.1)' }
                        }
                      },
                      plugins: {
                        legend: {
                          display: false
                        }
                      }
                    }}
                  />}
                </div>
              </div>
              
              {/* Users by Content Type */}
              <div className="border border-green-300 p-4">
                <h3 className="text-lg mb-4">Content Type Distribution</h3>
                <div className="h-64 bg-black flex items-center justify-center">
                  {contentTypeData && <Pie 
                    data={contentTypeData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: { color: 'rgba(134, 239, 172, 0.8)' }
                        }
                      }
                    }}
                  />}
                </div>
              </div>
              
              {/* Wallet Connection Ratio */}
              <div className="border border-green-300 p-4">
                <h3 className="text-lg mb-4">Wallet Connection Ratio</h3>
                <div className="h-64 bg-black flex items-center justify-center">
                  {walletConnectionData && <Doughnut 
                    data={walletConnectionData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: { color: 'rgba(134, 239, 172, 0.8)' }
                        }
                      }
                    }}
                  />}
                </div>
              </div>
              
              {/* Platform Distribution */}
              <div className="border border-green-300 p-4 col-span-1 md:col-span-2">
                <h3 className="text-lg mb-4">Platform Distribution</h3>
                <div className="h-64 bg-black">
                  {platformsDistributionData && <Bar 
                    data={platformsDistributionData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: { color: 'rgba(134, 239, 172, 0.8)' },
                          grid: { color: 'rgba(134, 239, 172, 0.1)' }
                        },
                        x: {
                          ticks: { color: 'rgba(134, 239, 172, 0.8)' },
                          grid: { color: 'rgba(134, 239, 172, 0.1)' }
                        }
                      },
                      plugins: {
                        legend: {
                          display: false
                        }
                      }
                    }}
                  />}
                </div>
              </div>
            </div>
            
            <div className="mt-8">
              <h2 className="text-lg mb-2">Recent Users</h2>
              {users.slice(0, 5).map(user => (
                <div key={user.id} className="border border-green-300 p-2 mb-2 flex items-center">
                  <div className="w-6 h-6 bg-green-800 rounded-full mr-2"></div>
                  <div className="flex-1">
                    <div className="font-bold">{user.name}</div>
                    <div className="text-xs">{user.handle}</div>
                  </div>
                  <div className="text-xs">
                    <span 
                      className={`px-2 py-0.5 rounded ${
                        user.approvalStatus === 'approved' 
                          ? 'bg-green-900 text-green-300' 
                          : user.approvalStatus === 'rejected'
                            ? 'bg-red-900 text-red-300'
                            : 'bg-yellow-900 text-yellow-300'
                      }`}
                    >
                      {user.approvalStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Search by name or handle..."
                className="w-full bg-black border border-green-300 p-2"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              
              <div className="flex gap-2 flex-wrap">
                <button 
                  className={`px-2 py-1 text-xs ${statusFilter === 'all' ? 'bg-green-800 text-green-100' : 'border border-green-300'}`}
                  onClick={() => setStatusFilter('all')}
                >
                  All
                </button>
                <button 
                  className={`px-2 py-1 text-xs ${statusFilter === 'approved' ? 'bg-green-800 text-green-100' : 'border border-green-300'}`}
                  onClick={() => setStatusFilter('approved')}
                >
                  Approved ({statusTotals.approved || 0})
                </button>
                <button 
                  className={`px-2 py-1 text-xs ${statusFilter === 'pending' ? 'bg-yellow-800 text-yellow-100' : 'border border-green-300'}`}
                  onClick={() => setStatusFilter('pending')}
                >
                  Pending ({statusTotals.pending || 0})
                </button>
                <button 
                  className={`px-2 py-1 text-xs ${statusFilter === 'rejected' ? 'bg-red-800 text-red-100' : 'border border-green-300'}`}
                  onClick={() => setStatusFilter('rejected')}
                >
                  Rejected ({statusTotals.rejected || 0})
                </button>
              </div>
              
              {/* Advanced Filters */}
              <div className="border border-green-300 p-3 mt-3">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold">Advanced Filters</h3>
                  <button 
                    className="text-xs border border-green-300 px-2 py-1 hover:bg-green-800"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  >
                    {showAdvancedFilters ? 'Hide Filters' : 'Show Filters'}
                  </button>
                </div>
                
                {showAdvancedFilters && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Country Filter */}
                    <div className="filter-group">
                      <label className="text-xs uppercase block mb-1">Countries</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search countries..."
                          className="w-full bg-black border border-green-300 p-2 text-xs"
                          value={countrySearch}
                          onChange={e => setCountrySearch(e.target.value)}
                          onFocus={() => setShowCountryDropdown(true)}
                        />
                        {showCountryDropdown && (
                          <div className="absolute z-10 mt-1 w-full bg-black border border-green-300 max-h-40 overflow-y-auto">
                            {countries
                              .filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
                              .map(country => (
                                <div
                                  key={country.name}
                                  className={`p-2 text-xs cursor-pointer hover:bg-green-900 ${
                                    audienceLocations.includes(country.name) ? 'bg-green-800' : ''
                                  }`}
                                  onClick={() => {
                                    setAudienceLocations(prev => 
                                      prev.includes(country.name) 
                                        ? prev.filter(c => c !== country.name) 
                                        : [...prev, country.name]
                                    );
                                  }}
                                >
                                  {country.name}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                      {audienceLocations.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {audienceLocations.map(country => (
                            <span 
                              key={country} 
                              className="inline-flex items-center px-2 py-1 bg-green-900 text-xs rounded"
                            >
                              {country}
                              <button 
                                className="ml-1 text-red-400" 
                                onClick={() => setAudienceLocations(prev => prev.filter(c => c !== country))}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Target Audience */}
                    <div className="filter-group">
                      <label className="text-xs uppercase block mb-1">Target Audience</label>
                      <div className="max-h-40 overflow-y-auto border border-green-300 p-2">
                        {targetAudienceOptions.map(audience => (
                          <div key={audience} className="flex items-center mb-1">
                            <input 
                              type="checkbox" 
                              id={`audience-${audience}`}
                              checked={targetAudience.includes(audience)}
                              onChange={() => {
                                setTargetAudience(prev => 
                                  prev.includes(audience) 
                                    ? prev.filter(a => a !== audience) 
                                    : [...prev, audience]
                                );
                              }}
                              className="mr-2"
                            />
                            <label htmlFor={`audience-${audience}`} className="text-xs">
                              {audience}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Active Chains */}
                    <div className="filter-group">
                      <label className="text-xs uppercase block mb-1">Active Chains</label>
                      <div className="max-h-40 overflow-y-auto border border-green-300 p-2">
                        {chainOptions.map(chain => (
                          <div key={chain} className="flex items-center mb-1">
                            <input 
                              type="checkbox" 
                              id={`chain-${chain}`}
                              checked={activeChains.includes(chain)}
                              onChange={() => {
                                setActiveChains(prev => 
                                  prev.includes(chain) 
                                    ? prev.filter(c => c !== chain) 
                                    : [...prev, chain]
                                );
                              }}
                              className="mr-2"
                            />
                            <label htmlFor={`chain-${chain}`} className="text-xs">
                              {chain}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Content Types */}
                    <div className="filter-group">
                      <label className="text-xs uppercase block mb-1">Content Types</label>
                      <div className="max-h-40 overflow-y-auto border border-green-300 p-2">
                        {contentTypeOptions.map(type => (
                          <div key={type} className="flex items-center mb-1">
                            <input 
                              type="checkbox" 
                              id={`content-${type}`}
                              checked={contentTypes.includes(type)}
                              onChange={() => {
                                setContentTypes(prev => 
                                  prev.includes(type) 
                                    ? prev.filter(t => t !== type) 
                                    : [...prev, type]
                                );
                              }}
                              className="mr-2"
                            />
                            <label htmlFor={`content-${type}`} className="text-xs">
                              {type}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Platforms Filter */}
                    <div className="filter-group">
                      <label className="text-xs uppercase block mb-1">Platforms</label>
                      <div className="max-h-40 overflow-y-auto border border-green-300 p-2">
                        {platformOptions.map(platform => (
                          <div key={platform} className="flex items-center mb-1">
                            <input 
                              type="checkbox" 
                              id={`platform-${platform}`}
                              checked={platforms.includes(platform)}
                              onChange={() => {
                                setPlatforms(prev => 
                                  prev.includes(platform) 
                                    ? prev.filter(p => p !== platform) 
                                    : [...prev, platform]
                                );
                              }}
                              className="mr-2"
                            />
                            <label htmlFor={`platform-${platform}`} className="text-xs">
                              {platform}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Price Per Post Range */}
                    <div className="filter-group">
                      <label className="text-xs uppercase block mb-1">
                        Price Per Post Range: ${pricePerPostRange.min} - ${pricePerPostRange.max}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          className="w-1/2 bg-black border border-green-300 p-2 text-xs"
                          value={pricePerPostRange.min}
                          onChange={e => setPricePerPostRange(prev => ({ ...prev, min: parseInt(e.target.value) || 0 }))}
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          className="w-1/2 bg-black border border-green-300 p-2 text-xs"
                          value={pricePerPostRange.max}
                          onChange={e => setPricePerPostRange(prev => ({ ...prev, max: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                    
                    {/* Monthly Price Range */}
                    <div className="filter-group">
                      <label className="text-xs uppercase block mb-1">
                        Monthly Price Range: ${priceMonthlyRange.min} - ${priceMonthlyRange.max}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          className="w-1/2 bg-black border border-green-300 p-2 text-xs"
                          value={priceMonthlyRange.min}
                          onChange={e => setPriceMonthlyRange(prev => ({ ...prev, min: parseInt(e.target.value) || 0 }))}
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          className="w-1/2 bg-black border border-green-300 p-2 text-xs"
                          value={priceMonthlyRange.max}
                          onChange={e => setPriceMonthlyRange(prev => ({ ...prev, max: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                    
                    {/* Follower Range */}
                    <div className="filter-group">
                      <label className="text-xs uppercase block mb-1">
                        Followers Range: {followerRange.min} - {followerRange.max}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          className="w-1/2 bg-black border border-green-300 p-2 text-xs"
                          value={followerRange.min}
                          onChange={e => setFollowerRange(prev => ({ ...prev, min: parseInt(e.target.value) || 0 }))}
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          className="w-1/2 bg-black border border-green-300 p-2 text-xs"
                          value={followerRange.max}
                          onChange={e => setFollowerRange(prev => ({ ...prev, max: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                    
                    {/* Clear Filters Button */}
                    <div className="filter-group col-span-1 md:col-span-2 flex justify-center">
                      <button 
                        className="text-xs border border-red-500 px-4 py-2 text-red-400 hover:bg-red-900"
                        onClick={() => {
                          setAudienceLocations([]);
                          setTargetAudience([]);
                          setActiveChains([]);
                          setContentTypes([]);
                          setPlatforms([]);
                          setPricePerPostRange({min: 0, max: 10000});
                          setPriceMonthlyRange({min: 0, max: 50000});
                          setFollowerRange({min: 0, max: 1000000});
                          setCountrySearch('');
                        }}
                      >
                        Clear All Filters
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="users-table">
              <div className="mb-2 text-xs opacity-70">{filteredUsers.length} results</div>
              {filteredUsers.map(user => (
                <div key={user.id} className="border border-green-300 p-3 mb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center">
                        <div 
                          className="mr-2 font-bold cursor-pointer hover:text-green-400" 
                          onClick={() => handleView(user.id)}
                        >
                          {user.name}
                        </div>
                        <div className="text-xs opacity-70">{user.handle}</div>
                      </div>
                      <div className="text-xs my-1">
                        <span className="opacity-70">Followers:</span> {user.followers?.toLocaleString()}
                      </div>
                      <div className="text-xs">
                        <span className="opacity-70">Chains:</span> {Array.isArray(user.chains) ? user.chains.join(', ') : user.chains}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <select
                        value={user.approvalStatus || 'pending'}
                        onChange={(e) => updateUserStatus(user.id, e.target.value as 'approved' | 'pending' | 'rejected')}
                        className={`text-xs p-1 bg-black border ${
                          user.approvalStatus === 'approved' 
                            ? 'border-green-500 text-green-400' 
                            : user.approvalStatus === 'rejected'
                              ? 'border-red-500 text-red-400'
                              : 'border-yellow-500 text-yellow-400'
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                      <button
                        onClick={() => handleView(user.id)}
                        className="text-xs p-1 bg-black border border-blue-400 text-blue-400 hover:bg-blue-900/30"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div>
            <h2 className="text-lg mb-4">Top KOLs by Followers</h2>
            <table className="w-full text-xs">
              <thead className="border-b border-green-300">
                <tr>
                  <th className="text-left p-2">Rank</th>
                  <th className="text-left p-2">User</th>
                  <th className="text-right p-2">Followers</th>
                </tr>
              </thead>
              <tbody>
                {[...users]
                  .sort((a, b) => (b.followers || 0) - (a.followers || 0))
                  .slice(0, 10)
                  .map((user, index) => (
                    <tr key={user.id} className="border-b border-green-300/30">
                      <td className="p-2">{index + 1}</td>
                      <td className="p-2">
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-green-800 rounded-full mr-2"></div>
                          <div>
                            <div 
                              className="font-bold cursor-pointer hover:text-green-400" 
                              onClick={() => handleView(user.id)}
                            >
                              {user.name}
                            </div>
                            <div className="text-xs opacity-70">{user.handle}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-right">{user.followers?.toLocaleString()}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}
        
        {/* Roles Management Tab */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            <h2 className="text-lg mb-4">Wallet Roles</h2>

            {/* Add / Edit form */}
            <div className="border border-green-300 p-4 flex flex-col md:flex-row gap-2 items-start md:items-end">
              <input
                type="text"
                placeholder="Wallet address"
                value={newWallet}
                onChange={e => setNewWallet(e.target.value)}
                className="flex-1 bg-black border border-green-300 p-2 text-xs w-full md:w-auto"
              />
              <select
                value={newRole}
                onChange={e => setNewRole(e.target.value as any)}
                className="bg-black border border-green-300 p-2 text-xs"
              >
                {roleOptions.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button
                onClick={handleSaveRole}
                className="px-4 py-2 border border-green-300 text-xs hover:bg-green-800"
              >
                Save
              </button>
            </div>

            {/* Roles list */}
            <div className="border border-green-300 p-4">
              {rolesList.length === 0 ? (
                <div className="text-xs opacity-70">No roles assigned yet.</div>
              ) : (
                <ul className="space-y-2 text-xs">
                  {rolesList.map(({ wallet, role }) => (
                    <li key={wallet} className="flex justify-between items-center border-b border-green-800 pb-1">
                      <span className="break-all mr-2">{wallet}</span>
                      <span className="uppercase mr-2">{role}</span>
                      <button
                        className="underline hover:text-green-400"
                        onClick={() => {
                          setNewWallet(wallet)
                          setNewRole(role as any)
                        }}
                      >
                        Edit
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}