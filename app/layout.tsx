import type { Metadata } from 'next'
import { Fraunces, Inter, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'PetOS',
  description: 'Continuidad de cuidado para tu mascota',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} font-body bg-bg text-ink min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
