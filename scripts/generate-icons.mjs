import sharp from 'sharp';
import { writeFileSync } from 'fs';

// StudyIndex icon: olive background, open book + sparkle
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Background -->
  <rect width="512" height="512" rx="112" fill="#5A5A40"/>

  <!-- Open book -->
  <g transform="translate(256,248)">
    <!-- Left page -->
    <path d="M-140,-90 L-140,100 Q-140,115 -125,118 L-8,130 L-8,-110 Q-60,-120 -125,-105 Q-140,-100 -140,-90 Z"
          fill="white" opacity="0.95"/>
    <!-- Right page -->
    <path d="M140,-90 L140,100 Q140,115 125,118 L8,130 L8,-110 Q60,-120 125,-105 Q140,-100 140,-90 Z"
          fill="white" opacity="0.85"/>
    <!-- Spine -->
    <rect x="-8" y="-110" width="16" height="240" rx="4" fill="#5A5A40"/>
    <!-- Left lines -->
    <line x1="-110" y1="-30" x2="-28" y2="-22" stroke="#5A5A40" stroke-width="10" stroke-linecap="round" opacity="0.3"/>
    <line x1="-110" y1="10" x2="-28" y2="18" stroke="#5A5A40" stroke-width="10" stroke-linecap="round" opacity="0.3"/>
    <line x1="-110" y1="50" x2="-28" y2="58" stroke="#5A5A40" stroke-width="10" stroke-linecap="round" opacity="0.3"/>
    <!-- Right lines -->
    <line x1="110" y1="-30" x2="28" y2="-22" stroke="#5A5A40" stroke-width="10" stroke-linecap="round" opacity="0.25"/>
    <line x1="110" y1="10" x2="28" y2="18" stroke="#5A5A40" stroke-width="10" stroke-linecap="round" opacity="0.25"/>
    <line x1="110" y1="50" x2="28" y2="58" stroke="#5A5A40" stroke-width="10" stroke-linecap="round" opacity="0.25"/>
  </g>

  <!-- Sparkle top-right -->
  <g transform="translate(370,130)" fill="#FFD166">
    <polygon points="0,-22 5,-5 22,0 5,5 0,22 -5,5 -22,0 -5,-5" />
  </g>
  <!-- Small sparkle -->
  <g transform="translate(148,148)" fill="white" opacity="0.6">
    <polygon points="0,-12 3,-3 12,0 3,3 0,12 -3,3 -12,0 -3,-3" />
  </g>
</svg>`;

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of sizes) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`public/icon-${size}x${size}.png`);
  console.log(`Generated icon-${size}x${size}.png`);
}

// Also generate apple-touch-icon (180x180)
await sharp(Buffer.from(svg))
  .resize(180, 180)
  .png()
  .toFile('public/apple-touch-icon.png');
console.log('Generated apple-touch-icon.png');

// favicon 32x32
await sharp(Buffer.from(svg))
  .resize(32, 32)
  .png()
  .toFile('public/favicon-32x32.png');
console.log('Generated favicon-32x32.png');

console.log('\nAll icons generated!');
