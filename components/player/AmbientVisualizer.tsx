'use client';

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';

interface AmbientVisualizerProps {
  accentColor?: string;
  secondaryColor?: string;
  className?: string;
  mode?: 'fullscreen' | 'wave' | 'bars';
  blurAmount?: string; // e.g. 'blur-2xl' or 'blur-3xl'
}

export function AmbientVisualizer({
  accentColor = '#a855f7',
  secondaryColor = '#6366f1',
  className = '',
  mode = 'fullscreen',
  blurAmount = 'blur-3xl',
}: AmbientVisualizerProps) {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const ambientVisualizerEnabled = usePlayerStore((s) => s.ambientVisualizerEnabled);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!ambientVisualizerEnabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;
    let targetAmp = isPlaying ? 1 : 0.12;
    let currentAmp = isPlaying ? 1 : 0.12;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(rect.width * dpr, 200);
      canvas.height = Math.max(rect.height * dpr, 100);
      ctx.scale(dpr, dpr);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const render = () => {
      // Lerp amplitude for smooth transitions
      targetAmp = isPlaying ? 1 : 0.12;
      currentAmp += (targetAmp - currentAmp) * 0.05;

      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      if (mode === 'fullscreen') {
        // Fullscreen atmospheric aurora / cinematic wave field
        time += isPlaying ? 0.025 : 0.006;
        const centerY = height * 0.52;

        const waves = [
          {
            color: accentColor,
            freq: 0.0035,
            speed: 1.0,
            amp: height * 0.26 * currentAmp,
            alpha: 0.35,
            yOffset: 0,
            lineWidth: 60,
          },
          {
            color: secondaryColor,
            freq: 0.005,
            speed: -1.3,
            amp: height * 0.22 * currentAmp,
            alpha: 0.28,
            yOffset: height * 0.08,
            lineWidth: 50,
          },
          {
            color: accentColor,
            freq: 0.002,
            speed: 0.7,
            amp: height * 0.3 * currentAmp,
            alpha: 0.22,
            yOffset: -height * 0.08,
            lineWidth: 70,
          },
        ];

        waves.forEach((w) => {
          ctx.beginPath();
          ctx.lineWidth = w.lineWidth;
          ctx.strokeStyle = w.color;
          ctx.globalAlpha = w.alpha;

          for (let x = 0; x <= width; x += 6) {
            const y =
              centerY +
              w.yOffset +
              Math.sin(x * w.freq + time * w.speed) * w.amp +
              Math.cos(x * w.freq * 1.6 - time * 0.6) * (w.amp * 0.4);

            if (x === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
        });

        // Add soft breathing radial orbs for cinematic depth
        const pulse1 = Math.sin(time * 0.8) * 0.15 + 0.85;
        const orbRadius = Math.min(width, height) * 0.45 * pulse1;
        const grad1 = ctx.createRadialGradient(
          width * 0.35 + Math.sin(time * 0.5) * 50,
          height * 0.4 + Math.cos(time * 0.7) * 40,
          10,
          width * 0.35,
          height * 0.4,
          orbRadius
        );
        grad1.addColorStop(0, accentColor);
        grad1.addColorStop(1, 'transparent');
        ctx.globalAlpha = 0.22 * currentAmp;
        ctx.fillStyle = grad1;
        ctx.fillRect(0, 0, width, height);

        const grad2 = ctx.createRadialGradient(
          width * 0.65 + Math.cos(time * 0.6) * 60,
          height * 0.55 + Math.sin(time * 0.8) * 40,
          10,
          width * 0.65,
          height * 0.55,
          orbRadius * 1.1
        );
        grad2.addColorStop(0, secondaryColor);
        grad2.addColorStop(1, 'transparent');
        ctx.globalAlpha = 0.18 * currentAmp;
        ctx.fillStyle = grad2;
        ctx.fillRect(0, 0, width, height);
      } else {
        // Compact Wave Mode (for cards)
        time += isPlaying ? 0.04 : 0.008;
        const centerY = height / 2;

        const layers = [
          { freq: 0.015, speed: 1.0, amp: 14 * currentAmp, alpha: 0.5, width: 3 },
          { freq: 0.025, speed: -1.3, amp: 9 * currentAmp, alpha: 0.35, width: 2 },
          { freq: 0.008, speed: 0.7, amp: 18 * currentAmp, alpha: 0.25, width: 4 },
        ];

        layers.forEach((layer) => {
          ctx.beginPath();
          ctx.lineWidth = layer.width;
          ctx.strokeStyle = accentColor;
          ctx.globalAlpha = layer.alpha;

          for (let x = 0; x <= width; x += 3) {
            const y =
              centerY +
              Math.sin(x * layer.freq + time * layer.speed) * layer.amp * Math.sin((x / width) * Math.PI) +
              Math.cos(x * layer.freq * 1.5 - time * 0.5) * (layer.amp * 0.4);

            if (x === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
        });
      }

      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
    };
  }, [isPlaying, ambientVisualizerEnabled, accentColor, secondaryColor, mode]);

  if (!ambientVisualizerEnabled) return null;

  return (
    <div className={`pointer-events-none select-none overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className={`w-full h-full transform-gpu ${mode === 'fullscreen' ? blurAmount : ''}`}
        aria-hidden="true"
      />
    </div>
  );
}
