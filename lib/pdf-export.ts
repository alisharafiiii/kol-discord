import jsPDF from 'jspdf'
import type { CampaignKOL, KOLTier } from './types/profile'
import type { Campaign } from './campaign'

interface AnalyticsData {
  campaign: Campaign
  kols: CampaignKOL[]
  totalKOLs: number
  totalBudget: number
  totalViews: number
  totalEngagement: number
  costPerView: number
  costPerEngagement: number
  averageEngagementRate: number
  tierDistribution: Array<{
    name: string
    value: number
    views: number
    budget: number
  }>
  topPerformers: Array<{
    handle: string
    name: string
    tier: KOLTier
    views: number
    engagement: number
    score: number
  }>
}

export class PDFExporter {
  private doc: jsPDF
  private pageWidth: number
  private pageHeight: number
  private margin: number
  private currentY: number
  
  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })
    
    this.pageWidth = this.doc.internal.pageSize.getWidth()
    this.pageHeight = this.doc.internal.pageSize.getHeight()
    this.margin = 20
    this.currentY = this.margin
  }
  
  // Export analytics report
  async exportAnalytics(data: AnalyticsData): Promise<Blob> {
    // Header
    this.addHeader('Campaign Analytics Report')
    this.addSubheader(data.campaign.name)
    this.addDate()
    
    // Executive Summary
    this.addSection('Executive Summary')
    this.addKeyMetrics(data)
    
    // Tier Distribution
    this.addPageBreak()
    this.addSection('KOL Tier Distribution')
    this.addTierDistribution(data.tierDistribution)
    
    // Top Performers
    this.addSection('Top Performers')
    this.addTopPerformers(data.topPerformers)
    
    // Budget Analysis
    this.addPageBreak()
    this.addSection('Budget Analysis')
    this.addBudgetAnalysis(data)
    
    // Footer on all pages
    this.addFooterToAllPages()
    
    return this.doc.output('blob')
  }
  
  // Export KOL list
  async exportKOLList(campaign: Campaign, kols: CampaignKOL[]): Promise<Blob> {
    // Header
    this.addHeader('Campaign KOL List')
    this.addSubheader(campaign.name)
    this.addDate()
    
    // Summary
    this.addText(`Total KOLs: ${kols.length}`, 12)
    this.addText(`Total Budget: $${kols.reduce((sum, k) => sum + k.budget, 0).toLocaleString()}`, 12)
    this.currentY += 10
    
    // KOL Table
    this.addKOLTable(kols)
    
    // Footer
    this.addFooterToAllPages()
    
    return this.doc.output('blob')
  }
  
  // Helper methods
  private addHeader(text: string) {
    this.doc.setFontSize(24)
    this.doc.setTextColor(34, 197, 94) // Green color
    this.doc.text(text, this.pageWidth / 2, this.currentY, { align: 'center' })
    this.currentY += 15
  }
  
  private addSubheader(text: string) {
    this.doc.setFontSize(18)
    this.doc.setTextColor(100, 100, 100)
    this.doc.text(text, this.pageWidth / 2, this.currentY, { align: 'center' })
    this.currentY += 10
  }
  
  private addDate() {
    this.doc.setFontSize(10)
    this.doc.setTextColor(150, 150, 150)
    this.doc.text(
      `Generated on ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`,
      this.pageWidth / 2,
      this.currentY,
      { align: 'center' }
    )
    this.currentY += 15
  }
  
  private addSection(title: string) {
    this.checkPageBreak(20)
    this.doc.setFontSize(16)
    this.doc.setTextColor(34, 197, 94)
    this.doc.text(title, this.margin, this.currentY)
    this.currentY += 10
    
    // Add underline
    this.doc.setDrawColor(34, 197, 94)
    this.doc.line(this.margin, this.currentY - 5, this.margin + 50, this.currentY - 5)
  }
  
  private addText(text: string, fontSize = 10, color = [0, 0, 0] as [number, number, number]) {
    this.checkPageBreak(10)
    this.doc.setFontSize(fontSize)
    this.doc.setTextColor(...color)
    this.doc.text(text, this.margin, this.currentY)
    this.currentY += fontSize * 0.5
  }
  
  private addKeyMetrics(data: AnalyticsData) {
    const metrics = [
      { label: 'Total KOLs:', value: data.totalKOLs.toString() },
      { label: 'Total Budget:', value: `$${data.totalBudget.toLocaleString()}` },
      { label: 'Total Views:', value: this.formatNumber(data.totalViews) },
      { label: 'Total Engagement:', value: this.formatNumber(data.totalEngagement) },
      { label: 'Average Engagement Rate:', value: `${data.averageEngagementRate.toFixed(2)}%` },
      { label: 'Cost per View:', value: `$${data.costPerView.toFixed(4)}` },
      { label: 'Cost per Engagement:', value: `$${data.costPerEngagement.toFixed(2)}` }
    ]
    
    const boxHeight = 80
    this.checkPageBreak(boxHeight)
    
    // Draw box
    this.doc.setDrawColor(34, 197, 94)
    this.doc.setFillColor(240, 253, 244)
    this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, boxHeight, 'FD')
    
    // Add metrics in two columns
    const colWidth = (this.pageWidth - 2 * this.margin) / 2
    let yPos = this.currentY + 10
    
    metrics.forEach((metric, index) => {
      const xPos = index < 4 ? this.margin + 5 : this.margin + colWidth + 5
      const localY = yPos + ((index % 4) * 18)
      
      this.doc.setFontSize(10)
      this.doc.setTextColor(100, 100, 100)
      this.doc.text(metric.label, xPos, localY)
      
      this.doc.setFontSize(12)
      this.doc.setTextColor(0, 0, 0)
      this.doc.text(metric.value, xPos + 60, localY)
    })
    
    this.currentY += boxHeight + 10
  }
  
  private addTierDistribution(tiers: AnalyticsData['tierDistribution']) {
    const barHeight = 15
    const maxWidth = this.pageWidth - 2 * this.margin - 60
    const maxValue = Math.max(...tiers.map(t => t.value))
    
    tiers.forEach((tier, index) => {
      this.checkPageBreak(barHeight + 5)
      
      const yPos = this.currentY + index * (barHeight + 5)
      const barWidth = (tier.value / maxValue) * maxWidth
      
      // Tier name
      this.doc.setFontSize(10)
      this.doc.setTextColor(0, 0, 0)
      this.doc.text(tier.name, this.margin, yPos + barHeight / 2)
      
      // Bar
      const colors: Record<string, [number, number, number]> = {
        'Hero': [251, 191, 36],
        'Legend': [167, 139, 250],
        'Star': [96, 165, 250],
        'Rising': [134, 239, 172],
        'Micro': [156, 163, 175]
      }
      
      this.doc.setFillColor(...(colors[tier.name] || [156, 163, 175]))
      this.doc.rect(this.margin + 50, yPos, barWidth, barHeight, 'F')
      
      // Value
      this.doc.text(
        `${tier.value} KOLs (${tier.views.toLocaleString()} views)`,
        this.margin + 55 + barWidth,
        yPos + barHeight / 2
      )
    })
    
    this.currentY += tiers.length * (barHeight + 5) + 10
  }
  
  private addTopPerformers(performers: AnalyticsData['topPerformers']) {
    const headers = ['Rank', 'KOL', 'Tier', 'Views', 'Engagement', 'Score']
    const colWidths = [15, 50, 25, 30, 30, 20]
    
    this.checkPageBreak(performers.length * 10 + 20)
    
    // Headers
    let xPos = this.margin
    this.doc.setFontSize(10)
    this.doc.setTextColor(100, 100, 100)
    headers.forEach((header, index) => {
      this.doc.text(header, xPos, this.currentY)
      xPos += colWidths[index]
    })
    
    this.currentY += 5
    this.doc.setDrawColor(200, 200, 200)
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY)
    this.currentY += 5
    
    // Data rows
    performers.slice(0, 10).forEach((performer, index) => {
      xPos = this.margin
      this.doc.setFontSize(9)
      this.doc.setTextColor(0, 0, 0)
      
      const rowData = [
        `#${index + 1}`,
        performer.name,
        performer.tier,
        this.formatNumber(performer.views),
        this.formatNumber(performer.engagement),
        performer.score.toFixed(0)
      ]
      
      rowData.forEach((data, colIndex) => {
        this.doc.text(data, xPos, this.currentY)
        xPos += colWidths[colIndex]
      })
      
      this.currentY += 7
    })
  }
  
  private addBudgetAnalysis(data: AnalyticsData) {
    const budgetByTier = data.tierDistribution.map(tier => ({
      name: tier.name,
      budget: tier.budget,
      percentage: (tier.budget / data.totalBudget) * 100
    }))
    
    // Pie chart simulation with text
    budgetByTier.forEach(tier => {
      this.checkPageBreak(10)
      this.addText(
        `${tier.name}: $${tier.budget.toLocaleString()} (${tier.percentage.toFixed(1)}%)`,
        12
      )
      this.currentY += 3
    })
  }
  
  private addKOLTable(kols: CampaignKOL[]) {
    const headers = ['Name', 'Handle', 'Tier', 'Platform', 'Stage', 'Budget']
    const colWidths = [40, 30, 20, 25, 30, 25]
    
    // Headers
    let xPos = this.margin
    this.doc.setFontSize(10)
    this.doc.setTextColor(255, 255, 255)
    this.doc.setFillColor(34, 197, 94)
    this.doc.rect(this.margin, this.currentY - 5, this.pageWidth - 2 * this.margin, 10, 'F')
    
    headers.forEach((header, index) => {
      this.doc.text(header, xPos, this.currentY)
      xPos += colWidths[index]
    })
    
    this.currentY += 10
    
    // Data rows
    kols.forEach((kol, index) => {
      this.checkPageBreak(10)
      
      // Alternate row colors
      if (index % 2 === 0) {
        this.doc.setFillColor(245, 245, 245)
        this.doc.rect(this.margin, this.currentY - 5, this.pageWidth - 2 * this.margin, 8, 'F')
      }
      
      xPos = this.margin
      this.doc.setFontSize(9)
      this.doc.setTextColor(0, 0, 0)
      
      const rowData = [
        kol.kolName || '-',
        `@${kol.kolHandle}`,
        kol.tier,
        kol.platform,
        kol.stage.replace(/_/g, ' '),
        `$${kol.budget.toLocaleString()}`
      ]
      
      rowData.forEach((data, colIndex) => {
        // Truncate long text
        const maxWidth = colWidths[colIndex] - 2
        const text = this.doc.splitTextToSize(data, maxWidth)[0]
        this.doc.text(text, xPos, this.currentY)
        xPos += colWidths[colIndex]
      })
      
      this.currentY += 8
    })
  }
  
  private checkPageBreak(requiredSpace: number) {
    if (this.currentY + requiredSpace > this.pageHeight - this.margin) {
      this.addPageBreak()
    }
  }
  
  private addPageBreak() {
    this.doc.addPage()
    this.currentY = this.margin
  }
  
  private addFooterToAllPages() {
    const pageCount = this.doc.internal.pages.length - 1 // Exclude empty page
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i)
      this.doc.setFontSize(8)
      this.doc.setTextColor(150, 150, 150)
      
      // Page number
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth / 2,
        this.pageHeight - 10,
        { align: 'center' }
      )
      
      // Footer text
      this.doc.text(
        'KOL Platform - Confidential',
        this.margin,
        this.pageHeight - 10
      )
      
      this.doc.text(
        new Date().toISOString().split('T')[0],
        this.pageWidth - this.margin,
        this.pageHeight - 10,
        { align: 'right' }
      )
    }
  }
  
  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toLocaleString()
  }
  
  // Static helper to download PDF
  static download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
} 