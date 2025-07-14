'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

const kpiData = {
  detailedMetrics: [
    {
      title: "Detailed KPI Metrics",
      items: [
        "New Member Growth: Number of new members joining per month.",
        "User Activity Metrics: Daily active users (DAU), Weekly active users (WAU).",
        "Number of Messages per User: Average messages sent per active user.",
        "Onboarding Completion Rate: Percentage of new members participating in engagement tools or community activities (AMAs, artist spotlights, community events).",
        "User-Generated Content (UGC) Metric: Volume of content created and shared by community members.",
        "Sentiment Tracker: Leveraging the Nabulines analytics bot to assess community sentiment through various filtering options.",
        "KOL Onboarding: Quantity and activation levels of Key Opinion Leaders (KOLs) onboarded and actively engaged."
      ]
    },
    {
      title: "Monthly KPIs",
      items: [
        "User Growth: ≥10%",
        "Daily Active Users/Weekly Active Users (DAU/WAU): ≥45%",
        "Sentiment Score: ≥70% positive",
        "Messages per Active User: ≥5 messages/day",
        "UGC Creation Rate: ≥20% of active users",
        "Event Participation: ≥30% of members",
        "KOL Activation: ≥80% of onboarded KOLs active"
      ]
    },
    {
      title: "Quarterly KPIs",
      items: [
        "Total Community Size: 25% growth per quarter",
        "Retention Rate: ≥70% of members active within 30 days",
        "Ambassador Program Growth: 50% increase in ambassadors",
        "Cross-Platform Conversion: ≥40% Twitter to Discord",
        "Community-Generated Events: ≥5 per quarter",
        "Partnership Integrations: ≥3 new partnerships",
        "Revenue from Premium Features: 100% QoQ growth"
      ]
    },
    {
      title: "6-Month KPIs",
      items: [
        "Community Size: Reach 5,000+ active members",
        "Brand Advocacy Score: ≥80% members as active advocates",
        "Content Library: 500+ community-generated resources",
        "Global Reach: Active members from 50+ countries",
        "Enterprise Partnerships: 10+ strategic partnerships",
        "Platform Innovation: 3+ unique Discord features launched",
        "Thought Leadership: Top 10 Web3 Discord community ranking"
      ]
    }
  ],
  baselineMetrics: {
    title: "Baseline Metrics & Notes",
    baseline: [
      "Starting Point (July 2025): 50 members, 10 daily active users",
      "Initial Engagement Rate: 20% (messages per member)",
      "Pre-launch Sentiment: 60% positive based on Twitter analysis",
      "Existing KOL Network: 5 committed ambassadors"
    ],
    notes: [
      "All growth percentages are calculated month-over-month unless specified",
      "Sentiment tracking requires minimum 100 messages per analysis period",
      "KOL activation defined as: posting 3+ times per week in Discord",
      "Revenue metrics begin tracking from November 2025 (premium launch)",
      "Quarterly reviews will adjust targets based on market conditions"
    ]
  }
}

