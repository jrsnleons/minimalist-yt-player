import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { JetBrains_Mono } from 'next/font/google';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import './globals.css';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://onyx-player.vercel.app';

export const viewport: Viewport = {
  themeColor: '#0b0b0e',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
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
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: 'Onyx',
    statusBarStyle: 'black-translucent',
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
      <body className={GeistSans.className}>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
