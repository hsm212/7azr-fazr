import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title:       'سين جيم | Seen Jeem',
  description: 'لعبة مسابقات ثقافية للفرق',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
