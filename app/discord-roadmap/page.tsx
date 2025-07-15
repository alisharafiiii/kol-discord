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
        "Messages per Active User: ≥30 messages",
        "UGC Creation Rate: ≥ +50 monthly",
        "Event Participation: ≥30% of members",
        "KOL Activation: ≥80% of onboarded KOLs active"
      ]
    },
    {
      title: "Quarterly KPIs",
      items: [
        "Total Community Size: 200% growth per quarter",
        "Retention Rate: ≥50% of members active within 30 days",
        "Ambassador Program Growth: reaching 35 ambassadors",
        "Community-Generated Events: ≥6 per quarter",
        "Partnership: ≥2 new partnerships"
      ]
    },
    {
      title: "6-Month KPIs",
      items: [
        "Community Size: Reach 500% active members",
        "Brand Advocacy Score: ≥60% of engage members as active advocates",
        "Content Library: 500+ ugc content",
        "Global Reach: Active members from 40+ countries",
        "Partnerships: 5+ strategic partnerships",
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
      highlight: "Foundation & Funnel Kick-off",
      theme: "Foundation Building",
      topics: [
        "Exclusive Series Launch",
        "AMA Teasers",
        "Interactive Polls",
        "Meme Channel Launch",
        "Artist Spotlight Event",
        "Ambassador Program Phase 1",
        "Cross-Promotion Strategy"
      ],
      strategyFocus: "Solidify onboarding, introduce initial exclusive content streams, and drive foundational member growth. Define and launch the \"Discord Funnel\" internally for the team.",
      actions: [
        {
          category: "Content",
          items: [
            "Exclusive Series Launch: Content TBD - Ex. \"Ledger Security Deep Dive\" – short, digestible threads/videos covering fundamental opsec, common crypto scams, and how Ledger protects against them (using Don't get rekt as the main content). Release one per week/bi-weekly.",
            "AMA Teasers: Begin teasing upcoming AMA sessions with Ledger experts on key security topics or upcoming activities and initiatives",
            "Interactive Polls: Start polls on community interests (e.g., \"What crypto security topic interests you most?\").",
            "Meme Channel Launch: Double down on meme channel, boosting and setting clear guidelines for \"tasteful\" and brand-aligned content. And rewarding mechanism with points (engage tool)"
          ]
        },
        {
          category: "Events (Digital)",
          items: [
            "Artist Spotlight: Bringing more exposure to Gaspard curations for artist spotlight as one of the most engaged thought leadership activities",
            "Kick-off AMA: Host the first \"Ask Me Anything\" once a month with a Ledger expert to establish thought leadership."
          ]
        },
        {
          category: "Ambassador Program",
          items: [
            "Phase 1 - Identification: Start identifying highly engaged, positive members who consistently help others and embody brand values. Note them internally."
          ]
        },
        {
          category: "Cross-Promotion",
          items: [
            "From Discord to Other Channels: Promote upcoming Ledger content on YouTube/Twitter/IG within Discord, encouraging members to like, share, and comment. \"Our latest deep dive on DeFi security just dropped on YouTube! Watch it here and share your thoughts in #general chat\"",
            "From Other Channels to Discord: Post clear, concise calls to action (CTAs) on Twitter/IG/YouTube/TikTok promoting Discord as the place for \"Exclusive Security Insights,\" \"Direct Q&A with Experts,\" and \"The Safest Crypto Community.\" Use enticing visuals and direct links."
          ]
        }
      ],
      metrics: ["100+ active Discord members", "10 active ambassadors", "50+ daily messages"]
    },
    {
      month: "August 2025",
      highlight: "Deepening Engagement & Ambassador Nurturing",
      theme: "Community Expansion",
      topics: [
        "Poker Tournament Activations",
        "Shooter Game Collaborations",
        "Thought Leadership Q&A Prep",
        "Decentralized Discussions",
        "Product Deep Dive Webinar",
        "Ambassador Program Phase 2",
        "Tailored Cross-Promotion"
      ],
      strategyFocus: "Build on initial engagement with adding more members to the engage tool, continue exclusive content, and formally prepare for the Ambassador Program launch.",
      actions: [
        {
          category: "Community Activities",
          items: [
            "Poker Tournament Activations: Utilize PPPoker platform for friendly, free poker tournaments. Announce dates exclusively in Discord initially. Establish modest prize pool of 1-3 Ledger devices. Auto-assign poker role to Community Pass holders who opt-in. Winners open dedicated ticket for prize distribution handled by Discord moderation team.",
            "Shooter Game Collaborations: Initially consider popular games like Fortnite. Partner with Web3 gaming communities, specifically BR1INFINITE. Coordinate joint announcements and secure prize pools. Encourage participants to share gameplay clips and leaderboard rankings across social media.",
            "Thought Leadership Q&A Prep: Solicit questions from the community for upcoming expert Q&As."
          ]
        },
        {
          category: "Events (Digital)",
          items: [
            "\"Decentralized Discussions\": Themed live voice chats led by mods on current crypto trends and security implications.",
            "Product Deep Dive Webinar: Digital event focusing on advanced features or upcoming Ledger product with Q&A session. Planning one in August for Ledger Recovery Key or Ledger Recover. Needs syncing with Ledger representative and setting time. Will be held in Ledger Discord event channel and announced across all socials for exposure."
          ]
        },
        {
          category: "Ambassador Program",
          items: [
            "Phase 2 - Outreach & Onboarding: Privately reach out to identified potential ambassadors, explain the program, and gauge interest. Begin formal onboarding for those who accept, providing initial guidelines and resources."
          ]
        },
        {
          category: "Cross-Promotion",
          items: [
            "Tailored CTAs: On other channels, highlight specific Discord benefits like \"Get your crypto questions answered directly by power users\" or \"Join our exclusive community activities & games\"",
            "Discord-Specific Content Teasers: Post snippets of Discord-exclusive content on other platforms with a CTA to join Discord for the full experience."
          ]
        }
      ],
      metrics: ["500+ Discord members", "25 ambassadors", "200+ daily messages", "2 major events"]
    },
    {
      month: "September 2025",
      highlight: "Ambassador Program Launch & Amplification",
      theme: "Platform Synergy",
      topics: [
        "Engage Tool Exposure Campaign",
        "Ambassador Spotlights",
        "Community Showcase",
        "Exclusive Discord Offers",
        "Product Deep Dive Webinar",
        "IRL Event Coverage",
        "Ambassador Program Official Launch",
        "First Prize Pool Payout"
      ],
      strategyFocus: "Officially launch the Ambassador Program, empowering evangelists to amplify brand messaging. Drive increased UGC and community-led support.",
      actions: [
        {
          category: "Content & Engagement",
          items: [
            "Engage Tool Exposure: Share more pictures of the engage tool, leaderboard, points chart to bring more exposure and FOMO and onboard more members",
            "Ambassador Spotlights: Introduce new ambassadors, highlighting their contributions and passion for Ledger.",
            "\"Community Showcase\": Feature best user-generated memes, helpful tips, or positive stories shared by community members (with their permission).",
            "Exclusive Offers: Share exclusive Discord-only offers or early access to promotions/sales."
          ]
        },
        {
          category: "Events (Digital)",
          items: [
            "Product Deep Dive Webinar: Continue monthly series focusing on Ledger products and features",
            "IRL Event Pre-Brief/Post-Mortem: Coverage and discussion of real-world Ledger events"
          ]
        },
        {
          category: "Ambassador Program",
          items: [
            "Phase 3 - Official Launch & Support: Announce the program publicly (outside Discord), establish dedicated ambassador channels for communication with mods/lead, and begin regular check-ins.",
            "Training & Resources: Provide ambassadors with FAQs, talking points on common FUD, and a direct line to the mod team for sensitive issues.",
            "Best Practices for Interactions: Foster regular, informal check-ins between mods/lead and ambassadors in a dedicated channel. Encourage ambassadors to act as a first line of support and feedback, escalating complex issues to mods."
          ]
        },
        {
          category: "First Prize Pool Payout",
          items: [
            "Prize Pool Distribution: Determine how to distribute the remaining 9k budget for Discord to setup the most lucrative prize pool for users to be feasible to grind for 3 months.",
            "Budget Allocation: The whole idea is we have 9k total budget for 3 months, with some activities that require payment (poker tournaments, trivia, FPS games). The rest should be calculated and set aside for main prize pool for evangelists ranked in the leaderboard based on their engagement and support of Ledger tweets.",
            "Winner Celebration: Host an AMA event to congratulate winners and activate more users to join. Post content about winners and prizes from our channels to bring in more users."
          ]
        },
        {
          category: "Cross-Promotion",
          items: [
            "Evangelist Features: Use quotes or screenshots of positive Discord evangelist interactions on Twitter/IG with a CTA to \"Join the conversation.\"",
            "Content Collaboration: If possible, encourage ambassadors to create content for other platforms and offer to share/amplify it."
          ]
        }
      ],
      metrics: ["1000+ members", "50 ambassadors", "500+ daily messages", "90% Twitter→Discord conversion"]
    },
    {
      month: "October 2025",
      highlight: "Content Diversification & Feedback Loop",
      theme: "Feature Innovation",
      topics: [
        "Product Pro Tips Series",
        "Crypto News & Views",
        "What's Your Setup? Campaign",
        "Ledger Labs Sessions",
        "Guest Speaker Series",
        "Ambassador Feedback Channel",
        "Recognition & Rewards",
        "Direct Ask Us Anything"
      ],
      strategyFocus: "Broaden content types, deepen community-driven initiatives, and establish clear feedback loops from the evangelist community to Ledger.",
      actions: [
        {
          category: "Content",
          items: [
            "\"Product Pro Tips\": Short videos/graphics demonstrating advanced Ledger device usage, security settings, or new feature walkthroughs.",
            "\"Crypto News & Views\": Daily/weekly curated crypto news relevant to security and self-custody, with prompts for discussion.",
            "\"What's Your Setup?\" (UGC Campaign): Encourage members to share their Ledger setups (tastefully) for community interaction."
          ]
        },
        {
          category: "Events (Digital)",
          items: [
            "\"Ledger Labs\": A session for power users to test beta features or provide direct feedback on upcoming product changes.",
            "Guest Speaker Series: Invite a prominent figure from the broader crypto security space for a discussion/AMA."
          ]
        },
        {
          category: "Ambassador Program",
          items: [
            "Feedback Channel: Establish a formal way for ambassadors to relay community sentiment, pain points, and product suggestions directly to the internal Ledger team.",
            "Recognition & Rewards: Implement systematic recognition and reward mechanisms for top-performing ambassadors."
          ]
        },
        {
          category: "Cross-Promotion",
          items: [
            "Direct \"Ask Us Anything\": Host a brief \"Ask Us Anything about Ledger\" on Twitter, directing more complex or in-depth questions to Discord.",
            "Exclusive Discord Sneak Peeks: Tease upcoming product announcements or content on Discord first, then link to other platforms when publicly released."
          ]
        }
      ],
      metrics: ["2500+ members", "100 ambassadors", "1000+ daily messages", "5 partner communities"]
    },
    {
      month: "November 2025",
      highlight: "Growth Reinforcement & Retention",
      theme: "Market Leadership",
      topics: [
        "Year-in-Review Preparation",
        "Holiday/Seasonal Offers",
        "Educational Quizzes/Challenges",
        "Community Game Night",
        "Meet the Mods",
        "Ambassador Refresher Training",
        "Peer-to-Peer Mentoring",
        "Integrated Holiday Campaigns"
      ],
      strategyFocus: "Drive sustained growth, reinforce retention efforts, and prepare for end-of-year initiatives.",
      actions: [
        {
          category: "Content",
          items: [
            "Year-in-Review Prep: Start gathering community highlights, best memes, and top discussions for an end-of-year summary.",
            "Holiday/Seasonal Offers: Tease upcoming holiday promotions exclusively within Discord, creating urgency and value.",
            "Educational Quizzes/Challenges: Gamified content to test security knowledge, with small incentives."
          ]
        },
        {
          category: "Events (Digital)",
          items: [
            "Community \"Game Night\": Host interactive gaming sessions to strengthen community bonds.",
            "\"Meet the Mods\": A casual Q&A with your Discord moderation team to humanize the support system."
          ]
        },
        {
          category: "Ambassador Program",
          items: [
            "Refresher Training: Conduct a brief session for ambassadors on handling specific common FUD or new product messaging.",
            "Peer-to-Peer Mentoring: Encourage senior ambassadors to mentor newer members of the program."
          ]
        },
        {
          category: "Cross-Promotion",
          items: [
            "Integrated Campaigns: Run a cross-platform campaign (e.g., \"Secure Your Holiday Crypto\") with Discord as a central hub for exclusive tips and discussions.",
            "Highlight Community Success Stories: Feature testimonials from Discord members (with permission) on other platforms about how the community helped them."
          ]
        }
      ],
      metrics: ["5000+ members", "200 ambassadors", "2000+ daily messages", "$10K revenue"]
    },
    {
      month: "December 2025",
      highlight: "End-of-Year Review & Future Planning",
      theme: "Platform Dominance",
      topics: [
        "Year in Discord Recap",
        "2026 Sneak Peek",
        "Member Recognition",
        "Community Town Hall",
        "Holiday Community Gathering",
        "Ambassador Annual Review",
        "Special Holiday Perks",
        "End-of-Year Campaign"
      ],
      strategyFocus: "Celebrate community achievements, gather comprehensive feedback, and lay the groundwork for Q1 2026.",
      actions: [
        {
          category: "Content",
          items: [
            "\"Year in Discord\" Recap: A visually engaging summary of community growth, top discussions, and memorable moments.",
            "\"2026 Sneak Peek\": Share high-level teasers of what Ledger has planned for the next year (product, initiatives), giving Discord members an exclusive look.",
            "Member Recognition: Recognize top contributors, active members, and all ambassadors."
          ]
        },
        {
          category: "Events (Digital)",
          items: [
            "\"Community Town Hall\": An open forum for members to provide feedback directly to the Discord lead, discussing what worked well and what could improve.",
            "Holiday Community Gathering: A festive, informal event to thank the community for their loyalty."
          ]
        },
        {
          category: "Ambassador Program",
          items: [
            "Annual Review & Planning: Conduct a formal review with ambassadors to gather their insights for the program's evolution.",
            "Special Holiday Perk: Offer ambassadors a unique, exclusive gift or experience as a thank you."
          ]
        },
        {
          category: "Cross-Promotion",
          items: [
            "End-of-Year Campaign: Promote Discord as the place to \"Connect with the most secure crypto community in 2025\" as part of broader Ledger year-end comms.",
            "Call for Testimonials: Encourage positive testimonials about Discord on other platforms."
          ]
        }
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
    const branchLength = 200 // Increased for better connection
    const boxSpacing = 280 // Adjusted for bigger boxes
    
    return {
      left: `M ${startX} ${startY} Q ${startX - 50} ${startY + 100} ${startX - boxSpacing} ${startY + branchLength}`,
      middle: `M ${startX} ${startY} L ${startX} ${startY + branchLength}`,
      right: `M ${startX} ${startY} Q ${startX + 50} ${startY + 100} ${startX + boxSpacing} ${startY + branchLength}`
    }
  }

  // Generate tool connection paths
  const generateToolPaths = () => {
    return {
      left: `M 0 30 Q -30 60 -60 90`,
      right: `M 0 30 Q 30 60 60 90`
    }
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header Section - Reduced visual weight */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="sticky top-0 z-50 backdrop-blur-sm bg-black/70 border-b border-green-500/10"
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
          <div className="backdrop-blur-sm bg-gray-900/50 rounded-xl p-6 border border-green-500/10 shadow-sm">
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
                className="backdrop-blur-sm bg-gray-900/50 rounded-lg border border-green-500/[0.05] shadow-sm overflow-hidden"
              >
                <motion.div
                  whileHover={{ backgroundColor: 'rgba(16,185,129,0.05)' }}
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
              className="backdrop-blur-sm bg-gray-900/50 rounded-lg border border-green-500/[0.05] shadow-sm overflow-hidden"
            >
              <motion.div
                whileHover={{ backgroundColor: 'rgba(16,185,129,0.05)' }}
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
                className="backdrop-blur-sm bg-gray-900/50 rounded-lg border border-green-500/[0.05] shadow-sm overflow-hidden"
              >
                <motion.div
                  whileHover={{ backgroundColor: 'rgba(16,185,129,0.05)' }}
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
                    <stop offset={`${Math.max(0, scrollProgress - 0.05) * 100}%`} stopColor="#10b981" stopOpacity="0.1" />
                    <stop offset={`${scrollProgress * 100}%`} stopColor="#10b981" stopOpacity="0.8" />
                    <stop offset={`${Math.min(100, scrollProgress + 0.02) * 100}%`} stopColor="#10b981" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
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
                  strokeWidth="5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: scrollProgress }}
                  transition={{ duration: 0.3 }}
                />
                
                {/* Progress head glow */}
                {scrollProgress > 0 && (
                  <motion.circle
                    cx={400 + Math.sin(300 * discordRoadmap.monthlyPlans.length * scrollProgress * 0.012) * 45}
                    cy={300 * discordRoadmap.monthlyPlans.length * scrollProgress}
                    r="8"
                    fill="#10b981"
                    opacity="0.8"
                    filter="url(#glow)"
                  />
                )}
                
                {/* Branching paths - only show after all months */}
                {scrollProgress * (300 * discordRoadmap.monthlyPlans.length + 400) > 300 * discordRoadmap.monthlyPlans.length && (
                  <>
                    <motion.path
                      d={generateBranchPaths().left}
                      fill="none"
                      stroke="#10b981"
                      strokeOpacity="0.4"
                      strokeWidth="3"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    />
                    <motion.path
                      d={generateBranchPaths().middle}
                      fill="none"
                      stroke="#10b981"
                      strokeOpacity="0.4"
                      strokeWidth="3"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    />
                    <motion.path
                      d={generateBranchPaths().right}
                      fill="none"
                      stroke="#10b981"
                      strokeOpacity="0.4"
                      strokeWidth="3"
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
                    className="backdrop-blur-sm bg-gray-900/50 rounded-lg p-5 border border-green-500/10 cursor-pointer shadow-sm"
                    onClick={() => handleMonthClick(index)}
                  >
                    <h3 className="text-lg font-light text-green-400/90 mb-2">
                      {plan.month}
                    </h3>
                    <p className="text-gray-400 font-light text-xs mb-2">
                      {plan.theme}
                    </p>
                    <p className="text-gray-500 text-xs italic mb-3">
                      • {plan.highlight}
                    </p>
                    
                    {/* Topics list (shown before expansion) */}
                    {plan.topics && (
                      <ul className="space-y-1">
                        {plan.topics.map((topic, topicIndex) => (
                          <li key={topicIndex} className="text-xs text-gray-400 flex items-start">
                            <span className="text-green-500/30 mr-2">•</span>
                            <span className="font-light">{topic}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    
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
                            {/* Strategy Focus */}
                            {plan.strategyFocus && (
                              <>
                                <h4 className="text-xs font-medium text-green-400/70 mb-2">
                                  Strategy Focus:
                                </h4>
                                <p className="text-xs text-gray-400 mb-4 font-light">
                                  {plan.strategyFocus}
                                </p>
                              </>
                            )}
                            
                            {/* Action Items - handle both old and new format */}
                            {plan.actions && (
                              <>
                                <h4 className="text-xs font-medium text-green-400/70 mb-3">
                                  Action Items:
                                </h4>
                                {typeof plan.actions[0] === 'string' ? (
                                  // Old format - simple string array
                                  <ul className="space-y-2 mb-4">
                                    {(plan.actions as string[]).map((action: string, actionIndex: number) => (
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
                                ) : (
                                  // New format - categorized actions
                                  <div className="space-y-4 mb-4">
                                    {(plan.actions as Array<{category: string; items: string[]}>).map((actionGroup, groupIndex) => (
                                      <div key={groupIndex}>
                                        <h5 className="text-xs font-medium text-green-400/60 mb-2">
                                          {actionGroup.category}:
                                        </h5>
                                        <ul className="space-y-2">
                                          {actionGroup.items.map((item, itemIndex) => (
                                            <motion.li
                                              key={itemIndex}
                                              initial={{ x: -20, opacity: 0 }}
                                              animate={{ x: 0, opacity: 1 }}
                                              transition={{ delay: groupIndex * 0.1 + itemIndex * 0.05 }}
                                              className="text-xs text-gray-400 flex items-start"
                                            >
                                              <span className="text-green-500/50 mr-2">•</span>
                                              <span className="font-light">{item}</span>
                                            </motion.li>
                                          ))}
                                        </ul>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                            
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
          {isLoaded && scrollProgress * (300 * discordRoadmap.monthlyPlans.length + 400) > 300 * discordRoadmap.monthlyPlans.length && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="relative mt-48 flex justify-center"
            >
              <div className="relative w-full max-w-5xl">
                {/* Three End Boxes */}
                <div className="flex justify-between items-start">
                  {/* Mod Rules Box */}
                  <Link href="/mod_rules" className="block">
                    <motion.div
                      whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)' }}
                      className="backdrop-blur-sm bg-gradient-to-br from-gray-900/70 to-gray-900/50 rounded-xl p-8 border-2 border-green-500/30 cursor-pointer shadow-lg w-64 h-32 flex flex-col justify-center"
                    >
                      <div className="w-4 h-4 bg-green-500 rounded-full mx-auto mb-3 animate-pulse" />
                      <h3 className="text-base font-medium text-green-400 mb-2 text-center">
                        📋 Mod Rules
                      </h3>
                      <p className="text-xs text-gray-400 text-center">
                        Community guidelines and moderation policies
                      </p>
                    </motion.div>
                  </Link>
                  
                  {/* Tools Needed Box (Expandable) */}
                  <motion.div
                    className="relative"
                  >
                    <motion.div
                      whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)' }}
                      className="backdrop-blur-sm bg-gradient-to-br from-gray-900/70 to-gray-900/50 rounded-xl p-8 border-2 border-green-500/30 cursor-pointer shadow-lg w-64 h-32 flex flex-col justify-center"
                      onClick={() => setExpandedTools(!expandedTools)}
                    >
                      <div className="w-4 h-4 bg-green-500 rounded-full mx-auto mb-3 animate-pulse" />
                      <h3 className="text-base font-medium text-green-400 mb-2 flex items-center justify-center gap-2">
                        🛠️ Tools Needed
                        <motion.span
                          animate={{ rotate: expandedTools ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                          className="text-xs"
                        >
                          ▼
                        </motion.span>
                      </h3>
                      <p className="text-xs text-gray-400 text-center">
                        Essential tools for community management
                      </p>
                    </motion.div>
                    
                    {/* Expanded Tools Sub-boxes with connection lines */}
                    <AnimatePresence>
                      {expandedTools && (
                        <motion.div
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                          className="absolute left-1/2 transform -translate-x-1/2 mt-8 z-10"
                        >
                          {/* SVG for tool connection lines */}
                          <svg 
                            width="200" 
                            height="100" 
                            className="absolute -top-8 left-1/2 transform -translate-x-1/2"
                            style={{ pointerEvents: 'none' }}
                          >
                            <motion.path
                              d={generateToolPaths().left}
                              fill="none"
                              stroke="#10b981"
                              strokeOpacity="0.3"
                              strokeWidth="2"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 0.3 }}
                            />
                            <motion.path
                              d={generateToolPaths().right}
                              fill="none"
                              stroke="#10b981"
                              strokeOpacity="0.3"
                              strokeWidth="2"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 0.3 }}
                            />
                          </svg>
                          
                          <div className="flex gap-6 mt-12">
                            <motion.div
                              initial={{ scale: 0.8 }}
                              animate={{ scale: 1 }}
                              whileHover={{ scale: 1.05 }}
                              transition={{ delay: 0.1 }}
                              className="backdrop-blur-sm bg-gray-900/70 rounded-lg p-6 border border-green-500/20 shadow-lg cursor-pointer"
                              onClick={() => alert('Analytics Tool - Coming Soon')}
                            >
                              <h4 className="text-sm font-medium text-green-400/90 mb-2 flex items-center gap-2">
                                📊 Analytics Tool
                              </h4>
                              <p className="text-[11px] text-gray-400">
                                Track engagement and growth metrics
                              </p>
                            </motion.div>
                            
                            <Link href="/engage_tool">
                              <motion.div
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                whileHover={{ scale: 1.05 }}
                                transition={{ delay: 0.2 }}
                                className="backdrop-blur-sm bg-gray-900/70 rounded-lg p-6 border border-green-500/20 shadow-lg cursor-pointer"
                              >
                                <h4 className="text-sm font-medium text-green-400/90 mb-2 flex items-center gap-2">
                                  🎯 Engagement Tool
                                </h4>
                                <p className="text-[11px] text-gray-400">
                                  Reward and incentivize participation
                                </p>
                              </motion.div>
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                  
                  {/* Team Tree Box */}
                  <Link href="/tree" className="block">
                    <motion.div
                      whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)' }}
                      className="backdrop-blur-sm bg-gradient-to-br from-gray-900/70 to-gray-900/50 rounded-xl p-8 border-2 border-green-500/30 cursor-pointer shadow-lg w-64 h-32 flex flex-col justify-center"
                    >
                      <div className="w-4 h-4 bg-green-500 rounded-full mx-auto mb-3 animate-pulse" />
                      <h3 className="text-base font-medium text-green-400 mb-2 text-center">
                        🌳 Team Tree
                      </h3>
                      <p className="text-xs text-gray-400 text-center">
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