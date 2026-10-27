import { capabilityFor, type SessionScope } from '@/lib/realtime/session';

const TOKEN_TTL_MS = 60 * 60 * 1000;

/** Issues an Ably TokenRequest limited to one channel. The API key never leaves the server. */
export async function createScopedTokenRequest(scope: SessionScope, code: string, clientId: string) {
  const key = process.env.ABLY_API_KEY;
  if (!key) throw new Error('ABLY_API_KEY is not set');
  const Ably = await import('ably');
  const rest = new Ably.Rest({ key });
  return rest.auth.createTokenRequest({
    clientId,
    capability: JSON.stringify(capabilityFor(scope, code)),
    ttl: TOKEN_TTL_MS,
  });
}
