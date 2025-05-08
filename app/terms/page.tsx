import Link from 'next/link'

export default function TermsPage() {
  return (
    <main className="flex flex-col min-h-screen items-center bg-black font-mono text-green-300 p-8">
      <h1 className="text-2xl uppercase mb-4 border-b border-green-300 pb-2">Terms & Conditions</h1>
      <div className="max-w-2xl space-y-4 text-xs">
        <p>Effective Date: January 1, 2025</p>
        <p>
          By accessing or using Nabulines, you agree to be bound by these Terms & Conditions. If you do not agree, please
          do not use the Service.
        </p>
        <h2 className="text-sm uppercase mt-4">1. Use of Service</h2>
        <p>
          You agree to use Nabulines only for lawful purposes. You may not use the Service in violation of any applicable
          laws or regulations.
        </p>
        <h2 className="text-sm uppercase mt-4">2. Intellectual Property</h2>
        <p>
          All content, branding, and UI elements on Nabulines are the intellectual property of Nabulines or its licensors.
          Unauthorized use is prohibited.
        </p>
        <h2 className="text-sm uppercase mt-4">3. Limitation of Liability</h2>
        <p>
          Nabulines is provided "as is" and we are not liable for any damages arising from your use of the Service.
        </p>
        <h2 className="text-sm uppercase mt-4">4. Changes to Terms</h2>
        <p>
          We may update these Terms from time to time. Continued use of the Service signifies your acceptance of any
          updated terms.
        </p>
      </div>
      <Link href="/">
        <button className="mt-8 px-6 py-2 text-sm border border-green-300 rounded hover:bg-green-800">
          Back to Home
        </button>
      </Link>
    </main>
  )
} 