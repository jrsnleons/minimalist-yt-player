import { ImageResponse } from 'next/og';

export const alt = 'Onyx Audio — Pure Sound, Zero Noise';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#050507',
          backgroundImage:
            'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.18) 0%, transparent 65%), radial-gradient(circle at 80% 90%, rgba(244, 63, 94, 0.12) 0%, transparent 50%)',
          padding: '60px 80px',
          fontFamily: 'sans-serif',
          color: '#fafafa',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Top Header */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
              }}
            >
              🎵
            </div>
            <span
              style={{
                fontSize: '28px',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: '#ffffff',
              }}
            >
              ONYX AUDIO
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 18px',
              borderRadius: '999px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '14px',
              fontFamily: 'monospace',
              color: '#a1a1aa',
            }}
          >
            onyx-player.vercel.app
          </div>
        </div>

        {/* Center Hero Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            maxWidth: '900px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '999px',
                backgroundColor: '#10b981',
              }}
            />
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#10b981',
                fontFamily: 'monospace',
              }}
            >
              Distraction-Free Music Streaming
            </span>
          </div>

          <h1
            style={{
              fontSize: '64px',
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: '-0.04em',
              margin: '0 0 20px 0',
              color: '#ffffff',
            }}
          >
            Pure Sound. Zero Noise.
          </h1>

          <p
            style={{
              fontSize: '22px',
              lineHeight: 1.4,
              color: '#a1a1aa',
              margin: 0,
              maxWidth: '750px',
            }}
          >
            Local-first music player with auto crossfade, dynamic artwork palette theming, Spotify importer, and Zen focus mode.
          </p>
        </div>

        {/* Bottom Feature Badges */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
          }}
        >
          {[
            'Auto Crossfade',
            'Dynamic Artwork Accent',
            'Zero Tracking',
            'Spotify & YT Import',
            'Zen Mode',
          ].map((feature) => (
            <div
              key={feature}
              style={{
                padding: '10px 20px',
                borderRadius: '14px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '14px',
                fontWeight: 600,
                color: '#d4d4d8',
              }}
            >
              {feature}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
