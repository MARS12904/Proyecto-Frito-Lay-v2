import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Frito Lay Admin Dashboard',
  description: 'Panel de administración para Frito Lay',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}



