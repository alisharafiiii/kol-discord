# Role Management Guide

## Where to Find Role Management

### For Admins: Managing Other Users' Roles

1. **Login** as an admin user (e.g., sharafi_eth)
2. Click on **Admin Panel** from the main page
3. Go to the **Search** tab
4. Find the user you want to manage
5. Click **View Details** button on their row
6. In the popup modal, you'll see their current role with a **dropdown selector** next to it
7. Change the role using the dropdown - it saves automatically

### Available Roles:
- `user` - Default role for regular users
- `viewer` - Limited view-only access
- `scout` - Can scout new KOLs
- `intern` - Intern level access
- `core` - Core team member
- `admin` - Full admin access

### Important Notes:
- The role dropdown is ONLY visible in the Admin Panel when viewing other users
- You cannot change your own role from your personal profile (security measure)
- Only admins can change roles

## Twitter Profile Picture Quality Fix

I've updated the system to use high-quality Twitter profile pictures (400x400) instead of the low-quality (48x48) versions. New logins will automatically get high-quality images.

### To Update Existing Low-Quality Pictures:
Users need to log out and log back in with Twitter to refresh their profile picture.

## Profile Modal Locations

There are two different profile modals in the system:

1. **Personal Profile Modal** (components/ProfileModal.tsx)
   - Accessed via "Profile" button in the login dropdown
   - For viewing/editing your own profile
   - No role management (security)

2. **Admin User Details Modal** (inside AdminPanel.tsx)
   - Accessed via "View Details" in Admin Panel
   - For admins to view and manage other users
   - Has role dropdown selector
   - Has approval status buttons
   - Has delete user button 