'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

const engagementData = {
  overview: {
    objective: "Build consistent, organic engagement from creators, KOLs, and active community members, driving daily interactions on Ledger's Discord and significantly increasing organic reach and engagement on Ledger's social channels.",
    howItWorks: "A structured initiative designed around the \"Ledger Engaged\" role in Discord, combined with an automated, point-based engagement tracking tool that motivates active participation through clear rewards and benefits."
  },
  keyComponents: [
    {
      title: "Ledger Engaged Role & Private Channel",
      description: "Exclusive access and role-based engagement system",
      details: [
        "Moderators assign the \"Ledger Engaged\" Discord role to selected creators, KOLs, and active community members.",
        "An exclusive private channel is available for users with this role, where Ledger's team regularly shares links to Ledger tweets and selected community member tweets to engage with."
      ],
      guidelines: [
        "User consistently active in Ledger community channels.",
        "User holds a verified (blue-checkmark) X/Twitter account.",
        "User validated by moderators as a trusted and positive member.",
        "Automatic eligibility for Ledger Community Pass holders as an added NFT perk."
      ]
    },
    {
      title: "Automated Points System",
      description: "Track and reward engagement automatically",
      details: [
        "Users earn points automatically for interactions (likes, retweets, replies) with Ledger tweets and selected Ledger Engaged members' tweets.",
        "Points awarded scale based on user account tier (higher follower count = higher points earned), motivating higher-tier KOL engagement."
      ]
    },
    {
      title: "Engagement Analytics Dashboard",
      description: "Powered by Nabulines platform",
      details: [
        "Members access a dedicated analytics page (https://www.nabulines.com/dashboard) in the Nabulines platform to track:",
        "• Total points accumulated.",
        "• Detailed engagement metrics breakdown.",
        "• Individual progress, incentivizing continuous participation."
      ]
    },
    {
      title: "Rewards & Incentives",
      description: "Redeem points for exclusive benefits",
      rewards: [
        "Boosting visibility of their own tweets.",
        "Special Discord roles and statuses.",
        "Shoutouts and mentions in Twitter Spaces.",
        "Opportunities to win Ledger devices and exclusive prizes."
      ]
    },
    {
      title: "Competitive Leaderboard",
      description: "Drive engagement through friendly competition",
      details: [
        "A public, real-time leaderboard displayed in Discord encourages friendly competition and motivates daily engagement.",
        "Separate leaderboards highlighting both general community members and influential KOLs."
      ]
    },
    {
      title: "KOL Onboarding & Expansion Strategy",
      description: "Strategic growth through influencer partnerships",
      details: [
        "The KOL management team proactively scouts and brings in influential community voices, starting with Don't Get Wrecked (DGR) campaign KOLs who align strongly with Ledger's values around security and self-custody.",
        "Gradual expansion includes onboarding KOLs from other Ledger campaigns, increasing the initiative's scope over time."
      ]
    },
    {
      title: "Phased Launch & Controlled Growth",
      description: "Risk-managed rollout strategy",
      phases: [
        {
          name: "Initial Phase (Internal Test)",
          description: "Launch initiative internally without external promotion from Ledger's main social channels to manage risk, evaluate effectiveness, and refine operations."
        },
        {
          name: "Scaling & Growth",
          description: "Gradually introduce broader promotions based on clearly measured KPIs, community feedback, and data-driven adjustments."
        }
      ]
    }
  ],
  timeline: {
    title: "Execution Timeline (end of July)",
    weeks: [
      {
        period: "Week 1",
        tasks: "Technical setup, Discord role creation, private channel setup, analytics dashboard integration."
      },
      {
        period: "Weeks 2–3",
        tasks: "Initial internal tests, onboard first batch of KOLs and Community Pass holders."
      },
      {
        period: "Weeks 4–5",
        tasks: "Gather feedback, measure KPIs, refine operational details."
      },
      {
        period: "Week 6 onward",
        tasks: "Gradual external onboarding and full-scale rollout."
      }
    ]
  },
  measurement: {
    title: "Measurement & Reporting",
    items: [
      "Real-time KPI dashboard via Nabulines for continuous performance evaluation.",
      "Monthly reviews focused on:",
      "• Engagement levels & growth.",
      "• Discord member retention.",
      "• Organic reach metrics on Ledger's social posts."
    ]
  }
}

