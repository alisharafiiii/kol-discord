import { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import React, { useState } from 'react'
import { getProfileById, InfluencerProfile, saveProfile } from '../../lib/redis'
import { SessionProvider, useSession } from 'next-auth/react'
import Head from 'next/head'

interface ProfilePageProps {
  profile?: InfluencerProfile
  error?: string
}

interface Campaign {
  id: string;
  name: string;
  budget: string;
  sendDevice: boolean;
  sendMerch: boolean;
  notes: string;
  url: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

// Helper function to safely get follower count from different account types
const getFollowerCount = (data: any): number => {
  if (!data) return 0
  return 'followers' in data ? data.followers : 
         'subscribers' in data ? data.subscribers : 0
}

// Wrap the main component with SessionProvider
export default function ProfilePageWrapper(props: ProfilePageProps) {
  return (
    <SessionProvider>
      <ProfilePage {...props} />
    </SessionProvider>
  )
}

// Main component with session access
function ProfilePage({ profile, error }: ProfilePageProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [isEditing, setIsEditing] = useState(false)
  const [roiRank, setRoiRank] = useState(profile?.roiRank || '')
  const [adminNotes, setAdminNotes] = useState(profile?.adminNotes || '')
  const [saving, setSaving] = useState(false)
  
  // Campaign state
  const [showCampaignForm, setShowCampaignForm] = useState(false)
  const [newCampaign, setNewCampaign] = useState<Omit<Campaign, 'id' | 'createdAt' | 'createdBy'>>({
    name: '',
    budget: '',
    sendDevice: false,
    sendMerch: false,
    notes: '',
    url: '',
    updatedAt: undefined,
    updatedBy: undefined
  })
  
  const saveAdminChanges = async () => {
    if (!profile) return
    
    try {
      setSaving(true)
      
      const updatedProfile = {
        ...profile,
        roiRank,
        adminNotes,
        updatedAt: new Date().toISOString(),
        updatedBy: session?.user?.name || 'Unknown Admin'
      }
      
      const response = await fetch(`/api/admin/update-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profile: updatedProfile }),
      })
      
      if (!response.ok) throw new Error('Failed to update profile')
      
      setIsEditing(false)
      // Refresh the page to get updated data
      router.replace(router.asPath)
    } catch (error) {
      console.error('Error saving admin changes:', error)
      alert('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }
  
  const addNewCampaign = async () => {
    if (!profile) return
    
    try {
      setSaving(true)
      
      const campaign: Campaign = {
        ...newCampaign,
        id: `campaign_${Date.now()}`,
        createdAt: new Date().toISOString(),
        createdBy: session?.user?.name || 'Unknown Admin'
      }
      
      const updatedProfile = {
        ...profile,
        campaigns: [...(profile.campaigns || []), campaign],
        updatedAt: new Date().toISOString(),
        updatedBy: session?.user?.name || 'Unknown Admin'
      }
      
      const response = await fetch(`/api/admin/update-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profile: updatedProfile }),
      })
      
      if (!response.ok) throw new Error('Failed to add campaign')
      
      setShowCampaignForm(false)
      setNewCampaign({
        name: '',
        budget: '',
        sendDevice: false,
        sendMerch: false,
        notes: '',
        url: '',
        updatedAt: undefined,
        updatedBy: undefined
      })
      
      // Refresh the page to get updated data
      router.replace(router.asPath)
    } catch (error) {
      console.error('Error adding campaign:', error)
      alert('Failed to add campaign. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Custom CSS for retro cyberpunk style
  const styles = {
    container: {
      padding: '20px',
      fontFamily: 'monospace',
      color: '#00ff00',
      backgroundColor: '#000000',
      minHeight: '100vh',
      position: 'relative' as const,
      overflow: 'hidden' as const,
    },
    matrixBackground: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundImage: 'linear-gradient(#00ff00 1px, transparent 1px)',
      backgroundSize: '3px 3px',
      opacity: 0.1,
      animation: 'matrix 3s linear infinite',
      zIndex: 0,
    },
    content: {
      position: 'relative' as const,
      zIndex: 1,
      maxWidth: '800px',
      margin: '0 auto',
      border: '4px solid #00ff00',
      padding: '20px',
      backgroundColor: '#000000',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      borderBottom: '1px solid #00ff00',
      paddingBottom: '10px',
    },
    heading: {
      fontSize: '24px',
      textTransform: 'uppercase' as const,
      margin: 0,
    },
    button: {
      backgroundColor: 'transparent',
      border: '1px solid #00ff00',
      color: '#00ff00',
      padding: '8px 16px',
      cursor: 'pointer',
      fontSize: '14px',
    },
    buttonHover: {
      backgroundColor: '#003300',
    },
    section: {
      border: '1px solid #00ff00',
      padding: '15px',
      marginBottom: '20px',
    },
    sectionTitle: {
      fontSize: '14px',
      textTransform: 'uppercase' as const,
      marginTop: 0,
      marginBottom: '10px',
      borderBottom: '1px solid #00ff00',
      paddingBottom: '5px',
    },
    statusBadge: {
      display: 'inline-block',
      padding: '4px 8px',
      fontSize: '12px',
      color: '#000000',
      backgroundColor: profile?.approvalStatus === 'approved' ? '#00ff00' : 
                       profile?.approvalStatus === 'pending' ? '#ffff00' : 
                       '#ff0000',
      marginBottom: '15px',
    },
    profileHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      marginBottom: '20px',
    },
    profileImage: {
      width: '80px',
      height: '80px',
      backgroundColor: '#003300',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
    },
    detailItem: {
      marginBottom: '8px',
      fontSize: '12px',
    },
    label: {
      fontWeight: 'bold',
    },
    input: {
      width: '100%',
      backgroundColor: '#000000',
      border: '1px solid #00ff00',
      color: '#00ff00',
      padding: '8px',
      fontSize: '12px',
    },
    select: {
      width: '100%',
      backgroundColor: '#000000',
      border: '1px solid #00ff00',
      color: '#00ff00',
      padding: '8px',
      fontSize: '12px',
    },
    textarea: {
      width: '100%',
      backgroundColor: '#000000',
      border: '1px solid #00ff00',
      color: '#00ff00',
      padding: '8px',
      fontSize: '12px',
      minHeight: '100px',
      resize: 'vertical' as const,
    },
    link: {
      color: '#00ff00',
      textDecoration: 'underline',
    },
  };

  if (error) {
    return (
      <div style={styles.container}>
        <Head>
          <title>Error - KOL Profile</title>
          <style>{`
            @keyframes matrix {
              0% { background-position: 0 0 }
              100% { background-position: 0 1000px }
            }
          `}</style>
        </Head>
        <div style={styles.matrixBackground}></div>
        <div style={styles.content}>
          <h1 style={styles.heading}>Error</h1>
          <p>{error}</p>
          <button 
            style={styles.button}
            onClick={() => router.back()}
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }
  
  if (!profile) {
    return (
      <div style={styles.container}>
        <Head>
          <title>Loading - KOL Profile</title>
          <style>{`
            @keyframes matrix {
              0% { background-position: 0 0 }
              100% { background-position: 0 1000px }
            }
          `}</style>
        </Head>
        <div style={styles.matrixBackground}></div>
        <div style={styles.content}>
          <h1 style={styles.heading}>Loading...</h1>
        </div>
      </div>
    )
  }
  
  return (
    <div style={styles.container}>
      <Head>
        <title>KOL Profile: {profile.name}</title>
        <style>{`
          @keyframes matrix {
            0% { background-position: 0 0 }
            100% { background-position: 0 1000px }
          }
        `}</style>
      </Head>
      <div style={styles.matrixBackground}></div>
      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.heading}>KOL Profile</h1>
          <button 
            style={styles.button}
            onClick={() => router.back()}
          >
            Back to Admin
          </button>
        </div>
        
        {/* Status Badge */}
        <div style={{textAlign: 'right'}}>
          <span style={styles.statusBadge}>
            {profile.approvalStatus.toUpperCase()}
          </span>
        </div>
        
        {/* Profile Header */}
        <div style={{...styles.section, ...styles.profileHeader}}>
          <div style={styles.profileImage}>
            {profile.profileImageUrl ? (
              <img 
                src={profile.profileImageUrl} 
                alt={profile.name} 
                style={{width: '100%', height: '100%', objectFit: 'cover'}}
              />
            ) : (
              profile.name.substring(0, 2).toUpperCase()
            )}
          </div>
          
          <div>
            <h2 style={{fontSize: '18px', margin: 0}}>{profile.name}</h2>
            {profile.twitterHandle && (
              <a 
                href={`https://twitter.com/${profile.twitterHandle.replace('@', '')}`} 
                target="_blank" 
                rel="noopener noreferrer"
                style={styles.link}
              >
                {profile.twitterHandle}
              </a>
            )}
          </div>
        </div>
        
        {/* Profile Details */}
        <div style={styles.grid}>
          {/* Basic Info */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Basic Info</h3>
            <div>
              <div style={styles.detailItem}>
                <span style={styles.label}>Country:</span> {profile.country || 'Not specified'}
              </div>
              <div style={styles.detailItem}>
                <span style={styles.label}>Language:</span> {profile.primaryLanguage || 'Not specified'}
              </div>
              <div style={styles.detailItem}>
                <span style={styles.label}>Created:</span> {new Date(profile.createdAt).toLocaleString()}
              </div>
              {profile.updatedAt && (
                <div style={styles.detailItem}>
                  <span style={styles.label}>Last Updated:</span> {new Date(profile.updatedAt).toLocaleString()}
                </div>
              )}
              {profile.updatedBy && (
                <div style={styles.detailItem}>
                  <span style={styles.label}>Updated By:</span> {profile.updatedBy}
                </div>
              )}
            </div>
          </div>
          
          {/* Campaign Details */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Campaign Fit</h3>
            <div>
              <div style={styles.detailItem}>
                <span style={styles.label}>Audience Types:</span> 
                {profile.audienceTypes?.join(', ') || 'Not specified'}
              </div>
              <div style={styles.detailItem}>
                <span style={styles.label}>Chains:</span> 
                {profile.chains?.join(', ') || 'Not specified'}
              </div>
              <div style={styles.detailItem}>
                <span style={styles.label}>Post Price:</span> 
                {profile.postPricePerPost ? `$${profile.postPricePerPost}` : 'Not specified'}
              </div>
              <div style={styles.detailItem}>
                <span style={styles.label}>Monthly Budget:</span> 
                {profile.monthlySupportBudget ? `$${profile.monthlySupportBudget}` : 'Not specified'}
              </div>
            </div>
          </div>
        </div>
        
        <div style={styles.grid}>
          {/* Social Accounts */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Social Accounts</h3>
            <div>
              {profile.socialAccounts && Object.keys(profile.socialAccounts).length > 0 ? (
                Object.entries(profile.socialAccounts).map(([platform, data]) => (
                  data && (
                    <div key={platform} style={styles.detailItem}>
                      <span style={styles.label}>{platform.charAt(0).toUpperCase() + platform.slice(1)}:</span>{' '}
                      {data.handle} ({getFollowerCount(data)} followers)
                    </div>
                  )
                ))
              ) : (
                <div style={styles.detailItem}>No social accounts specified</div>
              )}
            </div>
          </div>
          
          {/* Wallet Addresses */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Wallet Addresses</h3>
            <div>
              {profile.walletAddresses && Object.keys(profile.walletAddresses).length > 0 ? (
                Object.entries(profile.walletAddresses).map(([wallet, address]) => (
                  address && (
                    <div key={wallet} style={styles.detailItem}>
                      <span style={styles.label}>{wallet.charAt(0).toUpperCase() + wallet.slice(1)}:</span> {address}
                    </div>
                  )
                ))
              ) : (
                <div style={styles.detailItem}>No wallets connected</div>
              )}
            </div>
          </div>
        </div>
        
        {/* Best Collaborations */}
        {profile.bestCollabUrls && profile.bestCollabUrls.length > 0 && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Best Collaborations</h3>
            <div>
              {profile.bestCollabUrls.map((url, index) => (
                <div key={index} style={styles.detailItem}>
                  <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={styles.link}
                  >
                    {url}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Admin Settings Section */}
        <div style={styles.section}>
          <div style={{...styles.header, marginBottom: '10px'}}>
            <h3 style={styles.sectionTitle}>Admin Settings</h3>
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                style={{...styles.button, fontSize: '12px', padding: '4px 8px'}}
              >
                Edit
              </button>
            ) : (
              <div style={{display: 'flex', gap: '8px'}}>
                <button 
                  onClick={() => setIsEditing(false)}
                  style={{
                    ...styles.button, 
                    fontSize: '12px', 
                    padding: '4px 8px',
                    borderColor: '#ff0000',
                    color: '#ff0000'
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button 
                  onClick={saveAdminChanges}
                  style={{...styles.button, fontSize: '12px', padding: '4px 8px'}}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            {/* ROI Rank */}
            <div>
              <label style={{...styles.label, display: 'block', marginBottom: '4px'}}>ROI Rank:</label>
              {isEditing ? (
                <select
                  value={roiRank}
                  onChange={(e) => setRoiRank(e.target.value)}
                  style={styles.select}
                >
                  <option value="">Not Ranked</option>
                  <option value="bronze">Bronze</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                  <option value="platinum">Platinum</option>
                  <option value="diamond">Diamond</option>
                </select>
              ) : (
                <div style={{...styles.input, display: 'flex', alignItems: 'center'}}>
                  {profile.roiRank ? profile.roiRank.toUpperCase() : 'Not Ranked'}
                </div>
              )}
            </div>
            
            {/* Admin Notes */}
            <div>
              <label style={{...styles.label, display: 'block', marginBottom: '4px'}}>Admin Notes:</label>
              {isEditing ? (
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  style={styles.textarea}
                  placeholder="Enter administrative notes here..."
                />
              ) : (
                <div style={{...styles.input, minHeight: '80px'}}>
                  {profile.adminNotes || 'No admin notes'}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Campaigns Section (Only for approved KOLs) */}
        {profile.approvalStatus === 'approved' && (
          <div style={styles.section}>
            <div style={{...styles.header, marginBottom: '10px'}}>
              <h3 style={styles.sectionTitle}>Campaigns</h3>
              {!showCampaignForm && (
                <button 
                  onClick={() => setShowCampaignForm(true)}
                  style={{...styles.button, fontSize: '12px', padding: '4px 8px'}}
                >
                  Add Campaign
                </button>
              )}
            </div>
            
            {/* Campaign Form */}
            {showCampaignForm && (
              <div style={{...styles.section, marginBottom: '20px'}}>
                <h4 style={{...styles.sectionTitle, fontSize: '12px'}}>New Campaign</h4>
                
                <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                  <div>
                    <label style={{...styles.label, display: 'block', marginBottom: '4px'}}>Campaign Name:</label>
                    <input 
                      type="text"
                      style={styles.input}
                      placeholder="Campaign name"
                      value={newCampaign.name}
                      onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label style={{...styles.label, display: 'block', marginBottom: '4px'}}>Budget:</label>
                    <input 
                      type="text"
                      style={styles.input}
                      placeholder="Campaign budget"
                      value={newCampaign.budget}
                      onChange={(e) => setNewCampaign({...newCampaign, budget: e.target.value})}
                    />
                  </div>
                  
                  <div style={{display: 'flex', gap: '16px'}}>
                    <label style={{display: 'flex', alignItems: 'center'}}>
                      <input 
                        type="checkbox"
                        checked={newCampaign.sendDevice}
                        onChange={(e) => setNewCampaign({...newCampaign, sendDevice: e.target.checked})}
                        style={{marginRight: '4px'}}
                      />
                      Send Device
                    </label>
                    
                    <label style={{display: 'flex', alignItems: 'center'}}>
                      <input 
                        type="checkbox"
                        checked={newCampaign.sendMerch}
                        onChange={(e) => setNewCampaign({...newCampaign, sendMerch: e.target.checked})}
                        style={{marginRight: '4px'}}
                      />
                      Send Merch
                    </label>
                  </div>
                  
                  <div>
                    <label style={{...styles.label, display: 'block', marginBottom: '4px'}}>Campaign URL:</label>
                    <input 
                      type="url"
                      style={styles.input}
                      placeholder="Campaign URL"
                      value={newCampaign.url}
                      onChange={(e) => setNewCampaign({...newCampaign, url: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label style={{...styles.label, display: 'block', marginBottom: '4px'}}>Notes:</label>
                    <textarea
                      style={styles.textarea}
                      placeholder="Campaign notes"
                      value={newCampaign.notes}
                      onChange={(e) => setNewCampaign({...newCampaign, notes: e.target.value})}
                    />
                  </div>
                  
                  <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                    <button 
                      onClick={() => setShowCampaignForm(false)}
                      style={{
                        ...styles.button, 
                        fontSize: '12px', 
                        padding: '4px 8px',
                        borderColor: '#ff0000',
                        color: '#ff0000'
                      }}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={addNewCampaign}
                      style={{...styles.button, fontSize: '12px', padding: '4px 8px'}}
                      disabled={saving || !newCampaign.name.trim()}
                    >
                      {saving ? 'Adding...' : 'Add Campaign'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Campaigns List */}
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
              {profile.campaigns && profile.campaigns.length > 0 ? (
                profile.campaigns.map((campaign: Campaign) => (
                  <div key={campaign.id} style={{...styles.section, marginBottom: 0}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                      <h4 style={{fontSize: '14px', fontWeight: 'bold', margin: 0}}>{campaign.name}</h4>
                      <div style={{fontSize: '12px'}}>{new Date(campaign.createdAt).toLocaleDateString()}</div>
                    </div>
                    
                    <div style={{marginTop: '8px', fontSize: '12px'}}>
                      <div style={styles.detailItem}><span style={styles.label}>Budget:</span> {campaign.budget}</div>
                      <div style={styles.detailItem}><span style={styles.label}>Send Device:</span> {campaign.sendDevice ? 'Yes' : 'No'}</div>
                      <div style={styles.detailItem}><span style={styles.label}>Send Merch:</span> {campaign.sendMerch ? 'Yes' : 'No'}</div>
                      
                      {campaign.url && (
                        <div style={styles.detailItem}>
                          <span style={styles.label}>URL:</span>{' '}
                          <a 
                            href={campaign.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={styles.link}
                          >
                            {campaign.url}
                          </a>
                        </div>
                      )}
                      
                      {campaign.notes && (
                        <div style={{marginTop: '8px'}}>
                          <div style={styles.label}>Notes:</div>
                          <div style={{...styles.input, marginTop: '4px', whiteSpace: 'pre-wrap' as const}}>
                            {campaign.notes}
                          </div>
                        </div>
                      )}
                      
                      <div style={{marginTop: '8px', color: '#00aa00', fontSize: '11px'}}>
                        Created by {campaign.createdBy}
                        {campaign.updatedBy && ` • Last updated by ${campaign.updatedBy}`}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{textAlign: 'center', padding: '16px', border: '1px solid #00ff00', fontSize: '12px'}}>
                  No campaigns created yet
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Audit Log Section */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Audit Log</h3>
          <div style={{fontSize: '12px'}}>
            <div style={styles.detailItem}>
              <span style={styles.label}>Created:</span>{' '}
              {new Date(profile.createdAt).toLocaleString()}
            </div>
            
            {profile.approvalStatus !== 'pending' && (
              <div style={styles.detailItem}>
                <span style={styles.label}>
                  {profile.approvalStatus === 'approved' ? 'Approved' : 'Rejected'}:
                </span>{' '}
                {profile.updatedAt ? new Date(profile.updatedAt).toLocaleString() : 'Unknown date'}
                {profile.updatedBy && ` by ${profile.updatedBy}`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params as { id: string }
  
  if (!id) {
    return {
      props: {
        error: 'Profile ID is required'
      }
    }
  }
  
  try {
    const profile = await getProfileById(id)
    
    if (!profile) {
      return {
        props: {
          error: 'Profile not found'
        }
      }
    }
    
    // Convert any Date objects to strings for serialization
    return {
      props: {
        profile: JSON.parse(JSON.stringify(profile))
      }
    }
  } catch (error) {
    console.error('Error fetching profile:', error)
    return {
      props: {
        error: 'Failed to fetch profile'
      }
    }
  }
} 