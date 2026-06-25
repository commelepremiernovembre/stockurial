import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Stockurial',
  description: 'Gestion de stock — Artcurial',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#1b2a4a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
