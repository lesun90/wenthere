import type { Metadata } from 'next'
import { Caveat, DM_Sans } from 'next/font/google'
import { ThemeProvider } from '../lib/theme-context'
import './globals.css'

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-caveat',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Beenthere',
  description: 'Your travel story, on a globe.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${caveat.variable} ${dmSans.variable}`}>
      <head>
        {/* Prevent dark→light flash on reload when light theme is saved */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.add('light');})()` }} />
      </head>
      <body style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
