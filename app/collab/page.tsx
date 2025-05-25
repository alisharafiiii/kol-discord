'use client'

import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useState, useRef, useMemo } from 'react'
import Link from 'next/link'
import ProjectCard from '@/components/ProjectCard'
import ProjectModal from '@/components/ProjectModal'
import { Project } from '@/lib/project'

// Admin and collaborator wallet addresses to authorize access
const ADMIN_WALLETS = [
  '0x37Ed24e7c7311836FD01702A882937138688c1A9', // ETH
  'D1ZuvAKwpk6NQwJvFcbPvjujRByA6Kjk967WCwEt17Tq', // Solana 1
  'Eo5EKS2emxMNggKQJcq7LYwWjabrj3zvpG5rHAdmtZ75', // Solana 2
  '6tcxFg4RGVmfuy7MgeUQ5qbFsLPF18PnGMsQnvwG4Xif'  // Solana 3
]

export default function CollabPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Project management state
  const [projects, setProjects] = useState<Project[]>([])
  const [assignedProjects, setAssignedProjects] = useState<Project[]>([])
  const [ownProjects, setOwnProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [projectFilter, setProjectFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loadingProjects, setLoadingProjects] = useState(false)
  
  // State for managing different views/tabs
  const [activeTab, setActiveTab] = useState<string>('projects')
  
  // Remove access pass state
  const [userProfile, setUserProfile] = useState<{
    id?: string;
    name?: string;
    handle?: string;
    profileImage?: string;
    approvalStatus?: string;
  }>({})
  
  // Keep track of API requests in progress
  const apiRequestsInProgress = useRef<Record<string, boolean>>({})

  // State for preventing duplicate submissions
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // Helper: get wallet from cookie or localStorage
  const getWalletAddress = () => {
    // Prefer cookie (most up-to-date if set by backend)
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|;\s*)walletAddress=([^;]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    }
    return localStorage.getItem('walletAddress') || '';
  };

  // Function to fetch user profile data and check authorization in parallel - with caching
  const initializeUserData = async (walletAddress: string) => {
    try {
      console.time('initializeUserData');
      
      // Check for cached data first
      const cachedRole = localStorage.getItem('userRole');
      const cachedProfileStr = localStorage.getItem('userProfile');
      const cachedTimestamp = localStorage.getItem('userDataTimestamp');
      
      // Use cached data if it's less than 5 minutes old
      const isCacheValid = cachedTimestamp && 
        (Date.now() - parseInt(cachedTimestamp)) < 5 * 60 * 1000 &&
        cachedRole && cachedProfileStr;
      
      if (isCacheValid) {
        console.log('Using cached user data');
        setUserRole(cachedRole);
        setIsAuthorized(['admin', 'core', 'scout'].includes(cachedRole));
        
        try {
          const cachedProfile = JSON.parse(cachedProfileStr || '{}');
          setUserProfile(cachedProfile);
        } catch (e) {
          console.error('Error parsing cached profile', e);
        }
        
        setLoading(false);
        console.timeEnd('initializeUserData');
        
        // Refresh in background for next time
        refreshUserData(walletAddress);
        return;
      }
      
      // If no valid cache or force refresh, fetch fresh data
      await refreshUserData(walletAddress);
      console.timeEnd('initializeUserData');
    } catch (err: any) {
      console.error('Initialization failed:', err);
      setError(`Error during initialization: ${String(err.message || 'Unknown error')}`);
      setLoading(false);
      console.timeEnd('initializeUserData');
    }
  };
  
  // Function to fetch fresh user data
  const refreshUserData = async (walletAddress: string) => {
    // Check if this request is already in progress
    const requestKey = `refreshUserData-${walletAddress}`;
    if (apiRequestsInProgress.current[requestKey]) {
      console.log('Request already in progress, skipping duplicate fetch');
      return;
    }
    
    apiRequestsInProgress.current[requestKey] = true;
    
    try {
      // Run profile fetch and role check in parallel
      const [profileResponse, roleResponse] = await Promise.all([
        fetch(`/api/user/profile?wallet=${walletAddress}`),
        fetch(`/api/admin/check-role?wallet=${walletAddress}`)
      ]);

      // Handle role check
      if (!roleResponse.ok) {
        throw new Error(`Role check failed with status: ${roleResponse.status}`);
      }
      const roleData = await roleResponse.json();
      
      // Only allow admin, core, or scout roles
      const role = roleData.role || 'none';
      const isAuth = ['admin', 'core', 'scout'].includes(role);
      
      setIsAuthorized(isAuth);
      setUserRole(role);
      
      // Cache the role
      localStorage.setItem('userRole', role);
      
      if (!isAuth) {
        setError(`You do not have the required permissions to access this page. Your role: ${role}`);
      }

      // Handle profile data
      if (profileResponse.ok) {
        const data = await profileResponse.json();
        if (data.user) {
          const profile = {
            id: data.user.id,
            name: data.user.name,
            handle: data.user.twitterHandle,
            profileImage: data.user.profileImageUrl,
            approvalStatus: data.user.approvalStatus || 'pending'
          };
          
          setUserProfile(profile);
          
          // Cache the profile
          localStorage.setItem('userProfile', JSON.stringify(profile));
        }
      }
      
      // Update cache timestamp
      localStorage.setItem('userDataTimestamp', Date.now().toString());
      setLoading(false);
    } catch (error) {
      console.error('Error refreshing user data:', error);
    } finally {
      apiRequestsInProgress.current[requestKey] = false;
    }
  };

  useEffect(() => {
    // Check if user is authorized to access the collab page
    const checkAuthorization = async () => {
      try {
        // Get wallet from localStorage
        const walletAddress = getWalletAddress();
        
        if (!walletAddress) {
          console.log('No wallet address found - redirecting from collab page')
          setError('No wallet connected. Please connect a wallet first.')
          setLoading(false)
          return
        }
        
        // Set wallet cookie for authorization
        setCookie('walletAddress', walletAddress);
        
        // HARDCODED ADMIN WALLET BYPASS - Direct access for known admin wallets
        const isHardcodedAdmin = ADMIN_WALLETS.some(admin => {
          if (admin.startsWith('0x')) {
            return admin.toLowerCase() === walletAddress.toLowerCase()
          } else {
            return admin === walletAddress
          }
        })
        
        if (isHardcodedAdmin) {
          console.log('⚠️ ADMIN BYPASS for hardcoded wallet:', walletAddress)
          setIsAuthorized(true)
          setUserRole('admin')
          setLoading(false)
          return
        }
        
        // 1) Quick role check (fast) for initial gating
        try {
          const roleResp = await fetch(`/api/admin/check-role?wallet=${walletAddress}`);
          if (!roleResp.ok) throw new Error(`Role check failed (${roleResp.status})`);
          const roleJson = await roleResp.json();
          const role = roleJson.role || 'none';

          const isAuth = ['admin', 'core', 'scout'].includes(role);
          setIsAuthorized(isAuth);
          setUserRole(role);

          if (!isAuth) {
            setError(`You do not have the required permissions to access this page. Your role: ${role}`);
          }

          // Mark loading done for initial render
          setLoading(false);

          // 2) Fetch full profile in background (non-blocking)
          initializeUserData(walletAddress);
        } catch (quickErr: any) {
          console.error('Quick role check failed:', quickErr);
          // Fallback to original (slower) path
          await initializeUserData(walletAddress);
        }
      } catch (err: any) {
        console.error('Authorization check failed:', err)
        setError(`Error checking authorization: ${String(err.message || 'Unknown error')}`)
        setLoading(false)
      }
    }
    
    checkAuthorization()
  }, [router, session])
  
  // Load projects when user is authorized - with optimizations
  useEffect(() => {
    const loadProjects = async () => {
      if (!isAuthorized) return;
      
      console.log('=== LOAD PROJECTS START ===');
      console.log('Current state:', {
        projects: projects.length,
        assignedProjects: assignedProjects.length,
        ownProjects: ownProjects.length,
        projectFilter
      });
      
      // Check if we already have projects and they're fresh (less than 2 minutes old)
      const projectsTimestamp = localStorage.getItem('projectsTimestamp');
      const isCacheValid = projectsTimestamp && 
        (Date.now() - parseInt(projectsTimestamp)) < 2 * 60 * 1000;
      
      if (projects.length > 0 && isCacheValid) {
        console.log('Using cached projects data');
        // We already have fresh projects, no need to reload
        return;
      }
      
      // Show loading state if no cached data
      if (projects.length === 0) {
        setLoadingProjects(true);
      }
      
      try {
        console.time('loadProjects');
        
        // Check if requests are already in progress
        const requestKey = 'loadProjects';
        if (apiRequestsInProgress.current[requestKey]) {
          console.log('Project loading already in progress, skipping duplicate fetch');
          return;
        }
        
        apiRequestsInProgress.current[requestKey] = true;
        
        // Load all project types in parallel
        const [allResponse, assignedResponse, ownResponse] = await Promise.all([
          fetch('/api/projects/list', { 
            headers: { 'Cache-Control': 'max-age=120' } // Add caching directive
          }),
          fetch('/api/projects/list?filter=assigned', {
            headers: { 'Cache-Control': 'max-age=120' }
          }),
          fetch('/api/projects/list?filter=created', {
            headers: { 'Cache-Control': 'max-age=120' }
          })
        ]);

        console.log('API Responses:', {
          all: { status: allResponse.status, ok: allResponse.ok },
          assigned: { status: assignedResponse.status, ok: assignedResponse.ok },
          own: { status: ownResponse.status, ok: ownResponse.ok }
        });

        // Handle all projects
        if (allResponse.ok) {
          const data = await allResponse.json();
          console.log('All projects data:', data);
          console.log('Number of all projects received:', data.projects?.length || 0);
          setProjects(data.projects || []);
        } else {
          console.error('Failed to fetch all projects:', allResponse.status);
        }
        
        // Handle assigned projects
        if (assignedResponse.ok) {
          const assignedData = await assignedResponse.json();
          console.log('Assigned projects data:', assignedData);
          console.log('Number of assigned projects received:', assignedData.projects?.length || 0);
          setAssignedProjects(assignedData.projects || []);
        } else {
          console.error('Failed to fetch assigned projects:', assignedResponse.status);
        }
        
        // Handle own projects
        if (ownResponse.ok) {
          const ownData = await ownResponse.json();
          console.log('Own projects data:', ownData);
          console.log('Number of own projects received:', ownData.projects?.length || 0);
          setOwnProjects(ownData.projects || []);
        } else {
          console.error('Failed to fetch own projects:', ownResponse.status);
        }
        
        // Cache timestamp for freshness check
        localStorage.setItem('projectsTimestamp', Date.now().toString());
        
        console.timeEnd('loadProjects');
        console.log('=== LOAD PROJECTS END ===');
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        setLoadingProjects(false);
        apiRequestsInProgress.current['loadProjects'] = false;
      }
    };
    
    loadProjects();
    
    // Set up project refresh interval - every 2 minutes
    const refreshInterval = setInterval(loadProjects, 2 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, [isAuthorized, projects.length]);

  // Memoize filtered projects to prevent unnecessary recalculations
  const filteredProjects = useMemo(() => {
    console.log('=== FILTERING PROJECTS ===');
    console.log('Filter:', projectFilter);
    console.log('Available projects:', {
      all: projects.length,
      assigned: assignedProjects.length,
      own: ownProjects.length
    });
    
    let filtered = projects;
    
    if (projectFilter === 'assigned') {
      filtered = assignedProjects;
    } else if (projectFilter === 'created') {
      filtered = ownProjects;
    }
    
    console.log(`Using ${projectFilter} filter, starting with ${filtered.length} projects`);
    
    // Apply search filter if there's a search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const beforeSearch = filtered.length;
      filtered = filtered.filter(project => 
        project.twitterHandle.toLowerCase().includes(term) || 
        (project.notes && project.notes.toLowerCase().includes(term)) ||
        (project.website && project.website.toLowerCase().includes(term))
      );
      console.log(`Search term "${searchTerm}" reduced projects from ${beforeSearch} to ${filtered.length}`);
    }
    
    console.log(`Final filtered projects: ${filtered.length}`);
    console.log('=== END FILTERING ===');
    return filtered;
  }, [projects, assignedProjects, ownProjects, projectFilter, searchTerm]);
  
  // Function to set a cookie
  const setCookie = (name: string, value: string, days: number = 1) => {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value};${expires};path=/`;
  };

  // Ensure wallet cookie is set correctly
  useEffect(() => {
    const walletAddress = getWalletAddress();
    if (walletAddress) {
      setCookie('walletAddress', walletAddress);
      console.log('Set wallet cookie:', walletAddress);
    }
  }, [isAuthorized]);
  
  // Handle project creation
  const handleCreateProject = async (projectData: any) => {
    // Prevent duplicate submissions
    if (isCreatingProject) {
      console.warn('Project creation already in progress, ignoring duplicate request');
      return;
    }
    
    try {
      setIsCreatingProject(true);
      
      const walletAddress = getWalletAddress();
      if (!walletAddress) {
        throw new Error('No wallet connected');
      }

      // Ensure cookie is set each time we make a request
      setCookie('walletAddress', walletAddress);
      
      console.log('=== CREATE PROJECT START ===');
      console.log('Creating project with wallet:', walletAddress);

      console.log('Project data:', projectData);

      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress
        },
        body: JSON.stringify(projectData),
      });
      
      console.log('Create response:', {
        status: response.status,
        ok: response.ok
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create project');
      }
      
      const data = await response.json();
      console.log('Created project data:', data);
      
      // Add the new project to our state
      console.log('Updating state with new project...');
      setProjects(prev => {
        console.log('Previous projects:', prev.length);
        const updated = [...prev, data.project];
        console.log('Updated projects:', updated.length);
        return updated;
      });
      
      setOwnProjects(prev => {
        console.log('Previous own projects:', prev.length);
        const updated = [...prev, data.project];
        console.log('Updated own projects:', updated.length);
        return updated;
      });
      
      if (data.project.assignedTo === getWalletAddress()) {
        setAssignedProjects(prev => [...prev, data.project]);
      }
      
      // Clear the local cache to force refresh
      localStorage.removeItem('projectsTimestamp');
      
      console.log('=== CREATE PROJECT END ===');
      
      // Close the modal
      setShowProjectModal(false);
    } catch (error: any) {
      console.error('Error creating project:', error);
      alert(`Failed to create project: ${error.message}`);
    } finally {
      setIsCreatingProject(false);
    }
  };
  
  // Handle project update
  const handleUpdateProject = async (projectData: any) => {
    try {
      const walletAddress = getWalletAddress();
      if (!walletAddress) {
        throw new Error('No wallet connected');
      }

      // Ensure cookie is set each time we make a request
      setCookie('walletAddress', walletAddress);
      
      console.log('Updating project with wallet:', walletAddress);

      const response = await fetch('/api/projects/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress
        },
        body: JSON.stringify(projectData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update project');
      }
      
      const data = await response.json();
      
      // Update the project in our state
      const updatedProject = data.project;
      setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
      setOwnProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
      setAssignedProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
      
      // Close the modal
      setShowProjectModal(false);
      setSelectedProject(null);
    } catch (error: any) {
      console.error('Error updating project:', error);
      alert(`Failed to update project: ${error.message}`);
    }
  };
  
  // Handle project deletion
  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) {
      return;
    }
    
    try {
      const walletAddress = getWalletAddress();
      if (!walletAddress) {
        throw new Error('No wallet connected');
      }

      setCookie('walletAddress', walletAddress);
      
      console.log('=== DELETE PROJECT START ===');
      console.log('Deleting project:', projectId);

      const response = await fetch('/api/projects/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress
        },
        body: JSON.stringify({ projectId }),
      });
      
      console.log('Delete response:', {
        status: response.status,
        ok: response.ok
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete project');
      }
      
      // Remove the project from our state
      console.log('Removing project from state...');
      setProjects(prev => prev.filter(p => p.id !== projectId));
      setOwnProjects(prev => prev.filter(p => p.id !== projectId));
      setAssignedProjects(prev => prev.filter(p => p.id !== projectId));
      
      // Clear the local cache to force refresh
      localStorage.removeItem('projectsTimestamp');
      
      console.log('=== DELETE PROJECT END ===');
      
      // Close any open modals
      setShowProjectModal(false);
      setSelectedProject(null);
    } catch (error: any) {
      console.error('Error deleting project:', error);
      alert(`Failed to delete project: ${error.message}`);
    }
  };
  
  // Handle opening the edit modal
  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setIsEditMode(true);
    setShowProjectModal(true);
  };
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black font-mono text-green-300">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black font-mono text-red-400 p-6">
        <div className="border border-red-500 p-6 max-w-md text-center">
          <h1 className="text-xl uppercase mb-4">Access Denied</h1>
          <p className="mb-4 text-sm">{error || "You don't have permission to access the collaboration portal."}</p>
          <p className="mb-4 text-xs">
            Only users with admin, core, or scout roles can access this page.
          </p>
          <Link href="/">
            <button className="px-4 py-2 border border-red-400 hover:bg-red-900/30">
              Return to Home
            </button>
          </Link>
        </div>
      </div>
    )
  }

  // If authorized, render the collab portal
  return (
    <div className="min-h-screen bg-black text-green-300">
      {/* Background pattern */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-5">
        <div className="absolute inset-0" 
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%2322c55e\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        />
      </div>

      <div className="container mx-auto p-4 relative z-10">
        {/* Header with glow effect */}
        <div className="flex justify-between items-center mb-6 mt-8 pb-4 border-b border-green-400/30">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-mono text-green-300 font-bold relative">
              <span className="relative">
                Collaboration Portal
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent"></span>
              </span>
            </h1>
            <div className="text-xs px-2 py-1 bg-green-900/30 border border-green-500 rounded-md animate-pulse">
              {userRole?.toUpperCase()}
            </div>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 border border-green-300 hover:bg-green-900/30 text-sm transition-colors duration-300 rounded-md shadow-md hover:shadow-green-900/50"
          >
            Exit
          </button>
        </div>
        
        {/* Tabs navigation */}
        <div className="flex border-b border-green-300/30 mb-6 relative">
          <button
            className={`px-4 py-2 transition-all duration-300 ${activeTab === 'projects' ? 'bg-green-900/30 border-t border-l border-r border-green-300/50 text-green-200' : 'text-green-400/70'}`}
            onClick={() => setActiveTab('projects')}
          >
            Projects
          </button>
          <button
            className={`px-4 py-2 transition-all duration-300 ${activeTab === 'tasks' ? 'bg-green-900/30 border-t border-l border-r border-green-300/50 text-green-200' : 'text-green-400/70'}`}
            onClick={() => setActiveTab('tasks')}
          >
            Tasks
          </button>
          <button
            className={`px-4 py-2 transition-all duration-300 ${activeTab === 'messages' ? 'bg-green-900/30 border-t border-l border-r border-green-300/50 text-green-200' : 'text-green-400/70'}`}
            onClick={() => setActiveTab('messages')}
          >
            Messages
          </button>
          {/* Animated indicator for active tab */}
          <div 
            className="absolute bottom-0 h-0.5 bg-green-400 transition-all duration-300"
            style={{ 
              left: activeTab === 'projects' ? '0%' : activeTab === 'tasks' ? '33.33%' : '66.66%',
              width: '33.33%'
            }}
          />
        </div>
        
        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div className="animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-2">
                <button
                  className={`px-3 py-1 text-sm transition-colors duration-300 ${projectFilter === 'all' ? 'bg-green-900/50 text-green-300 shadow-md' : 'border border-green-300/50'} rounded-md`}
                  onClick={() => setProjectFilter('all')}
                >
                  All Projects
                </button>
                <button
                  className={`px-3 py-1 text-sm transition-colors duration-300 ${projectFilter === 'assigned' ? 'bg-green-900/50 text-green-300 shadow-md' : 'border border-green-300/50'} rounded-md`}
                  onClick={() => setProjectFilter('assigned')}
                >
                  My Assignments
                </button>
                <button
                  className={`px-3 py-1 text-sm transition-colors duration-300 ${projectFilter === 'created' ? 'bg-green-900/50 text-green-300 shadow-md' : 'border border-green-300/50'} rounded-md`}
                  onClick={() => setProjectFilter('created')}
                >
                  Created by Me
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 border border-green-400 bg-green-900/30 text-green-300 rounded-md shadow-md hover:bg-green-800/40 transition-colors duration-300"
                  onClick={() => {
                    setIsEditMode(false);
                    setSelectedProject(null);
                    setShowProjectModal(true);
                  }}
                >
                  + New Project
                </button>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search projects..."
                  className="w-full border border-green-300 bg-black p-2 pr-10 text-green-300 rounded-md focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-300/50">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Projects List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loadingProjects ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-green-300">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-400 mb-4"></div>
              <div>Loading projects...</div>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="col-span-full text-center py-12 text-yellow-300 border border-dashed border-yellow-500 p-8 rounded-lg bg-yellow-900/5">
              <div className="mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-yellow-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 21a9 9 0 100-18 9 9 0 000 18z" />
                </svg>
              </div>
              <div className="text-lg mb-2 font-bold">No Projects Found</div>
              <div>
                {searchTerm 
                  ? "No projects match your search criteria"
                  : projectFilter === 'assigned'
                    ? "You don't have any projects assigned to you"
                    : projectFilter === 'created'
                      ? "You haven't created any projects yet" 
                      : "No projects found in the database. Try using the Reload Projects button above."}
              </div>
            </div>
          ) : (
            (() => {
              console.log('=== RENDERING PROJECTS ===');
              console.log(`Rendering ${filteredProjects.length} projects`);
              
              // Check for duplicates
              const uniqueIds = new Set(filteredProjects.map(p => p.id));
              if (uniqueIds.size !== filteredProjects.length) {
                console.warn('DUPLICATE PROJECTS DETECTED!');
                console.warn(`Total projects: ${filteredProjects.length}, Unique IDs: ${uniqueIds.size}`);
              }
              
              // Remove duplicates using Map
              const uniqueProjectsMap = new Map();
              filteredProjects.forEach(project => {
                uniqueProjectsMap.set(project.id, project);
              });
              const uniqueProjects = Array.from(uniqueProjectsMap.values());
              
              console.log(`After deduplication: ${uniqueProjects.length} projects`);
              console.log('First 3 projects:', uniqueProjects.slice(0, 3).map(p => ({
                id: p.id,
                handle: p.twitterHandle,
                creator: p.createdBy,
                profileImageUrl: p.profileImageUrl
              })));
              
              return uniqueProjects.map(project => {
                console.log(`Rendering project: ${project.id} - ${project.twitterHandle} - Image: ${project.profileImageUrl || 'none'}`);
                return (
                  <ProjectCard 
                    key={project.id} 
                    project={project} 
                    onClick={() => handleEditProject(project)}
                    showCreator={projectFilter === 'assigned'}
                  />
                );
              });
            })()
          )}
        </div>
        
        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="border border-green-400 p-6 rounded-md shadow-lg animate-fadeIn">
            <h2 className="text-lg mb-4 border-b border-green-300/50 pb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
              </svg>
              Your Tasks
            </h2>
            <div className="text-yellow-300 text-sm p-4 bg-yellow-900/10 rounded-md">
              Task tracking features will be available soon
            </div>
          </div>
        )}
        
        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="border border-green-400 p-6 rounded-md shadow-lg animate-fadeIn">
            <h2 className="text-lg mb-4 border-b border-green-300/50 pb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2">
                <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97-1.94.284-3.554.535-5.184.535-.308 0-.61 0-.919-.006a.75.75 0 00-.079 1.498c.108.005.219.006.33.006 1.583 0 3.117-.189 4.578-.405 3.087-.456 5.367-3.043 5.367-6.093V6.74c0-3.05-2.28-5.637-5.367-6.092A49.45 49.45 0 0012 .25c-2.786 0-5.433.187-7.97.54C1.002 1.247-.05 3.774.002 6.74v6.02c.051 2.89 1.067 5.435 2.666 6.863.814.727 1.862 1.034 2.922.831.15-.033.3-.07.451-.109a.75.75 0 10-.342-1.459c-.136.035-.27.064-.405.098-.483.092-.932-.19-1.272-.492-1.172-1.048-1.871-2.909-1.922-5.12V6.74c-.046-2.305.624-3.815 2.092-4.098A48.07 48.07 0 0112 1.75c2.713 0 5.325.198 7.778.569 1.45.214 2.307 1.469 2.348 2.863V6.74c-.041 1.394-.9 2.648-2.348 2.863a49.796 49.796 0 01-5.668.393.75.75 0 00-.734.657c-.17.12-.038.245-.038.371l.004.02a.75.75 0 00.736.694c1.766-.014 3.48-.11 5.153-.232 1.745-.121 3.318-.303 4.836-.538v4.466c0 1.397-.906 2.65-2.355 2.864a49.404 49.404 0 01-7.666.536.75.75 0 00-.748.75v4.33a.75.75 0 00.75.75h1.376a4.5 4.5 0 014.5 4.5.75.75 0 001.5 0 4.5 4.5 0 014.5-4.5h1.376a.75.75 0 00.75-.75v-4.816a49.974 49.974 0 001.943-.162 7.5 7.5 0 00-3.762-2.972A7.465 7.465 0 0119.5 13a7.5 7.5 0 01-5.125-2.011 7.5 7.5 0 00-10.377-.518.75.75 0 01-.985-1.137 9 9 0 0112.604.618A6 6 0 0019.5 11.5a6 6 0 003.936 5.635 7.484 7.484 0 012.022 1.196c.445.324.85.703 1.199 1.129.193.232.333.501.414.789a.75.75 0 001.436-.43 4.006 4.006 0 00-.638-1.22 9.007 9.007 0 00-1.49-1.409 9.02 9.02 0 00-1.872-1.111A7.5 7.5 0 0123 13a7.468 7.468 0 01-1.252-4.5 7.53 7.53 0 01.237-1.905 7.495 7.495 0 00-9.533 1.617 6 6 0 01-8.577.378A7.5 7.5 0 003.35 8.25a.75.75 0 00-1.495.05c.086 2.756 1.302 5.447 3.546 7.458a7.465 7.465 0 005.625 1.95 7.483 7.483 0 002.524-.433 7.476 7.476 0 002.276-1.125c.206-.15.396-.314.572-.488a6.067 6.067 0 00-.592.6 6 6 0 00-1.318 3.04.75.75 0 001.474.276 4.5 4.5 0 01.986-2.272c.32-.364.677-.7 1.061-1.003A7.5 7.5 0 0122.5 8.75a.75.75 0 00-1.5 0c0 1.723-.586 3.36-1.672 4.66a4.5 4.5 0 01-2.229 1.565 7.503 7.503 0 00-2.466.881 7.493 7.493 0 00-1.667 1.14 2.87 2.87 0 00-.216.208 7.498 7.498 0 00-2.585 5.543v4.516a.752.752 0 00.934.729c1.351-.258 2.647-.62 3.88-1.08.7-.264 1.617-.663 2.133-1.07m1.922-18.75c0-1.347-.585-2.635-1.629-3.750a7.503 7.503 0 00-1.347-1.195.75.75 0 00-.72 1.307c.344.246.706.52 1.06.818.829.878 1.236 1.897 1.236 2.82a.75.75 0 101.5 0m-3.74-2.036A6.77 6.77 0 0017.25 8.75a.75.75 0 001.5 0c0-1.925-.564-3.73-1.655-5.325a.75.75 0 00-1.271.798" clipRule="evenodd" />
              </svg>
              Team Communication
            </h2>
            <div className="text-yellow-300 text-sm p-4 bg-yellow-900/10 rounded-md">
              Team messaging features will be available soon
            </div>
          </div>
        )}
      </div>
      
      {/* Project Modal */}
      {showProjectModal && (
        <ProjectModal
          project={isEditMode ? selectedProject || undefined : undefined}
          isEditMode={isEditMode}
          onClose={() => {
            setShowProjectModal(false);
            setSelectedProject(null);
          }}
          onSave={isEditMode ? handleUpdateProject : handleCreateProject}
          userRole={userRole || undefined}
          onDelete={handleDeleteProject}
          currentUserWallet={getWalletAddress() || undefined}
        />
      )}
    </div>
  )
} 