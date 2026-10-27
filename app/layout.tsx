import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://onyx-player.vercel.app';

export const viewport: Viewport = {
  themeColor: '#050507',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Onyx',
    template: '%s · Onyx',
  },
  description: 'A local-first music player for YouTube.',
  keywords: [
    'music player',
    'onyx audio',
    'youtube music',
    'minimalist audio',
    'lofi player',
    'zen focus',
    'local-first',
    'spotify importer',
    'crossfade player',
    'pwa',
  ],
  authors: [{ name: 'Onyx', url: 'https://onyx-player.vercel.app' }],
  creator: 'Onyx',
  applicationName: 'Onyx',
  generator: 'Next.js',
  alternates: {
    canonical: 'https://onyx-player.vercel.app',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://onyx-player.vercel.app',
    siteName: 'Onyx',
    title: 'Onyx',
    description: 'A local-first music player for YouTube.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Onyx',
    description: 'A local-first music player for YouTube.',
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
