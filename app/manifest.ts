import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Onyx',
    short_name: 'Onyx',
    description: 'A local-first music player for YouTube.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0b0b0e',
    theme_color: '#0b0b0e',
    orientation: 'any',
    categories: ['music'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      {
        name: 'Remote',
        short_name: 'Remote',
        description: 'Control Onyx playing on another device',
        url: '/remote',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
  };
}
