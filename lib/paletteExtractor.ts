'use client';

export interface DynamicPalette {
  primary: string;
  accent: string;
  secondary: string;
  bgFrom: string;
  bgTo: string;
  glow: string;
  textColor: string;
  isExtracted: boolean;
}

const paletteCache = new Map<string, DynamicPalette>();
const pendingRequests = new Map<string, Promise<DynamicPalette | null>>();

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

const APP_BACKGROUND: [number, number, number] = [11, 11, 14];

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function parseColor(color: string): [number, number, number] | null {
  const c = color.trim();
  const hex = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split('').map((x) => x + x).join('') : hex[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const rgb = c.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  const hsl = c.match(/^hsla?\(\s*([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%/i);
  if (hsl) return hslToRgb(Number(hsl[1]), Number(hsl[2]), Number(hsl[3]));
  return null;
}

/**
 * Lightens an accent color until it reaches `minRatio` contrast (default 3:1, the
 * WCAG minimum for UI components) against the app background. Unparseable input is returned as-is.
 */
export function clampAccent(color: string, minRatio = 3): string {
  const rgb = parseColor(color);
  if (!rgb) return color;
  if (contrastRatio(rgb, APP_BACKGROUND) >= minRatio) return color;
  const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  for (let nl = l + 2; nl <= 95; nl += 2) {
    if (contrastRatio(hslToRgb(h, s, nl), APP_BACKGROUND) >= minRatio) {
      return `hsl(${h}, ${s}%, ${nl}%)`;
    }
  }
  return `hsl(${h}, ${s}%, 95%)`;
}

export function getCachedPalette(imageUrl?: string | null): DynamicPalette | null {
  if (!imageUrl) return null;
  return paletteCache.get(imageUrl) || null;
}

/**
 * Extracts vibrant dominant and harmonic accent colors from an image URL.
 */
export async function extractPaletteFromImageUrl(imageUrl: string): Promise<DynamicPalette | null> {
  if (!imageUrl) return null;
  if (paletteCache.has(imageUrl)) {
    return paletteCache.get(imageUrl)!;
  }
  if (pendingRequests.has(imageUrl)) {
    return pendingRequests.get(imageUrl)!;
  }

  const promise = new Promise<DynamicPalette | null>((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    const img = new window.Image();
    img.crossOrigin = 'anonymous';

    // Timeout safety
    const timeout = setTimeout(() => {
      resolve(null);
    }, 2500);

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        const SAMPLE_SIZE = 48;
        canvas.width = SAMPLE_SIZE;
        canvas.height = SAMPLE_SIZE;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        const imgData = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;

        // 12 Hue Bins (each 30 degrees)
        interface ColorBin {
          count: number;
          rSum: number;
          gSum: number;
          bSum: number;
          hSum: number;
          sSum: number;
          lSum: number;
          score: number;
        }

        const bins: ColorBin[] = Array.from({ length: 12 }, () => ({
          count: 0,
          rSum: 0,
          gSum: 0,
          bSum: 0,
          hSum: 0,
          sSum: 0,
          lSum: 0,
          score: 0,
        }));

        let totalValidPixels = 0;
        let avgR = 0, avgG = 0, avgB = 0;

        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          if (a < 128) continue; // Ignore transparent

          const [h, s, l] = rgbToHsl(r, g, b);

          // Skip pure black/white / muddy gray
          if (l < 10 || l > 92) continue;

          totalValidPixels++;
          avgR += r;
          avgG += g;
          avgB += b;

          const binIdx = Math.min(11, Math.floor(h / 30));
          const bin = bins[binIdx];
          bin.count++;
          bin.rSum += r;
          bin.gSum += g;
          bin.bSum += b;
          bin.hSum += h;
          bin.sSum += s;
          bin.lSum += l;

          // Score pixels: prefer higher saturation and pleasant mid-luminance
          const saturationBonus = Math.pow(s / 100, 1.4);
          const luminanceWeight = 1 - Math.abs(l - 50) / 60;
          bin.score += (saturationBonus * luminanceWeight) + 0.1;
        }

        // Sort bins by score
        const sortedBins = bins
          .filter((b) => b.count > 0)
          .sort((a, b) => b.score - a.score);

        if (sortedBins.length === 0) {
          // If monochromatic/black-and-white image, use average tone
          if (totalValidPixels > 0) {
            avgR = Math.round(avgR / totalValidPixels);
            avgG = Math.round(avgG / totalValidPixels);
            avgB = Math.round(avgB / totalValidPixels);
          } else {
            avgR = 168; avgG = 85; avgB = 247;
          }
          const [h, s] = rgbToHsl(avgR, avgG, avgB);
          const primary = `rgb(${avgR}, ${avgG}, ${avgB})`;
          const accent = clampAccent(`hsl(${h}, ${Math.max(s, 50)}%, 65%)`);
          const secondary = `hsl(${h}, ${Math.max(s, 40)}%, 75%)`;
          const bgFrom = `hsl(${h}, ${Math.min(s, 40)}%, 10%)`;
          const glow = `rgba(${avgR}, ${avgG}, ${avgB}, 0.45)`;

          const result: DynamicPalette = {
            primary,
            accent,
            secondary,
            bgFrom,
            bgTo: '#070709',
            glow,
            textColor: '#ffffff',
            isExtracted: true,
          };
          paletteCache.set(imageUrl, result);
          resolve(result);
          return;
        }

        const topBin = sortedBins[0];
        const topH = Math.round(topBin.hSum / topBin.count);
        const topS = Math.min(95, Math.max(45, Math.round(topBin.sSum / topBin.count)));
        const topL = Math.min(75, Math.max(35, Math.round(topBin.lSum / topBin.count)));

        const [r, g, b] = hslToRgb(topH, topS, topL);
        const primary = `rgb(${r}, ${g}, ${b})`;
        const accent = clampAccent(
          `hsl(${topH}, ${Math.min(100, topS + 15)}%, ${Math.min(80, Math.max(55, topL + 5))}%)`
        );

        // Find secondary hue from second highest bin or complement
        let secondH = (topH + 30) % 360;
        if (sortedBins.length > 1) {
          secondH = Math.round(sortedBins[1].hSum / sortedBins[1].count);
        }
        const secondary = `hsl(${secondH}, ${topS}%, ${Math.min(75, topL + 10)}%)`;
        const bgFrom = `hsl(${topH}, ${Math.min(65, Math.max(25, topS))}%, 11%)`;
        const glow = `rgba(${r}, ${g}, ${b}, 0.5)`;

        const result: DynamicPalette = {
          primary,
          accent,
          secondary,
          bgFrom,
          bgTo: '#070709',
          glow,
          textColor: '#ffffff',
          isExtracted: true,
        };

        paletteCache.set(imageUrl, result);
        resolve(result);
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      resolve(null);
    };

    img.src = imageUrl;
  }).finally(() => {
    pendingRequests.delete(imageUrl);
  });

  pendingRequests.set(imageUrl, promise);
  return promise;
}
