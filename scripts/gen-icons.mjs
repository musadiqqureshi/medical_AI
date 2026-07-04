// Generates PWA icons from a branded SVG using sharp.
//   node scripts/gen-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });

// Two white "orb eyes" (triangles pointing up), centered.
const eyes = (cx, cy, s) => {
  const w = s * 0.5;
  const h = s * 0.9;
  const gap = s * 0.5;
  const left = cx - gap / 2 - w;
  const right = cx + gap / 2;
  const top = cy - h / 2;
  const tri = (x) =>
    `<path d="M${x + w / 2} ${top} L${x + w} ${top + h} Q${x + w} ${top + h + 6} ${x + w - 6} ${top + h} L${x + 6} ${top + h} Q${x} ${top + h + 6} ${x} ${top + h - 6} Z" fill="#ffffff"/>`;
  return tri(left) + tri(right);
};

const svg = (size, { maskable = false } = {}) => {
  const pad = maskable ? size * 0.14 : size * 0.04; // safe zone for maskable
  const orbR = (size - pad * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const radius = maskable ? 0 : size * 0.22;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7c6cf0"/>
      <stop offset="0.55" stop-color="#a855f7"/>
      <stop offset="1" stop-color="#ec4899"/>
    </linearGradient>
    <radialGradient id="orb" cx="38%" cy="34%" r="75%">
      <stop offset="0" stop-color="#f9a8d4"/>
      <stop offset="0.45" stop-color="#c084fc"/>
      <stop offset="1" stop-color="#818cf8"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#bg)"/>
  <circle cx="${cx}" cy="${cy}" r="${orbR * 0.82}" fill="url(#orb)"/>
  ${eyes(cx, cy, orbR * 0.42)}
</svg>`;
};

const targets = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-192-maskable.png", size: 192, maskable: true },
  { name: "icon-512-maskable.png", size: 512, maskable: true },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "favicon-32.png", size: 32 },
];

for (const t of targets) {
  const buf = Buffer.from(svg(t.size, { maskable: t.maskable }));
  await sharp(buf).png().toFile(join(outDir, t.name));
  console.log("wrote", t.name);
}
console.log("done");
