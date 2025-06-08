'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Save, Eye, FileText, Copy } from '@/components/icons'

interface BriefComposerProps {
  campaignId: string
  campaignName: string
  initialBrief?: string
  onClose: () => void
  onSave: (brief: string) => void
}

interface BriefTemplate {
  id: string
  name: string
  content: string
}

const BRIEF_TEMPLATES: BriefTemplate[] = [
  {
    id: 'product-launch',
    name: 'Product Launch',
    content: `
<h2>Campaign Brief: [Campaign Name]</h2>

<h3>📋 Overview</h3>
<p>We're excited to partner with you for the launch of [Product Name]. This campaign aims to generate awareness and drive engagement for our new product.</p>

<h3>🎯 Campaign Objectives</h3>
<ul>
  <li>Create authentic content showcasing the product</li>
  <li>Drive awareness among your audience</li>
  <li>Generate engagement and conversations</li>
  <li>Share your genuine experience with the product</li>
</ul>

<h3>📱 Content Requirements</h3>
<ul>
  <li><strong>Platform:</strong> [Twitter/Instagram/TikTok]</li>
  <li><strong>Content Type:</strong> [Thread/Post/Video]</li>
  <li><strong>Posting Date:</strong> [Date Range]</li>
  <li><strong>Hashtags:</strong> #[Required] #[Hashtags]</li>
  <li><strong>Mentions:</strong> @[Brand Handle]</li>
</ul>

<h3>💡 Key Messages</h3>
<ul>
  <li>[Key message 1]</li>
  <li>[Key message 2]</li>
  <li>[Key message 3]</li>
</ul>

<h3>🚫 Do's and Don'ts</h3>
<p><strong>Do:</strong></p>
<ul>
  <li>Be authentic and share your genuine experience</li>
  <li>Use high-quality images/videos</li>
  <li>Engage with your audience's comments</li>
</ul>
<p><strong>Don't:</strong></p>
<ul>
  <li>Make unsubstantiated claims</li>
  <li>Copy/paste provided text verbatim</li>
  <li>Delete the post without prior discussion</li>
</ul>

<h3>📊 Performance Expectations</h3>
<p>We're looking for quality engagement over raw numbers. Focus on creating content that resonates with your audience.</p>

<h3>💰 Compensation</h3>
<p>[Payment details and timeline]</p>

<h3>📞 Contact</h3>
<p>For questions or clarifications, please reach out to:<br/>
[Contact Name] - [Contact Method]</p>
`
  },
  {
    id: 'brand-awareness',
    name: 'Brand Awareness',
    content: `
<h2>Brand Awareness Campaign Brief</h2>

<h3>🌟 About [Brand Name]</h3>
<p>[Brand introduction and values]</p>

<h3>🎯 Campaign Goals</h3>
<ul>
  <li>Increase brand visibility</li>
  <li>Share brand story and values</li>
  <li>Connect with new audiences</li>
</ul>

<h3>📝 Content Guidelines</h3>
<p>Create content that highlights:</p>
<ul>
  <li>Your personal connection to the brand</li>
  <li>How the brand fits into your lifestyle</li>
  <li>What makes the brand unique</li>
</ul>

<h3>🎨 Creative Direction</h3>
<p>[Visual style, tone, and mood guidelines]</p>

<h3>⏰ Timeline</h3>
<ul>
  <li><strong>Brief Sent:</strong> [Date]</li>
  <li><strong>Content Review:</strong> [Date]</li>
  <li><strong>Go Live:</strong> [Date]</li>
</ul>
`
  },
  {
    id: 'event-promotion',
    name: 'Event Promotion',
    content: `
<h2>Event Promotion Brief</h2>

<h3>🎉 Event Details</h3>
<ul>
  <li><strong>Event Name:</strong> [Name]</li>
  <li><strong>Date:</strong> [Date]</li>
  <li><strong>Location:</strong> [Venue/Online]</li>
  <li><strong>Time:</strong> [Time & Timezone]</li>
</ul>

<h3>📱 Promotion Timeline</h3>
<ul>
  <li><strong>Announcement Post:</strong> [Date]</li>
  <li><strong>Reminder Posts:</strong> [Dates]</li>
  <li><strong>Live Coverage:</strong> [If applicable]</li>
  <li><strong>Recap Post:</strong> [Date]</li>
</ul>

<h3>🎯 Key Information to Share</h3>
<ul>
  <li>Event highlights and speakers</li>
  <li>Registration/ticket information</li>
  <li>What attendees can expect</li>
  <li>Your excitement about the event</li>
</ul>
`
  }
]

