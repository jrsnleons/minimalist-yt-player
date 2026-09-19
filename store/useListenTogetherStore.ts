import { create } from 'zustand';
import type { RoomParticipant, FloatingReaction, RoomState } from '@/lib/rooms/roomManager';
import type { Track } from '@/types';
import { uuid } from '@/lib/utils';

interface ListenTogetherState {
  isInRoom: boolean;
  roomCode: string | null;
  roomName: string | null;
  isHost: boolean;
  allowListenerControls: boolean;
  userId: string;
  userName: string;
  participants: RoomParticipant[];
  isModalOpen: boolean;
  prefillCode: string | null;
  reactions: FloatingReaction[];
  syncStatus: 'synced' | 'syncing' | 'offline';

  // Actions
  setUserName: (name: string) => void;
  openModal: (prefillCode?: string) => void;
  closeModal: () => void;
  createRoom: (
    customName?: string,
    initialPlayback?: {
      currentTrack: Track | null;
      isPlaying: boolean;
      progress: number;
      queue: Track[];
    }
  ) => Promise<boolean>;
  joinRoom: (code: string) => Promise<{ success: boolean; error?: string }>;
  leaveRoom: () => Promise<void>;
  sendReaction: (emoji: string) => Promise<void>;
  addReactionLocally: (reaction: FloatingReaction) => void;
  setRoomSync: (room: RoomState) => void;
  setSyncStatus: (status: 'synced' | 'syncing' | 'offline') => void;
  transferDj: (targetUserId: string) => Promise<boolean>;
  toggleListenerControls: (allow: boolean) => Promise<boolean>;
  addTrackToSharedQueue: (track: Track, options?: { playNext?: boolean }) => Promise<boolean>;
  removeTrackFromSharedQueue: (trackId: string) => Promise<boolean>;
  reorderSharedQueue: (newQueue: Track[]) => Promise<boolean>;
  clearSharedQueue: () => Promise<boolean>;
}

function getStoredUser(): { userId: string; userName: string } {
  if (typeof window === 'undefined') {
    return { userId: 'server-user', userName: 'Listener' };
  }
  // Use sessionStorage so each tab/window has its own independent participant session
  let id = sessionStorage.getItem('onyx_listen_user_id');
  if (!id) {
    id = uuid();
    sessionStorage.setItem('onyx_listen_user_id', id);
  }
  const name = localStorage.getItem('onyx_listen_user_name') || 'Listener';
  return { userId: id, userName: name };
}

