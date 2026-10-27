import { create } from 'zustand';
import type { SessionCredentials } from '@/lib/remote/types';
import { endActiveRemoteHost } from '@/lib/realtime/activeRemote';

const STORAGE_KEY = 'onyx_remote_session';

function readStored(): SessionCredentials | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.code === 'string' && typeof parsed?.token === 'string') return parsed;
  } catch {}
  return null;
}

function writeStored(session: SessionCredentials | null) {
  try {
    if (session) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}

interface RemoteHostState {
  session: SessionCredentials | null;
  /** Number of phones attached to the session. */
  phones: number;
  isModalOpen: boolean;
  isCreating: boolean;
  error: string | null;
  openModal: () => void;
  closeModal: () => void;
  restore: () => void;
  createSession: () => Promise<void>;
  endSession: () => Promise<void>;
  clearSession: () => void;
  setPhones: (n: number) => void;
}

export const useRemoteHostStore = create<RemoteHostState>((set, get) => ({
  session: null,
  phones: 0,
  isModalOpen: false,
  isCreating: false,
  error: null,

  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),

  restore: () => {
    if (get().session) return;
    const stored = readStored();
    if (stored) set({ session: stored });
  },

  createSession: async () => {
    if (get().session || get().isCreating) return;
    set({ isCreating: true, error: null });
    try {
      const res = await fetch('/api/remote', { method: 'POST' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (typeof data?.code !== 'string' || typeof data?.token !== 'string') throw new Error();
      const session = { code: data.code, token: data.token };
      writeStored(session);
      set({ session, phones: 0, isCreating: false });
    } catch {
      set({ isCreating: false, error: 'Could not start a session. Try again.' });
    }
  },

  endSession: async () => {
    const session = get().session;
    endActiveRemoteHost();
    get().clearSession();
    if (!session) return;
    try {
      await fetch(`/api/remote/${session.code}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      });
    } catch {}
  },

  clearSession: () => {
    writeStored(null);
    set({ session: null, phones: 0 });
  },

  setPhones: (phones) => set({ phones }),
}));
