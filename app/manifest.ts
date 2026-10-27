import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Onyx',
    short_name: 'Onyx',
    description: 'A local-first music player for YouTube.',
    start_url: '/',
    display: 'standalone',
    background_color: '#050507',
    theme_color: '#050507',
    orientation: 'any',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
