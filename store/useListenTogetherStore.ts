import { create } from 'zustand';
import type { RoomParticipant, FloatingReaction, RoomState } from '@/lib/rooms/roomManager';
import type { Track } from '@/types';
import { uuid } from '@/lib/utils';
import { getTransport, type RoomAction } from '@/lib/realtime/transport';

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

  /** Sends a room action through whichever transport is active. */
  const act = async (action: RoomAction): Promise<boolean> => {
    const { roomCode, userId } = get();
    if (!roomCode) return false;
    try {
      const transport = await getTransport();
      return await transport.rooms.act(roomCode, userId, action);
    } catch {
      return false;
    }
  };

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
        const transport = await getTransport();
        const room = await transport.rooms.create({ userId, userName, roomName: customName, initialPlayback });
        if (!room) return false;
        set({
          isInRoom: true,
          roomCode: room.code,
          roomName: room.name,
          isHost: true,
          allowListenerControls: false,
          participants: room.participants,
          syncStatus: 'synced',
          isModalOpen: false,
        });
        return true;
      } catch {
        return false;
      }
    },

    joinRoom: async (code) => {
      const { userId, userName } = get();
      try {
        const transport = await getTransport();
        const result = await transport.rooms.join({ code, userId, userName });
        if ('room' in result) {
          const room = result.room;
          set({
            isInRoom: true,
            roomCode: room.code,
            roomName: room.name,
            isHost: room.hostId === userId,
            allowListenerControls: room.allowListenerControls ?? false,
            participants: room.participants,
            syncStatus: 'synced',
            isModalOpen: false,
          });
          return { success: true };
        }
        return { success: false, error: result.error };
      } catch {
        return { success: false, error: 'Network error. Check connection and try again.' };
      }
    },

    leaveRoom: async () => {
      const { roomCode, userId } = get();
      if (roomCode) {
        try {
          const transport = await getTransport();
          await transport.rooms.leave(roomCode, userId);
        } catch {}
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
      act({ action: 'reaction', emoji }).catch(() => {});
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

    transferDj: (targetUserId: string) => act({ action: 'transfer-dj', targetUserId }),

    toggleListenerControls: async (allow: boolean) => {
      if (!get().roomCode) return false;
      set({ allowListenerControls: allow });
      return act({ action: 'toggle-listener-controls', allowListenerControls: allow });
    },

    addTrackToSharedQueue: (track: Track, options?: { playNext?: boolean }) =>
      act({ action: 'queue-add', track, userName: get().userName, playNext: !!options?.playNext }),

    removeTrackFromSharedQueue: (trackId: string) => act({ action: 'queue-remove', trackId }),

    reorderSharedQueue: (newQueue: Track[]) => act({ action: 'queue-reorder', queue: newQueue }),

    clearSharedQueue: () => act({ action: 'queue-clear' }),
  };
});
