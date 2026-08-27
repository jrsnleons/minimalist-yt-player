# Onyx Audio — Build Status & Handoff

## Current Phase: Tooltip Portaling, Command Center Feedback & Share Fixes completed ✅
## Current Step: Ready for Daily Use & Production Deployment

## ✅ Latest Updates

### 1. Fixed Cropped Tooltips ([Tooltip.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/components/ui/Tooltip.tsx))
- **Portal Rendering**: Moved tooltips into `document.body` via `createPortal` with `position: fixed` and `z-[99999]`.
- **Zero Overflow Clipping**: Tooltips now calculate exact viewport coordinates with `getBoundingClientRect()`, preventing them from ever getting cropped by `overflow-hidden` containers, cards, tables, or modals.
- **Viewport Boundary Clamping**: Tooltips automatically clamp within screen edges so text is never cut off near browser margins.

### 2. Responsive Command Center & Instant Tactile Feedback ([CommandPalette.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/components/command-palette/CommandPalette.tsx), [Toast.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/components/ui/Toast.tsx), [AddToPlaylistModal.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/components/playlist/AddToPlaylistModal.tsx))
- **Instant Button State Morphing**: Clicking "Next" or "Queue" immediately transforms the button with a green checkmark (`✓ Set Next!` / `✓ Queued!`) and emerald glow for 1.8s.
- **In-Palette Confirmation Banner**: Animated non-intrusive banner appears inside the Command Palette header (`✓ Confirmed: Added "Title" to queue`) confirming actions without dismissing the user's flow.
- **Elevated Global Toasts (`z-[99999]`)**: Portaled `Toast` to `document.body` with `z-[99999]` so toasts are always visible on top of Command Palette (`z-[200]`), modals (`z-[100]`), and Zen mode (`z-50`).
- **Tactile Active Scaling**: Added `active:scale-95` on all command buttons and playlist rows.

### 3. Bulletproof Share Button ([SharePlaylistModal.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/components/playlist/SharePlaylistModal.tsx), [PlaylistDetail.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/components/playlist/PlaylistDetail.tsx), [HomeView.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/components/views/HomeView.tsx), [PlaylistsView.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/components/views/PlaylistsView.tsx), [app/page.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/app/page.tsx))
- **Auto Track Hydration**: If `tracks` are empty, `SharePlaylistModal` automatically resolves tracks directly from IndexedDB (`db.tracks.bulkGet`).
- **Empty Playlist Handling**: Clear friendly state (`"This playlist has no songs yet"`) preventing blank URL generation.
- **Dual Clipboard Copy Support**: Uses modern `navigator.clipboard.writeText` with automatic fallback to `document.execCommand('copy')` for non-HTTPS or mobile contexts.
- **Share Button in Header**: Added dedicated Share button in `PlaylistDetail.tsx` header.
- **Query & Hash Decoder**: `app/page.tsx` parses both `?s=...` and `#s=...` / `#c_...` hashes.
