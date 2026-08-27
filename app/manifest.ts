import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Onyx Audio — Minimalist Player',
    short_name: 'Onyx',
    description:
      'A distraction-free, local-first music streaming player. Dark noir aesthetic, zero tracking, and complete data sovereignty.',
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
