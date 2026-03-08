import './globals.css'

export const metadata = {
  title: 'VibeDash - SaaS Dashboard',
  description: 'Track your sales metrics with AI-powered insights.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