export default function EngageToolPage() {
  const [expandedComponent, setExpandedComponent] = useState<number | null>(null)

  const handleComponentClick = (index: number) => {
    setExpandedComponent(expandedComponent === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900/10 to-gray-900">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="sticky top-0 z-50 backdrop-blur-sm bg-gray-900/50 border-b border-green-500/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-extralight text-green-400/90">
                Ledger Engagement Initiative
              </h1>
              <p className="text-xs md:text-sm text-gray-500 mt-1 font-light">
                Automated engagement tracking and rewards system
              </p>
            </div>
            <Link href="/discord-roadmap">
              <motion.button
                whileHover={{ scale: 1.05 }}
                className="text-xs text-gray-400 hover:text-green-400 transition-colors"
              >
                ← Back to Roadmap
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Objective Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16 max-w-4xl mx-auto"
        >
          <div className="backdrop-blur-sm bg-white/[0.03] rounded-xl p-8 border border-green-500/10 shadow-sm">
            <h2 className="text-xl md:text-2xl font-extralight text-green-400/80 mb-4">
              Objective
            </h2>
            <p className="text-gray-400 text-base font-light leading-relaxed mb-6">
              {engagementData.overview.objective}
            </p>
            
            <h3 className="text-lg font-extralight text-green-400/70 mb-3">
              How It Works
            </h3>
            <p className="text-gray-400 text-sm font-light">
              {engagementData.overview.howItWorks}
            </p>
          </div>
        </motion.div>

        {/* Key Components */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-16"
        >
          <h2 className="text-xl md:text-2xl font-extralight text-green-400/80 mb-10 text-center">
            Key Components
          </h2>
          
          <div className="space-y-4 max-w-4xl mx-auto">
            {engagementData.keyComponents.map((component, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                className="backdrop-blur-sm bg-white/[0.02] rounded-lg border border-green-500/[0.05] shadow-sm overflow-hidden"
              >
                <motion.div
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                  className="p-6 cursor-pointer transition-colors"
                  onClick={() => handleComponentClick(index)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-base font-medium text-gray-300 mb-1">
                        {index + 1}. {component.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {component.description}
                      </p>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedComponent === index ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-gray-400 text-sm ml-4"
                    >
                      ▼
                    </motion.div>
                  </div>
                </motion.div>
                
                <AnimatePresence>
                  {expandedComponent === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 pt-2 border-t border-green-500/[0.05]">
                        {component.details && (
                          <ul className="space-y-2 mb-4">
                            {component.details.map((detail, detailIndex) => (
                              <motion.li
                                key={detailIndex}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: detailIndex * 0.05 }}
                                className="text-sm text-gray-400 flex items-start"
                              >
                                <span className="text-green-500/50 mr-2">•</span>
                                <span className="font-light">{detail}</span>
                              </motion.li>
                            ))}
                          </ul>
                        )}
                        
                        {component.guidelines && (
                          <>
                            <h4 className="text-sm font-medium text-green-400/60 mb-3 mt-4">
                              Role Assignment Guidelines:
                            </h4>
                            <ul className="space-y-2">
                              {component.guidelines.map((guideline, guideIndex) => (
                                <motion.li
                                  key={guideIndex}
                                  initial={{ x: -20, opacity: 0 }}
                                  animate={{ x: 0, opacity: 1 }}
                                  transition={{ delay: 0.2 + guideIndex * 0.05 }}
                                  className="text-sm text-gray-400 flex items-start"
                                >
                                  <span className="text-green-500/50 mr-2">•</span>
                                  <span className="font-light">{guideline}</span>
                                </motion.li>
                              ))}
                            </ul>
                          </>
                        )}
                        
                        {component.rewards && (
                          <>
                            <h4 className="text-sm font-medium text-green-400/60 mb-3">
                              Available Rewards:
                            </h4>
                            <ul className="space-y-2">
                              {component.rewards.map((reward, rewardIndex) => (
                                <motion.li
                                  key={rewardIndex}
                                  initial={{ x: -20, opacity: 0 }}
                                  animate={{ x: 0, opacity: 1 }}
                                  transition={{ delay: rewardIndex * 0.05 }}
                                  className="text-sm text-gray-400 flex items-start"
                                >
                                  <span className="text-green-500/50 mr-2">•</span>
                                  <span className="font-light">{reward}</span>
                                </motion.li>
                              ))}
                            </ul>
                          </>
                        )}
                        
                        {component.phases && (
                          <div className="space-y-4">
                            {component.phases.map((phase, phaseIndex) => (
                              <motion.div
                                key={phaseIndex}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: phaseIndex * 0.1 }}
                                className="bg-white/[0.02] rounded-lg p-4"
                              >
                                <h5 className="text-sm font-medium text-green-400/70 mb-2">
                                  {phase.name}
                                </h5>
                                <p className="text-xs text-gray-400 font-light">
                                  {phase.description}
                                </p>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Timeline Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-16 max-w-4xl mx-auto"
        >
          <div className="backdrop-blur-sm bg-white/[0.02] rounded-xl p-8 border border-green-500/[0.05] shadow-sm">
            <h2 className="text-lg md:text-xl font-extralight text-green-400/80 mb-6">
              {engagementData.timeline.title}
            </h2>
            
            <div className="space-y-4">
              {engagementData.timeline.weeks.map((week, index) => (
                <motion.div
                  key={index}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className="min-w-[100px]">
                    <span className="text-sm font-medium text-green-400/70">
                      {week.period}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-400 font-light">
                      {week.tasks}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Measurement Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mb-16 max-w-4xl mx-auto"
        >
          <div className="backdrop-blur-sm bg-white/[0.02] rounded-xl p-8 border border-green-500/[0.05] shadow-sm">
            <h2 className="text-lg md:text-xl font-extralight text-green-400/80 mb-6">
              {engagementData.measurement.title}
            </h2>
            
            <ul className="space-y-3">
              {engagementData.measurement.items.map((item, index) => (
                <motion.li
                  key={index}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.9 + index * 0.05 }}
                  className="text-sm text-gray-400 font-light"
                >
                  {item}
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  )
} 