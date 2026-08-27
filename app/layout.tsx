import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#050507',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'Onyx — Pure Sound, Zero Noise',
    template: '%s · Onyx Audio',
  },
  description:
    'A distraction-free, local-first music streaming player. Dark noir aesthetic, zero tracking, dynamic artwork colors, and complete data sovereignty.',
  keywords: [
    'music player',
    'youtube music',
    'minimalist audio',
    'lofi player',
    'zen focus',
    'local-first',
    'spotify importer',
    'pwa',
  ],
  authors: [{ name: 'Onyx Player' }],
  creator: 'Onyx',
  applicationName: 'Onyx Audio',
  generator: 'Next.js',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Onyx Audio',
    title: 'Onyx — Pure Sound, Zero Noise',
    description:
      'A distraction-free, local-first music streaming player with pure dark noir aesthetic, dynamic artwork colors, and zero tracking.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Onyx — Pure Sound, Zero Noise',
    description: 'A distraction-free, local-first music streaming player.',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${jetbrainsMono.variable} dark`}
      style={{ colorScheme: 'dark' }}
    >
      <body className={GeistSans.className}>{children}</body>
    </html>
  );
}
