'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Smartphone } from 'lucide-react';
import { getStoredToken, parseRemoteInput, storeToken } from '@/lib/remote/tokenStore';

/** Code entry screen. A code alone only works on a phone that already holds its key. */
export function RemoteEntry({ initialCode = '', notice }: { initialCode?: string; notice?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialCode);
  const [error, setError] = useState<string | null>(notice ?? null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseRemoteInput(value);
    if (!parsed) {
      setError('Enter the 6-character code or paste the full link.');
      return;
    }
    const token = parsed.token ?? getStoredToken(parsed.code);
    if (!token) {
      setError('This code needs the full link. Scan the QR code or paste the copied link.');
      return;
    }
    storeToken(parsed.code, token);
    router.push(`/remote/${parsed.code}`);
  };

  return (
    <main className="h-dvh overflow-y-auto bg-[#0b0b0e] text-[#f4f4f6]">
      <div
        className="mx-auto w-full max-w-sm min-h-full flex flex-col justify-center gap-6 px-4"
        style={{ paddingTop: 'max(24px, env(safe-area-inset-top))', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex flex-col gap-3">
          <span className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-zinc-300">
            <Smartphone size={22} aria-hidden="true" />
          </span>
          <h1 className="text-xl font-bold tracking-tight">Onyx Remote</h1>
          <p className="text-sm text-zinc-400">
            Control playback on another device. Open Connect Phone in Onyx on the playing device, then scan
            the QR code or enter the code shown there.
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <label htmlFor="remote-code" className="text-xs font-medium text-zinc-400">
            Code or Link
          </label>
          <input
            id="remote-code"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            placeholder="ABC123"
            aria-describedby={error ? 'remote-code-error' : undefined}
            aria-invalid={error ? true : undefined}
            className="min-h-[48px] px-4 rounded-xl bg-white/[0.05] border border-white/[0.1] text-base font-mono tracking-widest text-white placeholder:text-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          />
          {error && (
            <p id="remote-code-error" role="alert" className="text-sm text-rose-300">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="min-h-[48px] rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Connect
          </button>
        </form>
      </div>
    </main>
  );
}
