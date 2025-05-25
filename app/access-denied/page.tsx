import Link from 'next/link'

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-red-400 p-6 font-sans">
      <div className="border border-red-500 p-8 max-w-md w-full text-center rounded">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="mb-6 text-sm text-red-300">Your Twitter profile is not approved yet. Please contact an admin or try again later.</p>
        <Link href="/">
          <button className="px-4 py-2 border border-red-400 hover:bg-red-900/30 rounded">Return Home</button>
        </Link>
      </div>
    </div>
  )
} 