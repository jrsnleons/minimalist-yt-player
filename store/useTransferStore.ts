import { create } from 'zustand';

export type TransferTab = 'send' | 'receive';

interface TransferState {
  isOpen: boolean;
  tab: TransferTab;
  /** Set when a transfer link was opened on this device. */
  incoming: { code: string; token: string } | null;
  open: (tab?: TransferTab) => void;
  openIncoming: (incoming: { code: string; token: string }) => void;
  setTab: (tab: TransferTab) => void;
  close: () => void;
}

export const useTransferStore = create<TransferState>((set) => ({
  isOpen: false,
  tab: 'send',
  incoming: null,
  open: (tab = 'send') => set({ isOpen: true, tab, incoming: null }),
  openIncoming: (incoming) => set({ isOpen: true, tab: 'receive', incoming }),
  setTab: (tab) => set({ tab }),
  close: () => set({ isOpen: false, incoming: null }),
}));