export const useListenTogetherStore = create<ListenTogetherState>((set, get) => {
  const initialUser = getStoredUser();

  return {
    isInRoom: false,
    roomCode: null,
    roomName: null,
    isHost: false,
    allowListenerControls: false,
    userId: initialUser.userId,
    userName: initialUser.userName,
    participants: [],
    isModalOpen: false,
    prefillCode: null,
    reactions: [],
    syncStatus: 'offline',

    setUserName: (name: string) => {
      const clean = name.trim() || 'Listener';
      if (typeof window !== 'undefined') {
        localStorage.setItem('onyx_listen_user_name', clean);
      }
      set({ userName: clean });
    },

    openModal: (prefillCode) => {
      set({ isModalOpen: true, prefillCode: prefillCode?.toUpperCase() || null });
    },

    closeModal: () => {
      set({ isModalOpen: false, prefillCode: null });
    },

    createRoom: async (customName, initialPlayback) => {
      const { userId, userName } = get();
      try {
        const res = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            userId,
            userName,
            roomName: customName,
            initialPlayback,
          }),
        });
        const data = await res.json();
        if (data.room) {
          set({
            isInRoom: true,
            roomCode: data.room.code,
            roomName: data.room.name,
            isHost: true,
            allowListenerControls: false,
            participants: data.room.participants,
            syncStatus: 'synced',
            isModalOpen: false,
          });
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },

    joinRoom: async (code) => {
      const { userId, userName } = get();
      try {
        const res = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'join', code: code.toUpperCase().trim(), userId, userName }),
        });
        const data = await res.json();
        if (data.room) {
          set({
            isInRoom: true,
            roomCode: data.room.code,
            roomName: data.room.name,
            isHost: data.room.hostId === userId,
            allowListenerControls: data.room.allowListenerControls ?? false,
            participants: data.room.participants,
            syncStatus: 'synced',
            isModalOpen: false,
          });
          return { success: true };
        }
        return { success: false, error: data.error || 'Failed to join session' };
      } catch {
        return { success: false, error: 'Network error. Check connection and try again.' };
      }
    },

    leaveRoom: async () => {
      const { roomCode, userId } = get();
      if (roomCode) {
        const payload = { action: 'leave', userId };
        const url = `/api/rooms/${roomCode}/action`;
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error('leave failed');
        } catch {
          // Single retry
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }).catch(() => {});
        }
      }
      set({
        isInRoom: false,
        roomCode: null,
        roomName: null,
        isHost: false,
        allowListenerControls: false,
        participants: [],
        syncStatus: 'offline',
        reactions: [],
      });
    },

    sendReaction: async (emoji: string) => {
      const { roomCode, userId, userName } = get();
      if (!roomCode) return;

      const reaction: FloatingReaction = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        emoji,
        userId,
        userName,
        timestamp: Date.now(),
      };

      get().addReactionLocally(reaction);

      fetch(`/api/rooms/${roomCode}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reaction', userId, emoji }),
      }).catch(() => {});
    },

    addReactionLocally: (reaction) => {
      set((s) => ({
        reactions: [reaction, ...s.reactions.slice(0, 19)],
      }));
    },

    setRoomSync: (room) => {
      const { userId } = get();
      set({
        roomCode: room.code,
        roomName: room.name,
        isHost: room.hostId === userId,
        allowListenerControls: room.allowListenerControls ?? false,
        participants: room.participants,
        syncStatus: 'synced',
      });
    },

    setSyncStatus: (status) => set({ syncStatus: status }),

    transferDj: async (targetUserId: string) => {
      const { roomCode, userId } = get();
      if (!roomCode) return false;
      try {
        const res = await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'transfer-dj', userId, targetUserId }),
        });
        const data = await res.json();
        return !!data.success;
      } catch {
        return false;
      }
    },

    toggleListenerControls: async (allow: boolean) => {
      const { roomCode, userId } = get();
      if (!roomCode) return false;
      set({ allowListenerControls: allow });
      try {
        const res = await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'toggle-listener-controls', userId, allowListenerControls: allow }),
        });
        const data = await res.json();
        return !!data.success;
      } catch {
        return false;
      }
    },

    addTrackToSharedQueue: async (track: Track, options?: { playNext?: boolean }) => {
      const { roomCode, userId, userName } = get();
      if (!roomCode) return false;
      try {
        const res = await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'queue-add',
            userId,
            userName,
            track,
            playNext: !!options?.playNext,
          }),
        });
        const data = await res.json();
        return !!data.success;
      } catch {
        return false;
      }
    },

    removeTrackFromSharedQueue: async (trackId: string) => {
      const { roomCode, userId } = get();
      if (!roomCode) return false;
      try {
        const res = await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'queue-remove', userId, trackId }),
        });
        const data = await res.json();
        return !!data.success;
      } catch {
        return false;
      }
    },

    reorderSharedQueue: async (newQueue: Track[]) => {
      const { roomCode, userId } = get();
      if (!roomCode) return false;
      try {
        const res = await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'queue-reorder', userId, queue: newQueue }),
        });
        const data = await res.json();
        return !!data.success;
      } catch {
        return false;
      }
    },

    clearSharedQueue: async () => {
      const { roomCode, userId } = get();
      if (!roomCode) return false;
      try {
        const res = await fetch(`/api/rooms/${roomCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'queue-clear', userId }),
        });
        const data = await res.json();
        return !!data.success;
      } catch {
        return false;
      }
    },
  };
});
