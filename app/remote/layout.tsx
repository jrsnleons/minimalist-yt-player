import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Remote',
  description: 'Control Onyx playing on another device.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function RemoteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
