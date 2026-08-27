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
| `OUTPUT_STANDALONE` | No | `false` | Set to `true` when building Docker standalone bundles. |

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