const discordRoadmap = {
  overallGoal: "Discord for Ledger will serve as the deep engagement and advocacy hub within the broader messaging infrastructure. It's where the brand development team's content and thought leadership find their most passionate audience, transforming crypto-curious individuals into secure self-custody advocates and then into active Ledger evangelists.",
  strategicRole: {
    title: "The Discord Funnel, Step-by-Step"
  },
  funnelSteps: [
    {
      title: "Awareness & Attraction (Getting Them In)",
      bullet: "Drive crypto enthusiasts and Ledger followers into Discord",
      goal: "Drive new crypto enthusiasts (especially software wallet users and the crypto-curious) and existing Ledger followers into the Discord community.",
      role: "Be the advertised destination for conversation, direct access, and genuine community around crypto security and Ledger."
    },
    {
      title: "Engagement & Education (Deepening Their Understanding)",
      bullet: "Educate on self-custody and foster active participation",
      goal: "Educate members on self-custody best practices, Ledger products, and broader crypto security, while fostering active participation and a sense of belonging.",
      role: "Provide a dynamic environment for learning, discussion, Q&A with experts, and peer-to-peer support. (we need good access to links and articles for different topics)"
    },
    {
      title: "Advocacy & Evangelism (Turning Fans into Force Multipliers)",
      bullet: "Activate loyal members as Ledger evangelists",
      goal: "Activation for loyal members to become active evangelists for Ledger, sharing positive sentiment and knowledge across their own networks and bringing engage with ledger posts",
      role: "Using the right tools (engage tool) to reward active members and supporters"
    }
  ],
  monthlyPlans: [
    {
      month: "July 2025",
      highlight: "Foundation: Establish core Discord infrastructure and initial ambassador program",
      theme: "Foundation Building",
      actions: [
        "Launch #discord-engagement channel with automated tracking",
        "Set up Discord role hierarchy and permission system",
        "Begin recruiting initial 10 Discord ambassadors",
        "Create Discord onboarding flow and welcome system",
        "Establish weekly Discord voice chat schedule"
      ],
      metrics: ["100+ active Discord members", "10 active ambassadors", "50+ daily messages"]
    },
    {
      month: "August 2025",
      highlight: "Growth: Scale ambassador program and launch community events",
      theme: "Community Expansion",
      actions: [
        "Expand ambassador program to 25 members",
        "Launch bi-weekly AMA sessions with project founders",
        "Implement Discord-exclusive NFT giveaways",
        "Create ambassador training materials and certification",
        "Begin cross-promotion between Twitter and Discord"
      ],
      metrics: ["500+ Discord members", "25 ambassadors", "200+ daily messages", "2 major events"]
    },
    {
      month: "September 2025",
      highlight: "Integration: Deep Twitter-Discord funnel integration",
      theme: "Platform Synergy",
      actions: [
        "Launch automated Twitter→Discord referral tracking",
        "Create Discord-exclusive alpha channels for top contributors",
        "Implement Discord stage events for major announcements",
        "Begin Discord bot development for engagement tracking",
        "Launch ambassador-led community initiatives"
      ],
      metrics: ["1000+ members", "50 ambassadors", "500+ daily messages", "90% Twitter→Discord conversion"]
    },
    {
      month: "October 2025",
      highlight: "Innovation: Launch unique Discord-native features",
      theme: "Feature Innovation",
      actions: [
        "Release custom Nabulines Discord bot with AI features",
        "Launch Discord prediction markets for project launches",
        "Create Discord-exclusive mini-games with NFT rewards",
        "Implement voice chat rewards system",
        "Begin Discord partnership program with other communities"
      ],
      metrics: ["2500+ members", "100 ambassadors", "1000+ daily messages", "5 partner communities"]
    },
    {
      month: "November 2025",
      highlight: "Excellence: Achieve Discord thought leadership status",
      theme: "Market Leadership",
      actions: [
        "Host major Web3 Discord summit with 20+ projects",
        "Launch Discord ambassador certification program",
        "Create Discord playbook for Web3 communities",
        "Implement advanced analytics dashboard",
        "Begin monetization through premium Discord features"
      ],
      metrics: ["5000+ members", "200 ambassadors", "2000+ daily messages", "$10K revenue"]
    },
    {
      month: "December 2025",
      highlight: "Dominance: Establish as premier Web3 Discord community",
      theme: "Platform Dominance",
      actions: [
        "Achieve top 10 Web3 Discord community status",
        "Launch Discord-based incubator program",
        "Create cross-chain Discord integration tools",
        "Host year-end mega event with 50+ partners",
        "Plan 2026 expansion into Discord gaming and metaverse"
      ],
      metrics: ["10K+ members", "500 ambassadors", "5000+ daily messages", "Top 10 ranking"]
    }
  ]
}

