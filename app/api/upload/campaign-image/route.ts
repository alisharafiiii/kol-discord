import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { nanoid } from 'nanoid'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const campaignId = formData.get('campaignId') as string
    const type = formData.get('type') as string // 'hero' or 'screenshot'
    
    if (!file || !campaignId) {
      return NextResponse.json({ error: 'File and campaign ID required' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = `${type}-${campaignId}-${nanoid()}.${file.name.split('.').pop()}`
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'campaigns')
    const filepath = join(uploadDir, filename)
    
    // Ensure upload directory exists
    await writeFile(filepath, buffer).catch(async () => {
      // Create directory if it doesn't exist
      const { mkdir } = await import('fs/promises')
      await mkdir(uploadDir, { recursive: true })
      await writeFile(filepath, buffer)
    })
    
    const url = `/uploads/campaigns/${filename}`
    
    return NextResponse.json({ url })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
} 