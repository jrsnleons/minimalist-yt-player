<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Onyx Audio Design & Quality Standards

Always adhere to these standards during any development, refactoring, or feature additions:

## 1. Apple Human Interface Guidelines (HIG)
- **Typography**: Minimum 11pt/12px font size (`text-xs` or `text-[11px] font-mono`). Never use sub-11px font sizes (`text-[9px]`, `text-[10px]`).
- **Section Titles**: Always use Title Case for headers ("Playlists", "Recent Listening", "Quick Mixes", "Visual Effects").
- **Materials & Liquid Glass**: Use translucent dark obsidian surfaces (`.apple-liquid-glass`, `.apple-card`) with specular highlight borders and restrained ambient glow (opacity ≤ 0.25).
- **Hit Targets**: Minimum 36–44pt interactive targets (`min-h-[36px]`, `w-7 h-7` with padding).
- **Destructive Actions**: Always use the native accessible `ConfirmModal` (auto-focusing Cancel, backdrop dismiss, ESC trap) for deletions, queue clears, or database resets. Never use `window.confirm()`.
- **Accessibility**: Provide clear `:focus-visible` ring treatments and adequate WCAG AA contrast.

## 2. Anti-Slop & Human Copywriting
- **Zero Buzzwords / Jargon**: Strip empty marketing phrases (*"acoustic sanctum"*, *"continuous harmonic radio"*). Use plain, honest human copy (*"Songs you've listened to recently"*, *"Radio Mix"*).
- **Direct Tone**: Eliminate possessive pronouns ("your", "our") and passive filler. State what things do simply and concisely.
- **Short Microcopy**: Keep button labels, tooltips, and badges brief and purposeful ("Add to Liked", "Play Next", "Clear Queue").

## 3. UI Craft & Interface Polish
- **Concentric Radii**: Match nested corner radii (outer radius = inner radius + padding).
- **Restrained Motion**: Subtle, fast transitions (150–200ms) with purposeful cubic-bezier curves. Avoid distracting animations.
- **Clean Compilation**: Always verify zero TypeScript errors and zero build warnings with `pnpm build`.

