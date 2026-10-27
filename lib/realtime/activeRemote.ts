import type { RemoteHostLink } from '@/lib/realtime/transport';

/** Lets the host store tell phones the session ended without importing the hook. */
let active: RemoteHostLink | null = null;

export function setActiveRemoteHost(link: RemoteHostLink | null) {
  active = link;
}

export function endActiveRemoteHost() {
  active?.end();
}
