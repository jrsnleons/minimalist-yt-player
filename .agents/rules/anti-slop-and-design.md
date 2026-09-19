---
description: Permanent rule enforcing Apple Human Interface Guidelines, Anti-Slop, and Interface craft
globs: ["**/*.tsx", "**/*.ts", "**/*.css", "**/*.md"]
always_on: true
---

# Design, Copywriting & Anti-Slop Enforcement

Every change to this codebase must adhere strictly to these principles:

## 1. Apple Human Interface Guidelines (HIG)
- **Minimum 11pt/12px text**: Never use `text-[9px]` or `text-[10px]`. Use `text-xs` (12px) or `text-[11px] font-mono`.
- **Title Case**: All navigation labels, section titles, and modal headers must use Title Case.
- **Translucent Depth & Liquid Glass**: Use obsidian dark surfaces with specular borders (`.apple-liquid-glass`, `.apple-card`) and restrained ambient visualizers (opacity ≤ 0.25).
- **Accessible Touch & Click Targets**: Buttons and interactive controls must have minimum 36–44pt bounding targets (`min-h-[36px]`, `w-7 h-7` with padding).
- **Native Safe Modals**: Use `ConfirmModal` for destructive actions with safe default focus on Cancel. Never invoke `window.confirm()`.
- **Focus Rings**: Ensure clear `:focus-visible` ring indicators across all form fields and buttons.

## 2. Anti-Slop & Human Copywriting
- **No AI Clichés**: Ban promotional hype, faux-poetic prose, and possessive pronouns ("your", "our").
- **Concise & Functional**: State plainly what actions and features do.
- **Short Microcopy**: Buttons and tooltips should be 1–3 words max ("Add to Liked", "Play Next", "Clear Queue").

## 3. UI Polish & Quality
- **Concentric Border Radius**: Nested radius = outer radius minus padding.
- **Build Integrity**: Ensure `pnpm build` passes with zero errors before completing tasks.
