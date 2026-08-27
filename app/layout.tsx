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
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Onyx — Pure Sound, Zero Noise',
    template: '%s · Onyx Audio',
  },
  description:
    'A distraction-free, local-first music streaming player. Dark noir aesthetic, zero tracking, dynamic artwork colors, auto crossfade, and complete data sovereignty.',
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
  authors: [{ name: 'Onyx Audio', url: 'https://onyx-player.vercel.app' }],
  creator: 'Onyx',
  applicationName: 'Onyx Audio',
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
    siteName: 'Onyx Audio',
    title: 'Onyx — Pure Sound, Zero Noise',
    description:
      'A distraction-free, local-first music streaming player with pure dark noir aesthetic, dynamic artwork colors, auto crossfade, and zero tracking.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Onyx — Pure Sound, Zero Noise',
    description:
      'A distraction-free, local-first music streaming player with pure dark noir aesthetic, auto crossfade, and zero tracking.',
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
