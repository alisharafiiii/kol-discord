import React, { useState, useEffect, useRef } from 'react';
import { Project } from '@/lib/project';

interface ProjectModalProps {
  project?: Project;
  onClose: () => void;
  onSave: (projectData: any) => void;
  isEditMode?: boolean;
  userRole?: string;
  onDelete?: (projectId: string) => void;
  currentUserWallet?: string;
}

const priorityOptions = ['low', 'medium', 'high'];
const badgeOptions = ['none', 'blue', 'gold'];
const stageOptions = [
  'dmd', 'replied', 'no-reply', 'meeting', 'no-budget', 'high-budget', 'completed', 'rejected'
];

// Social platform base URLs
const socialPlatformUrls = {
  twitter: 'https://twitter.com/',
  instagram: 'https://instagram.com/',
  tiktok: 'https://tiktok.com/@',
  youtube: 'https://youtube.com/@',
  discord: 'https://discord.gg/',
  telegram: 'https://t.me/',
  other: ''
};

export default function ProjectModal({ 
  project, 
  onClose, 
  onSave, 
  isEditMode = false,
  userRole = 'scout',
  onDelete,
  currentUserWallet,
}: ProjectModalProps) {
  // Track existing social links
  const [socialPlatforms, setSocialPlatforms] = useState<string[]>([]);
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    twitterHandle: '',
    profileImageUrl: '',
    followerCount: '' as string | number,
    badgeType: 'none',
    priority: 'medium',
    stage: 'dmd',
    website: '',
    notes: '',
    socialLinks: {} as Record<string, string>,
  });
  
  // For image upload
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [imageError, setImageError] = useState(false);
  
  // Social platform options
  const platformOptions = [
    'twitter', 'discord', 'telegram', 'instagram', 'tiktok', 'youtube', 'other'
  ];
  
  // Check if Twitter handle exists timer
  const [checking, setChecking] = useState(false);
  const [exists, setExists] = useState(false);
  const [checkingMessage, setCheckingMessage] = useState('');
  
  // Initialize form with project data if in edit mode
  useEffect(() => {
    if (isEditMode && project) {
      setFormData({
        twitterHandle: project.twitterHandle,
        profileImageUrl: project.profileImageUrl || '',
        followerCount: project.followerCount,
        badgeType: project.badgeType || 'none',
        priority: project.priority,
        stage: project.stage,
        website: project.website || '',
        notes: project.notes || '',
        socialLinks: project.socialLinks || {},
      });
      
      // Set up social platforms
      if (project.socialLinks) {
        setSocialPlatforms(Object.keys(project.socialLinks));
      }
      
      // Set image preview if there's a profile image
      if (project.profileImageUrl) {
        setImagePreview(project.profileImageUrl);
      }
    }
  }, [isEditMode, project]);
  
  // Handle changes to form fields
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Special handling for follower count to ensure it's a number when provided
    if (name === 'followerCount') {
      if (value === '') {
        setFormData(prev => ({
          ...prev,
          [name]: ''
        }));
      } else {
        const numberValue = parseInt(value);
        setFormData(prev => ({
          ...prev,
          [name]: isNaN(numberValue) ? '' : numberValue
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Handle file input change for image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Basic validation
    if (!file.type.includes('image/')) {
      setUploadStatus('Please select an image file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB
      setUploadStatus('Image must be less than 5MB');
      return;
    }
    
    setImageFile(file);
    setUploadStatus('');
    setImageError(false);
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  // Convert selected image to base64 data URL (avoids server file-system write)
  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return formData.profileImageUrl;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = () => reject(null);
      reader.readAsDataURL(imageFile);
    });
  };
  
  // Check if Twitter handle already exists
  useEffect(() => {
    const checkHandle = async () => {
      if (!formData.twitterHandle || formData.twitterHandle.length < 3 || isEditMode) {
        setChecking(false);
        setExists(false);
        setCheckingMessage('');
        return;
      }
      
      setChecking(true);
      setCheckingMessage('Checking...');
      
      try {
        const normalizedHandle = formData.twitterHandle.replace('@', '');
        const response = await fetch(`/api/projects/check-exists?handle=${normalizedHandle}`);
        const data = await response.json();
        
        setExists(data.exists);
        setCheckingMessage(data.exists ? 'Project already exists!' : 'Available');
        
        // If exists, show a more detailed error with a link to view the existing project
        if (data.exists && data.projectId) {
          setCheckingMessage(`Project exists! ID: ${data.projectId}`);
        }
      } catch (error) {
        console.error('Error checking handle:', error);
        setCheckingMessage('Error checking');
      } finally {
        setChecking(false);
      }
    };
    
    const timer = setTimeout(checkHandle, 500);
    return () => clearTimeout(timer);
  }, [formData.twitterHandle, isEditMode]);
  
  // Toggle social platform expansion
  const togglePlatform = (platform: string) => {
    setExpandedPlatform(expandedPlatform === platform ? null : platform);
  };
  
  // Add a new social platform
  const addSocialPlatform = (platform: string) => {
    if (!socialPlatforms.includes(platform)) {
      setSocialPlatforms(prev => [...prev, platform]);
      setExpandedPlatform(platform);
      
      // Initialize the platform in socialLinks if it doesn't exist
      if (!formData.socialLinks[platform]) {
        setFormData(prev => ({
          ...prev,
          socialLinks: {
            ...prev.socialLinks,
            [platform]: ''
          }
        }));
      }
    }
  };
  
  // Remove a social platform
  const removeSocialPlatform = (platform: string) => {
    setSocialPlatforms(prev => prev.filter(p => p !== platform));
    
    // Remove the platform from socialLinks
    const updatedSocialLinks = { ...formData.socialLinks };
    delete updatedSocialLinks[platform];
    
    setFormData(prev => ({
      ...prev,
      socialLinks: updatedSocialLinks
    }));
    
    if (expandedPlatform === platform) {
      setExpandedPlatform(null);
    }
  };
  
  // Update social link
  const updateSocialLink = (platform: string, value: string) => {
    // Store just the username without the URL prefix
    // For usernames that include @ symbol, remove it
    const username = platform === 'twitter' || platform === 'tiktok' || platform === 'youtube' 
      ? value.replace('@', '') 
      : value;
      
    setFormData(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: username
      }
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Remove wallet check - only Twitter authentication is required for scout
    console.log('Form submission started');
    
    // Don't allow submission if the Twitter handle already exists and we're not in edit mode
    if (!isEditMode && exists) {
      alert('A project with this Twitter handle already exists!');
      return;
    }
    
    // Don't allow submission if Twitter handle is missing
    if (!formData.twitterHandle) {
      alert('Twitter handle is required!');
      return;
    }
    
    // Don't allow submission if follower count is not provided
    if (formData.followerCount === '') {
      alert('Follower count is required!');
      return;
    }
    
    // Upload image if one is selected
    let imageUrl = formData.profileImageUrl;
    if (imageFile) {
      console.log('Starting image upload...');
      const uploadedUrl = await uploadImage();
      if (uploadedUrl) {
        console.log('Image upload successful:', uploadedUrl);
        imageUrl = uploadedUrl;
      } else if (imageFile) {
        // If upload failed and we had a file, warn the user
        console.warn('Image upload failed but continuing with form submission');
        const continueAnyway = confirm('Image upload failed. Do you want to continue saving without the image?');
        if (!continueAnyway) {
          return;
        }
      }
    }
    
    // Format website URL if needed - add https:// if not present and not empty
    let websiteUrl = formData.website;
    if (websiteUrl && !websiteUrl.match(/^https?:\/\//i)) {
      websiteUrl = `https://${websiteUrl}`;
      console.log('Formatted website URL:', websiteUrl);
    }
    
    // Normalize the twitter handle
    const normalizedHandle = formData.twitterHandle.startsWith('@') 
      ? formData.twitterHandle 
      : `@${formData.twitterHandle}`;
    
    console.log('Normalizing Twitter handle:', formData.twitterHandle, '->', normalizedHandle);
    
    const normalized = {
      ...formData,
      profileImageUrl: imageUrl,
      website: websiteUrl,
      followerCount: typeof formData.followerCount === 'string' ? 
        parseInt(formData.followerCount) || 0 : formData.followerCount,
      twitterHandle: normalizedHandle
    };
    
    console.log('Submitting project data:', JSON.stringify(normalized));
    
    try {
      // If editing, include the project ID
      if (isEditMode && project) {
        onSave({
          ...normalized,
          id: project.id
        });
      } else {
        onSave(normalized);
      }
    } catch (error) {
      console.error('Error saving project:', error);
      alert(`Failed to save project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Update image preview when URL changes
  useEffect(() => {
    if (formData.profileImageUrl) {
      setImagePreview(formData.profileImageUrl);
      setImageError(false);
    }
  }, [formData.profileImageUrl]);
  
  // Add a UI helper function for the duplicate error display
  const renderDuplicateError = () => {
    if (!isEditMode && exists) {
      return (
        <div className="mt-1 p-2 bg-red-900/30 border border-red-500 text-red-300 text-xs rounded">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
            <span>A project with this Twitter handle already exists in the database.</span>
          </div>
          <div className="mt-1">
            Please use a different Twitter handle or search for the existing project to edit it.
          </div>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
      <div 
        className="relative max-w-xl w-full bg-black border-2 border-green-400 max-h-[90vh] overflow-y-auto rounded-lg shadow-lg shadow-green-900/30"
        style={{ 
          backgroundImage: 'radial-gradient(circle at top right, rgba(0, 50, 20, 0.15), transparent 70%)'
        }}
      >
        <div className="sticky top-0 bg-black p-4 border-b border-green-400 flex justify-between items-center z-10">
          <h2 className="text-xl font-mono text-green-300 font-bold relative">
            <span className="relative">
              {isEditMode ? 'Edit Project' : 'New Project'}
              <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent"></span>
            </span>
          </h2>
          <button
            className="text-green-300 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-green-900/30"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-4">
            {/* Twitter handle */}
            <div>
              <label className="block text-xs uppercase text-green-300 mb-1">Twitter Handle*</label>
              <div className="relative">
                <input
                  type="text"
                  name="twitterHandle"
                  value={formData.twitterHandle}
                  onChange={handleChange}
                  className={`w-full bg-black border ${exists ? 'border-red-400' : 'border-green-300'} p-2 text-green-100 rounded-md transition-colors`}
                  placeholder="@handle"
                  disabled={isEditMode && userRole !== 'admin'} // Only admin can edit handle in edit mode
                  required
                />
                {!isEditMode && checking && (
                  <div className="absolute right-2 top-2 text-xs text-yellow-400 animate-pulse">
                    {checkingMessage}
                  </div>
                )}
                {!isEditMode && !checking && checkingMessage && (
                  <div className={`absolute right-2 top-2 text-xs ${exists ? 'text-red-400' : 'text-green-400'}`}>
                    {checkingMessage}
                  </div>
                )}
              </div>
              {renderDuplicateError()}
            </div>
            
            {/* Test Button - only in new mode, for admins and core roles */}
            {!isEditMode && (userRole === 'admin' || userRole === 'core') && (
              <div>
                <button
                  type="button"
                  className="bg-blue-900/30 border border-blue-400 text-blue-300 px-4 py-2 text-sm"
                  onClick={() => {
                    // Intentionally left as a stub since this will be implemented later
                    alert('Testing Twitter handle... This feature will be implemented in the future.');
                  }}
                >
                  Test Twitter API
                </button>
                <div className="text-xs text-blue-400 mt-1">
                  Tests if the Twitter handle exists and retrieves profile information
                </div>
              </div>
            )}
            
            {/* Profile Image - Now with file upload option */}
            <div>
              <label className="block text-xs uppercase text-green-300 mb-1">Profile Image</label>
              
              <div className="flex items-start gap-4">
                {/* Image preview */}
                <div className="w-24 h-24 border border-green-300 overflow-hidden flex items-center justify-center bg-black">
                  {imagePreview ? (
                    <img 
                      src={imagePreview} 
                      alt="Profile Preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('Image failed to load:', imagePreview);
                        setImageError(true);
                        e.currentTarget.src = 'https://via.placeholder.com/100?text=Error';
                      }}
                      style={{ display: imageError ? 'none' : 'block' }}
                    />
                  ) : (
                    <div className="text-xs text-green-300 text-center">No image</div>
                  )}
                  {imageError && (
                    <div className="text-xs text-red-300 text-center">
                      Image Error<br/>Please try another
                    </div>
                  )}
                </div>
                
                <div className="flex-1 space-y-2">
                  {/* File input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-green-900/30 border border-green-300 text-green-100 px-3 py-1 text-xs"
                  >
                    Upload Image
                  </button>
                  
                  {uploadStatus && (
                    <div className="text-xs text-yellow-300">
                      {uploadStatus}
                    </div>
                  )}
                  
                  {/* Image URL option */}
                  <div>
                    <label className="block text-xs text-green-300 mt-2 mb-1">Or enter image URL:</label>
                    <input
                      type="url"
                      name="profileImageUrl"
                      value={formData.profileImageUrl}
                      onChange={(e) => {
                        handleChange(e);
                        if (e.target.value) {
                          setImagePreview(e.target.value);
                        }
                      }}
                      className="w-full bg-black border border-green-300 p-2 text-xs text-green-100"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Follower Count */}
            <div>
              <label className="block text-xs uppercase text-green-300 mb-1">Follower Count*</label>
              <input
                type="number"
                name="followerCount"
                value={formData.followerCount}
                onChange={handleChange}
                className="w-full bg-black border border-green-300 p-2 text-green-100"
                min="0"
                placeholder="e.g. 5000"
                required
              />
            </div>
            
            {/* Badge Type */}
            <div>
              <label className="block text-xs uppercase text-green-300 mb-1">Badge Type</label>
              <select
                name="badgeType"
                value={formData.badgeType}
                onChange={handleChange}
                className="w-full bg-black border border-green-300 p-2 text-green-100"
              >
                {badgeOptions.map(option => (
                  <option key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Priority - Admin or Core only */}
            {(userRole === 'admin' || userRole === 'core' || !isEditMode) && (
              <div>
                <label className="block text-xs uppercase text-green-300 mb-1">Priority</label>
                <div className="flex gap-2">
                  {priorityOptions.map(option => (
                    <label key={option} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="priority"
                        value={option}
                        checked={formData.priority === option}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <div className={`px-3 py-1 border ${
                        formData.priority === option
                          ? getPrioritySelectedStyle(option)
                          : 'border-gray-600 text-gray-400'
                      }`}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            {/* Stage - Admin or Core only */}
            {(userRole === 'admin' || userRole === 'core' || !isEditMode) && (
              <div>
                <label className="block text-xs uppercase text-green-300 mb-1">Stage</label>
                <select
                  name="stage"
                  value={formData.stage}
                  onChange={handleChange}
                  className="w-full bg-black border border-green-300 p-2 text-green-100"
                >
                  {stageOptions.map(option => (
                    <option key={option} value={option}>
                      {option === 'dmd' ? 'DMD' : option.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Website */}
            <div>
              <label className="block text-xs uppercase text-green-300 mb-1">Website</label>
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="w-full bg-black border border-green-300 p-2 text-green-100"
                placeholder="nabulines.com or https://example.com"
              />
              {formData.website && (
                <div className="text-xs text-blue-300 mt-1">
                  <a 
                    href={formData.website.match(/^https?:\/\//i) ? formData.website : `https://${formData.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-400"
                  >
                    Test link
                  </a>
                </div>
              )}
            </div>
            
            {/* Social Links - Modified to ask for usernames */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs uppercase text-green-300">Social Links</label>
                <div className="relative inline-block">
                  <select
                    className="bg-black border border-green-300 p-1 text-xs text-green-100"
                    onChange={(e) => {
                      if (e.target.value) {
                        addSocialPlatform(e.target.value);
                        e.target.value = ''; // Reset select
                      }
                    }}
                    value=""
                  >
                    <option value="">Add platform...</option>
                    {platformOptions.filter(p => !socialPlatforms.includes(p)).map(platform => (
                      <option key={platform} value={platform}>
                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                {socialPlatforms.map(platform => (
                  <div key={platform} className="border border-green-300">
                    <div className="flex justify-between items-center p-2 bg-green-900/20">
                      <button
                        type="button"
                        className="text-xs text-left flex-1"
                        onClick={() => togglePlatform(platform)}
                      >
                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </button>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => togglePlatform(platform)}
                          className="text-xs text-green-300"
                        >
                          {expandedPlatform === platform ? '▲' : '▼'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSocialPlatform(platform)}
                          className="text-xs text-red-400"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    
                    {expandedPlatform === platform && (
                      <div className="p-2 border-t border-green-300">
                        <label className="block text-xs text-green-300 mb-1">
                          {platform === 'twitter' ? 'Username (without @):' : 
                           platform === 'discord' ? 'Server invite code:' :
                           platform === 'other' ? 'Full URL:' :
                           'Username:'}
                        </label>
                        <input
                          type={platform === 'other' ? 'url' : 'text'}
                          value={formData.socialLinks[platform] || ''}
                          onChange={(e) => updateSocialLink(platform, e.target.value)}
                          className="w-full bg-black border border-green-300 p-2 text-xs text-green-100"
                          placeholder={
                            platform === 'twitter' ? 'elonmusk' :
                            platform === 'instagram' ? 'zuck' :
                            platform === 'tiktok' ? 'charlidamelio' :
                            platform === 'youtube' ? 'mrbeast' :
                            platform === 'discord' ? 'invite' :
                            platform === 'telegram' ? 'username' :
                            'https://example.com'
                          }
                        />
                        {formData.socialLinks[platform] && (
                          <div className="text-xs text-blue-300 mt-1">
                            Link will be: {' '}
                            <a 
                              href={platform === 'other' 
                                ? formData.socialLinks[platform] 
                                : `${platform in socialPlatformUrls ? socialPlatformUrls[platform as keyof typeof socialPlatformUrls] : ''}${formData.socialLinks[platform]}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:text-blue-400"
                            >
                              {platform === 'other' 
                                ? formData.socialLinks[platform] 
                                : `${platform in socialPlatformUrls ? socialPlatformUrls[platform as keyof typeof socialPlatformUrls] : ''}${formData.socialLinks[platform]}`
                              }
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
                {socialPlatforms.length === 0 && (
                  <div className="text-xs text-gray-400 p-2 border border-green-300 border-dashed text-center">
                    No social links added
                  </div>
                )}
              </div>
            </div>
            
            {/* Notes */}
            <div>
              <label className="block text-xs uppercase text-green-300 mb-1">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="w-full bg-black border border-green-300 p-2 text-green-100 min-h-[100px]"
                placeholder="Add any notes about this project..."
              />
            </div>
          </div>
          
          <div className="flex justify-between pt-4 border-t border-green-300/30">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-green-300 text-green-300 hover:bg-green-900/30"
            >
              Cancel
            </button>
            <div className="flex gap-2">
              {isEditMode && project && (userRole === 'admin' || currentUserWallet === project.createdBy) && onDelete && (
                <button
                  type="button"
                  className="px-4 py-2 border border-red-400 text-red-400 hover:bg-red-900/30 transition-colors"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
                      onDelete(project.id);
                    }
                  }}
                >
                  Delete Project
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-2 bg-green-800 text-white hover:bg-green-700"
                disabled={!isEditMode && exists}
              >
                {isEditMode ? 'Update Project' : 'Create Project'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper function for priority styles
function getPrioritySelectedStyle(priority: string): string {
  switch (priority) {
    case 'high':
      return 'border-red-500 bg-red-900/30 text-red-300';
    case 'medium':
      return 'border-yellow-500 bg-yellow-900/30 text-yellow-300';
    case 'low':
      return 'border-green-500 bg-green-900/30 text-green-300';
    default:
      return 'border-gray-500 bg-gray-900/30 text-gray-300';
  }
} 