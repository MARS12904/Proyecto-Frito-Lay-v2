import { requireAdmin } from '@/lib/auth'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdmin()

  return <DashboardLayout>{children}</DashboardLayout>
}


