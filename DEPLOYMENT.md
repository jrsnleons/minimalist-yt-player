# 🚀 Onyx Audio — Deployment Guide

This guide walks you through deploying **Onyx Audio** to various platforms (Vercel, Netlify, Docker, Railway, Render, Fly.io, or VPS).

---

## ⚡ Option 1: Vercel (Recommended · 1-Click)

Vercel provides the fastest zero-config deployment with global edge routing and serverless function support.

### Via Web Dashboard
1. Push your repository to **GitHub**, **GitLab**, or **Bitbucket**.
2. Go to [vercel.com/new](https://vercel.com/new) and import your repository.
3. Keep default settings:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `./`
   - **Build Command**: `next build` (or `pnpm build`)
   - **Output Directory**: `.next`
4. *(Optional)* Add any environment variables in the **Environment Variables** panel (see [Environment Variables](#-environment-variables)).
5. Click **Deploy**.

### Via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

---

## 🌐 Option 2: Netlify

1. Push your code to GitHub.
2. Go to [app.netlify.com](https://app.netlify.com/) and click **Add new site** > **Import an existing project**.
3. Select your repository.
4. Netlify will auto-detect Next.js:
   - **Build command**: `pnpm build`
   - **Publish directory**: `.next`
5. Click **Deploy site**.

---

## 🐳 Option 3: Docker & Self-Hosting (VPS, Coolify, Portainer)

Onyx includes an optimized multi-stage `Dockerfile` with standalone Next.js output (~120MB image size).

### Build & Run locally with Docker
```bash
# 1. Build the Docker image
docker build -t onyx-audio .

# 2. Run container on port 3000
docker run -d -p 3000:3000 --name onyx onyx-audio
```

### Docker Compose
Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  onyx:
    build: .
    container_name: onyx-player
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOSTNAME=0.0.0.0
      - NEXT_PUBLIC_APP_URL=https://your-domain.com
      # - YOUTUBE_DATA_API_KEY=your_key_here
      # - SPOTIFY_CLIENT_ID=your_id_here
      # - SPOTIFY_CLIENT_SECRET=your_secret_here
```

Run with:
```bash
docker compose up -d
```

---

## 🚆 Option 4: Railway / Render / Fly.io

### Railway
1. Go to [railway.app](https://railway.app/) and create a **New Project**.
2. Select **Deploy from GitHub repo**.
3. Railway automatically detects the `Dockerfile` or Next.js build.
4. Set port to `3000` under **Networking** > **Generate Domain**.

### Render
1. Go to [dashboard.render.com](https://dashboard.render.com/) > **New** > **Web Service**.
2. Connect your repository.
3. Select **Docker** environment or **Node** (`pnpm build` & `pnpm start`).
4. Click **Create Web Service**.

### Fly.io
```bash
# Install flyctl & launch
fly launch
fly deploy
```

---

## ⚙️ Environment Variables

The player operates **100% out of the box with zero API keys or external accounts required**. All variables below are optional enhancements:

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | No | `https://onyx-player.vercel.app` | Canonical site URL used for OpenGraph and social previews. |
| `YOUTUBE_DATA_API_KEY` | No | *(None)* | Secondary fallback for search & playlist scraping if default Innertube scraper hits IP rate-limits. |
| `SPOTIFY_CLIENT_ID` | No | *(None)* | Optional Spotify Web API client ID fallback. |
| `SPOTIFY_CLIENT_SECRET`| No | *(None)* | Optional Spotify Web API client secret. |
| `ABLY_API_KEY` | No | *(None)* | Ably root API key. Enables the realtime transport for Phone Remote, Listen Together and Transfer Library. Server only; never sent to the browser. Required on serverless hosts. |
| `REMOTE_SECRET` | No | *(Derived from `ABLY_API_KEY`)* | Optional separate key for signing remote and transfer pairing secrets. Set it to rotate pairing secrets without rotating the Ably key. |
| `OUTPUT_STANDALONE` | No | `false` | Set to `true` when building Docker standalone bundles. |

---

## Realtime Setup (Ably)

Phone Remote, Listen Together and Transfer Library need devices to reach each other. Without `ABLY_API_KEY` the app relays through server memory over SSE, which works on a single long-running Node process (local dev, Docker, VPS) but not on serverless hosts like Vercel, where each device can hit a different instance. With the key set, devices talk through Ably channels instead and no database is needed.

1. Create a free account at [ably.com](https://ably.com) and create an app.
2. Open the app's API Keys tab and copy the root key (format `appId.keyId:secret`).
3. In the Vercel project, open Settings, then Environment Variables, and add `ABLY_API_KEY` with that value for Production (and Preview if wanted).
4. Redeploy so the new variable is picked up.
5. For local testing, copy `.env.example` to `.env.local` and set `ABLY_API_KEY` there.

How it works:

- The browser requests a token from `/api/realtime/token`. The server signs an Ably token request limited to one channel (`remote:<code>`, `room:<code>` or `transfer:<code>`), so a token cannot read any other session.
- Remote and transfer sessions use a stateless pairing secret (an HMAC of the code, valid for 7 days). Any server instance can verify it, so nothing is stored on the server. The secret travels in the link fragment and in POST bodies, never in query strings.
- The playing device (or DJ) is authoritative. Every message is validated by the side that receives it.
- `GET /api/realtime/config` reports `ably` or `sse`. The token route returns 501 when the key is not set.

The free Ably plan allows 64 KB per message. Remote snapshots and the shared Listen Together queue are trimmed to fit, and library transfers are split into ~48 KB chunks.

---

## 🧪 Pre-Flight Checklist

Before deploying, verify everything builds cleanly:

```bash
# 1. Install dependencies
pnpm install

# 2. Test production build
pnpm build

# 3. Test production preview locally
pnpm start
```

Open `http://localhost:3000` to verify audio playback, search, import, and responsive layouts.
