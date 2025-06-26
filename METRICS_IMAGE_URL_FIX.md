# Metrics Campaign Image URL Error Fix

## Issue
When adding an Instagram post to the metric campaign detail page, the application crashed with the error:
```
Error: Invalid src prop (https://x.com/spurs/photo) on next/image, hostname "x.com" is not configured under images in your next.config.js
```

## Root Cause
The user entered a social media post URL (https://x.com/spurs/photo) in the "Author Profile Picture URL" field instead of a direct image URL. This caused the Next.js Image component to fail because:
1. The URL wasn't a valid image URL
2. The hostname wasn't configured in next.config.js

## Solutions Implemented

### 1. Image URL Validation
Added an isValidImageUrl() function that:
- Checks for common image file extensions (.jpg, .png, .gif, etc.)
- Verifies if the URL is from known image hosting services
- Rejects social media post URLs (like x.com/user/photo)
- Returns true for empty URLs (to use fallback avatar)

### 2. Automatic Fallback Avatar
- Created getFallbackAvatar() function that generates a unique avatar using DiceBear API
- Uses the author's name as a seed for consistent avatars
- Automatically applied when:
  - No URL is provided
  - An invalid URL is detected

### 3. Form Validation
- Added validation in handleSubmit() to check image URLs before saving
- Shows helpful error message if invalid URL is entered
- Prevents saving posts with invalid image URLs

### 4. SafeImage Component
Created a wrapper component around Next.js Image that:
- Handles image loading errors gracefully
- Falls back to alternative image if primary fails
- Prevents application crashes from invalid URLs

### 5. Extended Image Domains
Updated next.config.js to support more image hosting services:
- Instagram CDN domains
- Imgur
- GitHub avatars
- Google user content
- Facebook Graph API
- Cloudinary

### 6. User Experience Improvements
- Added helpful placeholder text: "https://example.com/image.jpg (optional)"
- Added hint text: "Enter a direct image URL or leave empty for auto-generated avatar"
- Clear error messages when validation fails

## Result
- No more crashes when invalid URLs are entered
- Automatic fallback to generated avatars
- Better support for various image hosting services
- Clear guidance for users on what URLs are valid
- Graceful error handling throughout the application
