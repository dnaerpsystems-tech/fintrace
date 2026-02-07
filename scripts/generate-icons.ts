/**
 * PWA Icon Generator Script
 * Generates all required icon sizes for PWA
 * Run with: bun run scripts/generate-icons.ts
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// Icon sizes needed for PWA
const ICON_SIZES = [16, 32, 48, 72, 96, 128, 144, 152, 167, 180, 192, 384, 512];

// iOS Splash screen sizes
const SPLASH_SIZES = [
  { width: 640, height: 1136, name: 'apple-splash-640x1136' },
  { width: 750, height: 1334, name: 'apple-splash-750x1334' },
  { width: 828, height: 1792, name: 'apple-splash-828x1792' },
  { width: 1125, height: 2436, name: 'apple-splash-1125x2436' },
  { width: 1170, height: 2532, name: 'apple-splash-1170x2532' },
  { width: 1179, height: 2556, name: 'apple-splash-1179x2556' },
  { width: 1242, height: 2208, name: 'apple-splash-1242x2208' },
  { width: 1242, height: 2688, name: 'apple-splash-1242x2688' },
  { width: 1284, height: 2778, name: 'apple-splash-1284x2778' },
  { width: 1290, height: 2796, name: 'apple-splash-1290x2796' },
  { width: 1536, height: 2048, name: 'apple-splash-1536x2048' },
  { width: 1668, height: 2224, name: 'apple-splash-1668x2224' },
  { width: 1668, height: 2388, name: 'apple-splash-1668x2388' },
  { width: 2048, height: 2732, name: 'apple-splash-2048x2732' },
];

// Generate SVG icon
function generateIconSVG(size: number): string {
  const padding = size * 0.15;
  const iconSize = size - padding * 2;
  const cornerRadius = size * 0.22;
  const rupeeSize = iconSize * 0.5;
  const strokeWidth = Math.max(2, size * 0.04);

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${size}" height="${size}" rx="${cornerRadius}" fill="url(#grad)"/>
  <text
    x="${size / 2}"
    y="${size / 2 + rupeeSize * 0.35}"
    font-family="Arial, sans-serif"
    font-size="${rupeeSize}"
    font-weight="bold"
    fill="white"
    text-anchor="middle"
  >₹</text>
</svg>`;
}

// Generate splash screen SVG
function generateSplashSVG(width: number, height: number): string {
  const iconSize = Math.min(width, height) * 0.25;
  const rupeeSize = iconSize * 0.5;
  const cornerRadius = iconSize * 0.22;

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ecfdf5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#d1fae5;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="iconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#bgGrad)"/>

  <!-- Center Icon -->
  <g transform="translate(${(width - iconSize) / 2}, ${(height - iconSize) / 2 - height * 0.05})">
    <rect x="0" y="0" width="${iconSize}" height="${iconSize}" rx="${cornerRadius}" fill="url(#iconGrad)"/>
    <text
      x="${iconSize / 2}"
      y="${iconSize / 2 + rupeeSize * 0.35}"
      font-family="Arial, sans-serif"
      font-size="${rupeeSize}"
      font-weight="bold"
      fill="white"
      text-anchor="middle"
    >₹</text>
  </g>

  <!-- App Name -->
  <text
    x="${width / 2}"
    y="${height / 2 + iconSize * 0.8}"
    font-family="Arial, sans-serif"
    font-size="${Math.min(width, height) * 0.06}"
    font-weight="bold"
    fill="#064e3b"
    text-anchor="middle"
  >FinTrace</text>

  <!-- Tagline -->
  <text
    x="${width / 2}"
    y="${height / 2 + iconSize * 0.8 + Math.min(width, height) * 0.05}"
    font-family="Arial, sans-serif"
    font-size="${Math.min(width, height) * 0.025}"
    fill="#065f46"
    text-anchor="middle"
  >Track Every Rupee</text>
</svg>`;
}

async function main() {
  const publicDir = join(process.cwd(), 'public');
  const iconsDir = join(publicDir, 'icons');
  const splashDir = join(publicDir, 'splash');

  // Create directories
  if (!existsSync(iconsDir)) {
    mkdirSync(iconsDir, { recursive: true });
  }
  if (!existsSync(splashDir)) {
    mkdirSync(splashDir, { recursive: true });
  }

  console.log('Generating PWA icons...');

  // Generate icons
  for (const size of ICON_SIZES) {
    const svg = generateIconSVG(size);
    const filename = `icon-${size}x${size}.svg`;
    writeFileSync(join(iconsDir, filename), svg);
    console.log(`  Created ${filename}`);
  }

  // Generate apple touch icon
  const appleIcon = generateIconSVG(180);
  writeFileSync(join(iconsDir, 'apple-touch-icon.svg'), appleIcon);
  console.log('  Created apple-touch-icon.svg');

  // Generate main logo
  const logo = generateIconSVG(512);
  writeFileSync(join(publicDir, 'logo.svg'), logo);
  console.log('  Created logo.svg');

  console.log('\nGenerating iOS splash screens...');

  // Generate splash screens
  for (const splash of SPLASH_SIZES) {
    const svg = generateSplashSVG(splash.width, splash.height);
    const filename = `${splash.name}.svg`;
    writeFileSync(join(splashDir, filename), svg);
    console.log(`  Created ${filename}`);
  }

  console.log('\nDone! Icons and splash screens generated successfully.');
  console.log('\nNote: For production, convert SVG to PNG using a tool like sharp or Inkscape.');
}

main().catch(console.error);
