import SessionWrap from '@/components/SessionWrap'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionWrap>
      {children}
    </SessionWrap>
  )
} 