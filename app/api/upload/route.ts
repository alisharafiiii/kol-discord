import { NextRequest, NextResponse } from 'next/server';
import { checkUserRole } from '@/lib/user-identity';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Configure upload directory
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');

// Ensure upload directory exists
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    console.log(`Creating upload directory: ${UPLOAD_DIR}`);
    await mkdir(UPLOAD_DIR, { recursive: true });
    return true;
  }
  return false;
}

// Ensure the upload directory exists at server startup
ensureUploadDir().then(created => {
  if (created) {
    console.log('Created upload directory for project images');
  } else {
    console.log('Upload directory for project images already exists');
  }
}).catch(err => {
  console.error('Error creating upload directory:', err);
});

export async function POST(req: NextRequest) {
  try {
    // Get wallet from request cookies or headers
    const walletFromCookie = req.cookies.get('walletAddress')?.value || req.cookies.get('wallet')?.value;
    const walletFromHeader = req.headers.get('X-Wallet-Address');
    const walletAddress = walletFromCookie || walletFromHeader;
    
    console.log(`Upload attempt - Cookie wallet: ${walletFromCookie || 'none'}, Header wallet: ${walletFromHeader || 'none'}`);
    
    if (!walletAddress) {
      console.error('Upload failed: No wallet address in cookies or headers');
      return NextResponse.json({ error: 'No wallet connected' }, { status: 401 });
    }
    
    console.log(`Upload attempt from wallet: ${walletAddress}`);
    
    // Allow regular users with at least 'user' role to upload images
    const roleCheck = await checkUserRole(walletAddress, ['admin', 'core', 'scout', 'user', 'viewer']);
    console.log(`Upload role check for ${walletAddress}: `, roleCheck);
    
    if (!roleCheck.hasAccess) {
      console.error('Upload failed: Unauthorized role', roleCheck);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Parse form data from request
    const formData = await req.formData();
    
    // Get the file from form data
    const file = formData.get('image') as File;
    
    if (!file) {
      console.error('Upload failed: No file in request');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    // Validate file type
    const fileType = file.type;
    if (!fileType.startsWith('image/')) {
      console.error(`Upload failed: Invalid file type ${fileType}`);
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }
    
    // Get file size
    const fileSize = file.size;
    if (fileSize > 5 * 1024 * 1024) { // 5MB limit
      console.error(`Upload failed: File too large (${fileSize} bytes)`);
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }
    
    // Read file as array buffer
    const buffer = await file.arrayBuffer();
    
    // Generate unique filename
    const fileExt = fileType.split('/')[1];
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = join(UPLOAD_DIR, fileName);
    
    console.log(`Saving image as: ${fileName} (${fileSize} bytes)`);
    
    // Ensure upload directory exists again just before writing
    await ensureUploadDir();
    
    // Write file to disk
    await writeFile(filePath, Buffer.from(buffer));
    
    // Generate URL for the uploaded file
    const fileUrl = `/uploads/${fileName}`;
    
    console.log(`Upload complete: ${fileUrl}`);
    
    return NextResponse.json({ 
      success: true, 
      imageUrl: fileUrl 
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error uploading image:', error);
    return NextResponse.json({ 
      error: `Failed to upload image: ${error.message || 'Unknown error'}` 
    }, { status: 500 });
  }
} 