export default function DiscordRoadmapPage() {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null)
  const [expandedStep, setExpandedStep] = useState<number | null>(null)
  const [expandedKpi, setExpandedKpi] = useState<number | null>(null)
  const [expandedBaseline, setExpandedBaseline] = useState(false)
  const [expandedTools, setExpandedTools] = useState(false)
  const [visibleMonths, setVisibleMonths] = useState<number[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Ensure all months are visible initially
    setVisibleMonths(discordRoadmap.monthlyPlans.map((_, i) => i))
    setIsLoaded(true)
    
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      
      if (scrollHeight > 0) {
        const progress = Math.min(scrollTop / scrollHeight, 1)
        setScrollProgress(progress)
      }
    }

    // Initial calculation
    handleScroll()
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleMonthClick = (index: number) => {
    setExpandedMonth(expandedMonth === index ? null : index)
  }

  const handleStepClick = (index: number) => {
    setExpandedStep(expandedStep === index ? null : index)
  }

  const handleKpiClick = (index: number) => {
    setExpandedKpi(expandedKpi === index ? null : index)
  }

  // Generate path for swirling road
  const generateRoadPath = () => {
    const height = 300 * discordRoadmap.monthlyPlans.length
    const width = 100
    const amplitude = 45
    const frequency = 0.012
    
    let path = `M ${width/2} 0`
    for (let y = 0; y <= height; y += 5) {
      const x = width/2 + Math.sin(y * frequency) * amplitude
      path += ` L ${x} ${y}`
    }
    return path
  }

  // Generate branching paths at the end
  const generateBranchPaths = () => {
    const startY = 300 * discordRoadmap.monthlyPlans.length
    const startX = 400 // Center of the 800px wide SVG
    const branchLength = 150
    const boxSpacing = 250 // Distance between box centers
    
    return {
      left: `M ${startX} ${startY} Q ${startX - 50} ${startY + 75} ${startX - boxSpacing} ${startY + branchLength}`,
      middle: `M ${startX} ${startY} L ${startX} ${startY + branchLength}`,
      right: `M ${startX} ${startY} Q ${startX + 50} ${startY + 75} ${startX + boxSpacing} ${startY + branchLength}`
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900/10 to-gray-900">
      {/* Header Section - Reduced visual weight */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="sticky top-0 z-50 backdrop-blur-sm bg-gray-900/50 border-b border-green-500/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl md:text-3xl font-extralight text-green-400/90">
            Discord Platform Roadmap
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1 font-light">
            July - December 2025: Building the Premier Web3 Discord Community
          </p>
        </div>
      </motion.div>

      {/* Main Content with increased spacing */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overall Goal Card - Centered and moved up */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-20 max-w-3xl mx-auto text-center"
        >
          <div className="backdrop-blur-sm bg-white/[0.03] rounded-xl p-6 border border-green-500/10 shadow-sm">
            <h2 className="text-xl md:text-2xl font-extralight text-green-400/80 mb-3">
              Overall Goal
            </h2>
            <p className="text-gray-400 text-base font-light leading-relaxed">
              {discordRoadmap.overallGoal}
            </p>
          </div>
        </motion.div>

        {/* KPI Section - New addition */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-24 max-w-5xl mx-auto"
        >
          <div className="text-center mb-10">
            <h2 className="text-xl md:text-2xl font-extralight text-green-400/80 mb-4">
              KPIs Strategic Measurement
            </h2>
          </div>
          
          {/* KPI Categories */}
          <div className="space-y-4 max-w-3xl mx-auto mb-6">
            {kpiData.detailedMetrics.map((category, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                className="backdrop-blur-sm bg-white/[0.02] rounded-lg border border-green-500/[0.05] shadow-sm overflow-hidden"
              >
                <motion.div
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                  className="p-4 cursor-pointer transition-colors"
                  onClick={() => handleKpiClick(index)}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-300">
                      {category.title}
                    </h3>
                    <motion.div
                      animate={{ rotate: expandedKpi === index ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-gray-400 text-sm"
                    >
                      ▼
                    </motion.div>
                  </div>
                </motion.div>
                
                <AnimatePresence>
                  {expandedKpi === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-2 border-t border-green-500/[0.05]">
                        <ul className="space-y-2">
                          {category.items.map((item, itemIndex) => (
                            <motion.li
                              key={itemIndex}
                              initial={{ x: -20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: itemIndex * 0.05 }}
                              className="text-xs text-gray-400 flex items-start"
                            >
                              <span className="text-green-500/50 mr-2">•</span>
                              <span className="font-light">{item}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
            
            {/* Baseline Metrics & Notes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="backdrop-blur-sm bg-white/[0.02] rounded-lg border border-green-500/[0.05] shadow-sm overflow-hidden"
            >
              <motion.div
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                className="p-4 cursor-pointer transition-colors"
                onClick={() => setExpandedBaseline(!expandedBaseline)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-300">
                    {kpiData.baselineMetrics.title}
                  </h3>
                  <motion.div
                    animate={{ rotate: expandedBaseline ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-gray-400 text-sm"
                  >
                    ▼
                  </motion.div>
                </div>
              </motion.div>
              
              <AnimatePresence>
                {expandedBaseline && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-2 border-t border-green-500/[0.05]">
                      <div className="mb-4">
                        <h4 className="text-xs font-medium text-green-400/60 mb-2">Baseline:</h4>
                        <ul className="space-y-1">
                          {kpiData.baselineMetrics.baseline.map((item, index) => (
                            <motion.li
                              key={index}
                              initial={{ x: -20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: index * 0.05 }}
                              className="text-xs text-gray-400 flex items-start"
                            >
                              <span className="text-green-500/50 mr-2">•</span>
                              <span className="font-light">{item}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-green-400/60 mb-2">Important Notes:</h4>
                        <ul className="space-y-1">
                          {kpiData.baselineMetrics.notes.map((note, index) => (
                            <motion.li
                              key={index}
                              initial={{ x: -20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: 0.2 + index * 0.05 }}
                              className="text-xs text-gray-400 flex items-start"
                            >
                              <span className="text-green-500/50 mr-2">•</span>
                              <span className="font-light">{note}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>

        {/* Strategic Role Section - Centered with compact grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-24 max-w-5xl mx-auto"
        >
          <div className="text-center mb-10">
            <h2 className="text-xl md:text-2xl font-extralight text-green-400/80 mb-4">
              {discordRoadmap.strategicRole.title}
            </h2>
          </div>
          
          {/* Expandable funnel steps */}
          <div className="space-y-4 max-w-3xl mx-auto">
            {discordRoadmap.funnelSteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                className="backdrop-blur-sm bg-white/[0.02] rounded-lg border border-green-500/[0.05] shadow-sm overflow-hidden"
              >
                <motion.div
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                  className="p-4 cursor-pointer transition-colors"
                  onClick={() => handleStepClick(index)}
                >
                  <div className="flex items-start">
                    <span className="text-gray-400 font-light mr-3">{index + 1}.</span>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-300 mb-1">
                        {step.title}
                      </h3>
                      <p className="text-xs text-gray-500 italic">
                        • {step.bullet}
                      </p>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedStep === index ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-gray-400 text-sm ml-2"
                    >
                      ▼
                    </motion.div>
                  </div>
                </motion.div>
                
                <AnimatePresence>
                  {expandedStep === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-2 border-t border-green-500/[0.05]">
                        <div className="pl-6">
                          <p className="text-xs text-gray-400 mb-2">
                            <span className="font-medium text-green-400/60">Goal:</span> {step.goal}
                          </p>
                          <p className="text-xs text-gray-400">
                            <span className="font-medium text-green-400/60">Discord's Role:</span> {step.role}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Swirling Road Timeline with increased spacing */}
        <div className="relative mb-24">
          <h2 className="text-xl md:text-2xl font-extralight text-green-400/80 mb-16 text-center">
            Monthly Journey
          </h2>
          
          <div className="relative flex justify-center">
            {/* Animated Swirling Road SVG */}
            {isLoaded && (
              <svg 
                width="800" 
                height={`${300 * discordRoadmap.monthlyPlans.length + 400}`} 
                className="absolute"
                style={{ left: '50%', transform: 'translateX(-50%)' }}
                viewBox={`0 0 800 ${300 * discordRoadmap.monthlyPlans.length + 400}`}
              >
                <defs>
                  <linearGradient id="roadGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.05" />
                    <stop offset={`${scrollProgress * 100}%`} stopColor="#10b981" stopOpacity="0.4" />
                    <stop offset={`${scrollProgress * 100}%`} stopColor="#10b981" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                
                {/* Main road path - adjusted to center */}
                <motion.path
                  d={(() => {
                    const height = 300 * discordRoadmap.monthlyPlans.length
                    const centerX = 400 // Center of 800px width
                    const amplitude = 45
                    const frequency = 0.012
                    
                    let path = `M ${centerX} 0`
                    for (let y = 0; y <= height; y += 5) {
                      const x = centerX + Math.sin(y * frequency) * amplitude
                      path += ` L ${x} ${y}`
                    }
                    return path
                  })()}
                  fill="none"
                  stroke="url(#roadGradient)"
                  strokeWidth="3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: scrollProgress }}
                  transition={{ duration: 0.3 }}
                />
                
                {/* Branching paths */}
                {scrollProgress > 0.8 && (
                  <>
                    <motion.path
                      d={generateBranchPaths().left}
                      fill="none"
                      stroke="#10b981"
                      strokeOpacity="0.3"
                      strokeWidth="2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    />
                    <motion.path
                      d={generateBranchPaths().middle}
                      fill="none"
                      stroke="#10b981"
                      strokeOpacity="0.3"
                      strokeWidth="2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    />
                    <motion.path
                      d={generateBranchPaths().right}
                      fill="none"
                      stroke="#10b981"
                      strokeOpacity="0.3"
                      strokeWidth="2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                    />
                  </>
                )}
              </svg>
            )}

            {/* Monthly Milestones with increased spacing */}
            <div className="relative z-10 space-y-48">
              {discordRoadmap.monthlyPlans.map((plan, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8, x: index % 2 === 0 ? -50 : 50 }}
                  animate={{ 
                    opacity: isLoaded ? 1 : 0, 
                    scale: isLoaded ? 1 : 0.8, 
                    x: 0 
                  }}
                  transition={{ 
                    duration: 0.6,
                    delay: 0.1 + index * 0.15,
                    type: "spring",
                    stiffness: 100
                  }}
                  className={`relative ${index % 2 === 0 ? 'mr-auto pr-20' : 'ml-auto pl-20'} max-w-md`}
                >
                  {/* Milestone Marker - Softer appearance */}
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="absolute top-8 left-1/2 transform -translate-x-1/2 w-5 h-5 bg-green-500/70 rounded-full ring-4 ring-green-500/10 cursor-pointer"
                    onClick={() => handleMonthClick(index)}
                  />
                  
                  {/* Month Card - Softer styling */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="backdrop-blur-sm bg-white/[0.03] rounded-lg p-5 border border-green-500/10 cursor-pointer shadow-sm"
                    onClick={() => handleMonthClick(index)}
                  >
                    <h3 className="text-lg font-light text-green-400/90 mb-2">
                      {plan.month}
                    </h3>
                    <p className="text-gray-400 font-light text-xs mb-2">
                      {plan.theme}
                    </p>
                    <p className="text-gray-500 text-xs italic">
                      • {plan.highlight}
                    </p>
                    
                    {/* Expandable Content */}
                    <AnimatePresence>
                      {expandedMonth === index && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-5 pt-5 border-t border-green-500/[0.05]">
                            <h4 className="text-xs font-medium text-green-400/70 mb-3">
                              Action Items:
                            </h4>
                            <ul className="space-y-2 mb-4">
                              {plan.actions.map((action, actionIndex) => (
                                <motion.li
                                  key={actionIndex}
                                  initial={{ x: -20, opacity: 0 }}
                                  animate={{ x: 0, opacity: 1 }}
                                  transition={{ delay: actionIndex * 0.05 }}
                                  className="text-xs text-gray-400 flex items-start"
                                >
                                  <span className="text-green-500/50 mr-2">•</span>
                                  <span className="font-light">{action}</span>
                                </motion.li>
                              ))}
                            </ul>
                            
                            <h4 className="text-xs font-medium text-green-400/70 mb-2">
                              Success Metrics:
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {plan.metrics.map((metric, metricIndex) => (
                                <motion.span
                                  key={metricIndex}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: 0.3 + metricIndex * 0.05 }}
                                  className="text-[10px] bg-green-500/[0.05] text-green-400/70 px-2 py-1 rounded-full"
                                >
                                  {metric}
                                </motion.span>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>
          
          {/* Branching End Section */}
          {isLoaded && scrollProgress > 0.7 && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="relative mt-32 flex justify-center"
            >
              <div className="relative w-full max-w-4xl">
                {/* Three End Boxes */}
                <div className="flex justify-between items-start">
                  {/* Mod Rules Box */}
                  <Link href="/mod_rules" className="block">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="backdrop-blur-sm bg-white/[0.03] rounded-lg p-6 border border-green-500/20 cursor-pointer shadow-sm w-48"
                    >
                      <div className="w-3 h-3 bg-green-500/50 rounded-full mx-auto mb-3" />
                      <h3 className="text-sm font-medium text-green-400/80 mb-2">
                        Mod Rules
                      </h3>
                      <p className="text-xs text-gray-400">
                        Community guidelines and moderation policies
                      </p>
                    </motion.div>
                  </Link>
                  
                  {/* Tools Needed Box (Expandable) */}
                  <motion.div
                    className="relative"
                  >
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="backdrop-blur-sm bg-white/[0.03] rounded-lg p-6 border border-green-500/20 cursor-pointer shadow-sm w-48"
                      onClick={() => setExpandedTools(!expandedTools)}
                    >
                      <div className="w-3 h-3 bg-green-500/50 rounded-full mx-auto mb-3" />
                      <h3 className="text-sm font-medium text-green-400/80 mb-2 flex items-center justify-between">
                        Tools Needed
                        <motion.span
                          animate={{ rotate: expandedTools ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                          className="text-xs"
                        >
                          ▼
                        </motion.span>
                      </h3>
                      <p className="text-xs text-gray-400">
                        Essential tools for community management
                      </p>
                    </motion.div>
                    
                    {/* Expanded Tools Sub-boxes */}
                    <AnimatePresence>
                      {expandedTools && (
                        <motion.div
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                          className="absolute left-1/2 transform -translate-x-1/2 mt-4 flex gap-4 z-10"
                        >
                                                <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        whileHover={{ scale: 1.05 }}
                        transition={{ delay: 0.1 }}
                        className="backdrop-blur-sm bg-white/[0.03] rounded-lg p-4 border border-green-500/10 shadow-sm cursor-pointer"
                        onClick={() => alert('Analytics Tool - Coming Soon')}
                      >
                        <h4 className="text-xs font-medium text-green-400/70 mb-1">
                          Analytics Tool
                        </h4>
                        <p className="text-[10px] text-gray-500">
                          Track engagement and growth metrics
                        </p>
                      </motion.div>
                          
                                                <Link href="/engage_tool">
                        <motion.div
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          whileHover={{ scale: 1.05 }}
                          transition={{ delay: 0.2 }}
                          className="backdrop-blur-sm bg-white/[0.03] rounded-lg p-4 border border-green-500/10 shadow-sm cursor-pointer"
                        >
                          <h4 className="text-xs font-medium text-green-400/70 mb-1">
                            Engagement Tool
                          </h4>
                          <p className="text-[10px] text-gray-500">
                            Reward and incentivize participation
                          </p>
                        </motion.div>
                      </Link>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                  
                  {/* Team Tree Box */}
                  <Link href="/tree" className="block">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="backdrop-blur-sm bg-white/[0.03] rounded-lg p-6 border border-green-500/20 cursor-pointer shadow-sm w-48"
                    >
                      <div className="w-3 h-3 bg-green-500/50 rounded-full mx-auto mb-3" />
                      <h3 className="text-sm font-medium text-green-400/80 mb-2">
                        Team Tree
                      </h3>
                      <p className="text-xs text-gray-400">
                        Organization structure and hierarchy
                      </p>
                    </motion.div>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
} 