'use client'

import Header from '@/components/Header'
import Image from 'next/image'
import Link from 'next/link'

export default function TeamPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center bg-black font-mono text-green-300">
      <Header />
      
      <div className="mt-10 max-w-xl w-full px-4">
        <h1 className="text-xl uppercase mb-8 text-center border-b border-green-300 pb-2">Team</h1>
        
        <div className="border border-green-300 w-full">
          {/* Header */}
          <div className="border-b border-green-300 p-3 text-center font-bold">
            nabulines // team
          </div>
          
          {/* Team list */}
          <div className="p-2 space-y-3">
            {[
              { name: 'nabu', role: 'founder / ops / architect' },
              { name: 'parsa', role: 'kol ops / field manager' },
              { name: 'azurite', role: 'external comms / radar' },
              { name: 'nervyesi', role: 'discord matrix handler' },
              { name: 'paria', role: 'social layer control' },
              { name: 'parisa', role: 'vault key / protocol co-head' },
              { name: 'alpha', role: 'social support / relay' },
              { name: 'matt', role: 'social support / relay' },
              { name: 'nixo', role: 'kol support node' },
              { name: 'spider', role: 'visual stream (video)' },
              { name: 'sina', role: 'visual grid (graphics)' }
            ].map((member, index) => (
              <div key={index} className="flex items-center">
                <div className="w-8 h-8 bg-green-900 rounded-full mr-3 flex items-center justify-center overflow-hidden">
                  <Image 
                    src="/logo.png" 
                    alt={member.name}
                    width={32}
                    height={32}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="flex-1">
                  <span className="font-bold">{member.name}</span>
                  <span className="mx-2">→</span>
                  <span className="opacity-80">{member.role}</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Footer */}
          <div className="border-t border-green-300 p-3 text-xs">
            <div>$ flow control → paria + parisa</div>
            <div>$ logs on-chain. presence required.</div>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <Link href="/">
            <button className="px-6 py-3 text-sm border border-green-300 rounded hover:bg-green-800">
              Back to Home
            </button>
          </Link>
        </div>
      </div>
    </main>
  )
} 