export default function BriefComposer({ campaignId, campaignName, initialBrief, onClose, onSave }: BriefComposerProps) {
  const [content, setContent] = useState(initialBrief || '')
  const [showPreview, setShowPreview] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  
  // Load initial brief or template
  useEffect(() => {
    if (initialBrief) {
      setContent(initialBrief)
    }
  }, [initialBrief])
  
  // Format selected text
  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }
  
  // Insert link
  const insertLink = () => {
    const url = prompt('Enter URL:')
    if (url) {
      formatText('createLink', url)
    }
  }
  
  // Insert list
  const insertList = (type: 'ordered' | 'unordered') => {
    formatText(type === 'ordered' ? 'insertOrderedList' : 'insertUnorderedList')
  }
  
  // Apply template
  const applyTemplate = (templateId: string) => {
    const template = BRIEF_TEMPLATES.find(t => t.id === templateId)
    if (template) {
      setContent(template.content.trim().replace('[Campaign Name]', campaignName))
      setSelectedTemplate(templateId)
    }
  }
  
  // Handle save
  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(content)
      onClose()
    } catch (error) {
      console.error('Error saving brief:', error)
    } finally {
      setIsSaving(false)
    }
  }
  
  // Copy brief to clipboard
  const copyToClipboard = () => {
    const textContent = editorRef.current?.innerText || ''
    navigator.clipboard.writeText(textContent).then(() => {
      alert('Brief copied to clipboard!')
    })
  }
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-black border border-green-500 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-green-500">
          <h2 className="text-xl font-bold text-green-300">Campaign Brief Editor</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-green-900/50 rounded transition-colors"
          >
            <X className="w-5 h-5 text-green-300" />
          </button>
        </div>
        
        {/* Toolbar */}
        <div className="p-4 border-b border-green-500 space-y-3">
          {/* Template selector */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-green-400">Template:</label>
            <select
              value={selectedTemplate}
              onChange={(e) => applyTemplate(e.target.value)}
              className="px-3 py-1 bg-black border border-green-500 rounded text-green-300 text-sm focus:outline-none focus:border-green-400"
            >
              <option value="">Choose a template...</option>
              {BRIEF_TEMPLATES.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Formatting buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => formatText('bold')}
              className="px-3 py-1 border border-green-500 text-green-300 rounded hover:bg-green-900/30 text-sm font-bold"
              title="Bold"
            >
              B
            </button>
            <button
              onClick={() => formatText('italic')}
              className="px-3 py-1 border border-green-500 text-green-300 rounded hover:bg-green-900/30 text-sm italic"
              title="Italic"
            >
              I
            </button>
            <button
              onClick={() => formatText('underline')}
              className="px-3 py-1 border border-green-500 text-green-300 rounded hover:bg-green-900/30 text-sm underline"
              title="Underline"
            >
              U
            </button>
            <div className="w-px bg-green-500" />
            
            <button
              onClick={() => formatText('formatBlock', '<h2>')}
              className="px-3 py-1 border border-green-500 text-green-300 rounded hover:bg-green-900/30 text-sm"
              title="Heading 2"
            >
              H2
            </button>
            <button
              onClick={() => formatText('formatBlock', '<h3>')}
              className="px-3 py-1 border border-green-500 text-green-300 rounded hover:bg-green-900/30 text-sm"
              title="Heading 3"
            >
              H3
            </button>
            <button
              onClick={() => formatText('formatBlock', '<p>')}
              className="px-3 py-1 border border-green-500 text-green-300 rounded hover:bg-green-900/30 text-sm"
              title="Paragraph"
            >
              P
            </button>
            <div className="w-px bg-green-500" />
            
            <button
              onClick={() => insertList('unordered')}
              className="px-3 py-1 border border-green-500 text-green-300 rounded hover:bg-green-900/30 text-sm"
              title="Bullet List"
            >
              • List
            </button>
            <button
              onClick={() => insertList('ordered')}
              className="px-3 py-1 border border-green-500 text-green-300 rounded hover:bg-green-900/30 text-sm"
              title="Numbered List"
            >
              1. List
            </button>
            <div className="w-px bg-green-500" />
            
            <button
              onClick={insertLink}
              className="px-3 py-1 border border-green-500 text-green-300 rounded hover:bg-green-900/30 text-sm"
              title="Insert Link"
            >
              🔗 Link
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-3 py-1 border border-green-500 text-green-300 rounded hover:bg-green-900/30 text-sm flex items-center gap-1"
              title="Toggle Preview"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {showPreview ? (
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
              <div className="prose prose-invert prose-green max-w-none">
                <div 
                  dangerouslySetInnerHTML={{ __html: content }}
                  className="brief-preview"
                />
              </div>
            </div>
          ) : (
            <div
              ref={editorRef}
              contentEditable
              onInput={(e) => setContent(e.currentTarget.innerHTML)}
              dangerouslySetInnerHTML={{ __html: content }}
              className="p-6 min-h-[400px] max-h-[calc(90vh-250px)] overflow-y-auto focus:outline-none"
              style={{
                lineHeight: 1.6,
                fontSize: '16px',
              }}
            />
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-green-500 flex justify-between">
          <button
            onClick={copyToClipboard}
            className="px-4 py-2 border border-green-500 text-green-300 rounded hover:bg-green-900/30 transition-colors flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Copy Text
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-green-300 hover:text-green-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !content.trim()}
              className="px-4 py-2 bg-green-900 text-green-100 rounded hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-green-100 border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Brief
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .brief-preview h2 {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 1.5rem 0 1rem;
          color: #86efac;
        }
        .brief-preview h3 {
          font-size: 1.25rem;
          font-weight: bold;
          margin: 1.25rem 0 0.75rem;
          color: #86efac;
        }
        .brief-preview p {
          margin: 0.75rem 0;
          color: #bbf7d0;
        }
        .brief-preview ul, .brief-preview ol {
          margin: 0.75rem 0;
          padding-left: 1.5rem;
          color: #bbf7d0;
        }
        .brief-preview li {
          margin: 0.5rem 0;
        }
        .brief-preview strong {
          color: #86efac;
          font-weight: bold;
        }
        .brief-preview a {
          color: #60a5fa;
          text-decoration: underline;
        }
        .brief-preview a:hover {
          color: #93c5fd;
        }
      `}</style>
    </div>
  )
} 