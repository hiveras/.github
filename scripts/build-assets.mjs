// Builds the profile SVGs (banner + Kiko Nova card, light and dark). Run:
//   node scripts/build-assets.mjs
// All text is outlined to paths with fontkit, so the SVGs need no web fonts and
// contain no scripts. Brand sources:
//   Hiveras:   website-hiveras/src/styles/colors_and_type.css, scripts/build-assets.mjs, src/i18n/en.js
//   Kiko Nova: kikonova/app/public/icons/icon.svg, src/theme/theme.ts, design/canvas/Main.dc.html
// Tooling and fonts are borrowed from those two checkouts (paths below, override with env vars).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Paths to local checkouts of the Hiveras website and the Kiko Nova app (brand sources).
const HIVERAS_SITE = process.env.HIVERAS_SITE;
const KIKO_APP = process.env.KIKO_APP;
if (!HIVERAS_SITE || !KIKO_APP) {
  console.error('Set HIVERAS_SITE and KIKO_APP to local checkouts of the website and the app.');
  process.exit(1);
}
const require = createRequire(path.join(HIVERAS_SITE, 'package.json'));
const fontkit = require('fontkit');
const wawoff2 = require('wawoff2');

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = (rel, data) => {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), data);
};
const f2 = (n) => Math.round(n * 100) / 100;
const load = async (file, axes) =>
  fontkit.create(Buffer.from(await wawoff2.decompress(fs.readFileSync(file)))).getVariation(axes);

// ---------- fonts ----------
const hf = (f) => path.join(HIVERAS_SITE, 'src/assets/fonts', f);
const kf = (pkg, f) => path.join(KIKO_APP, 'node_modules/@fontsource-variable', pkg, 'files', f);
const sg = await load(hf('space-grotesk-latin-wght-normal.woff2'), { wght: 700 });
const frN = await load(hf('fraunces-latin-opsz-normal.woff2'), { wght: 400, opsz: 144 });
const frI = await load(hf('fraunces-latin-opsz-italic.woff2'), { wght: 400, opsz: 144 });
const inter = await load(hf('inter-latin-wght-normal.woff2'), { wght: 500 });
const brico = await load(kf('bricolage-grotesque', 'bricolage-grotesque-latin-standard-normal.woff2'), { wght: 800, opsz: 48, wdth: 100 });
const bricoB = await load(kf('bricolage-grotesque', 'bricolage-grotesque-latin-standard-normal.woff2'), { wght: 700, opsz: 24, wdth: 100 });
const dm = await load(kf('dm-sans', 'dm-sans-latin-wght-normal.woff2'), { wght: 400 });
const dmM = await load(kf('dm-sans', 'dm-sans-latin-wght-normal.woff2'), { wght: 600 });
const dmB = await load(kf('dm-sans', 'dm-sans-latin-wght-normal.woff2'), { wght: 700 });

// Glyphs are defined once per SVG in <defs> and placed with <use>, so repeated letters cost a few bytes.
// Call resetGlyphs() before each SVG and put glyphDefs() in its <defs>.
let glyphs = new Map();
const resetGlyphs = () => { glyphs = new Map(); };
const glyphDefs = () => [...glyphs.values()].map((g) => `<path id="${g.id}" d="${g.d}"/>`).join('');
const fontId = new Map();
function glyphRef(font, g) {
  if (!fontId.has(font)) fontId.set(font, fontId.size);
  const key = `${fontId.get(font)}-${g.id}`;
  if (!glyphs.has(key)) glyphs.set(key, { id: `g${glyphs.size}`, d: round(g.path.toSVG()) });
  return glyphs.get(key).id;
}
function text(font, str, size, x, y, fill, { tracking = 0 } = {}) {
  const run = font.layout(str, ['kern', 'liga']);
  const s = size / font.unitsPerEm;
  let cx = 0;
  let uses = '';
  run.glyphs.forEach((g, i) => {
    const p = run.positions[i];
    if (g.path.commands.length) uses += `<use href="#${glyphRef(font, g)}" x="${Math.round(cx + p.xOffset)}"/>`;
    cx += p.xAdvance + tracking / s;
  });
  const width = cx * s;
  const svg = uses ? `<g fill="${fill}" transform="translate(${f2(x)} ${f2(y)}) scale(${+s.toFixed(5)} ${-s.toFixed(5)})">${uses}</g>` : '';
  return { svg, width };
}
const round = (d) => d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n))));
const widthOf = (font, str, size) => (font.layout(str, ['kern', 'liga']).positions.reduce((a, p) => a + p.xAdvance, 0) * size) / font.unitsPerEm;
// Greedy word wrap.
function wrap(font, str, size, maxW) {
  const lines = [];
  let cur = '';
  for (const w of str.split(' ')) {
    const t = cur ? `${cur} ${w}` : w;
    if (cur && widthOf(font, t, size) > maxW) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------- Hiveras ----------
const H = { paper: '#F5F0E8', ink: '#1A1A1A', ink3: '#6B6557', warm2: '#D6CDB8', purple: '#934AE2', blue: '#0077EB' };

// HIVΣRAS wordmark, same construction as website-hiveras/scripts/build-assets.mjs (Space Grotesk has no sigma).
function wordmark() {
  const tracking = 70;
  let x = 0;
  let d = '';
  const poly = (x0, pts) => {
    const area = pts.reduce((a, [p, q], i) => a + p * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * q, 0);
    const o = area < 0 ? [...pts].reverse() : pts;
    return 'M' + o.map(([p, q]) => `${f2(x0 + p)} ${f2(q)}`).join('L') + 'Z';
  };
  for (const ch of 'HIVΣRAS') {
    if (ch === 'Σ') {
      const x0 = x + 40, w = 540, h = 700, tb = 108, sd = 150, xa = 340;
      d += poly(x0, [[0, 0], [w, 0], [w, tb], [0, tb]]) + poly(x0, [[0, h - tb], [w, h - tb], [w, h], [0, h]]) +
        poly(x0, [[0, h], [sd, h], [xa + sd / 2, h / 2], [xa - sd / 2, h / 2]]) + poly(x0, [[xa - sd / 2, h / 2], [xa + sd / 2, h / 2], [sd, 0], [0, 0]]);
      x += 540 + 80 + tracking;
      continue;
    }
    const g = sg.glyphForCodePoint(ch.codePointAt(0));
    d += g.path.translate(x, 0).toSVG();
    x += g.advanceWidth + tracking;
  }
  return { d: round(d), width: x - tracking };
}
const wm = wordmark();
const mark = (cx, cy, s, dot) => `<circle cx="${cx}" cy="${cy}" r="${f2(3 * s)}" fill="${dot}"/><circle cx="${cx}" cy="${cy}" r="${f2(10 * s)}" fill="none" stroke="${H.purple}" stroke-width="${f2(s)}"/><circle cx="${cx}" cy="${cy}" r="${f2(18.5 * s)}" fill="none" stroke="${H.blue}" stroke-width="${f2(0.5 * s)}"/>`;

function banner(mode) {
  resetGlyphs();
  const dark = mode === 'dark';
  const bg = dark ? H.ink : H.paper;
  const fg = dark ? H.paper : H.ink;
  const sub = dark ? H.warm2 : H.ink3;
  const W = 1200, Hh = 300;
  // Logo row
  const wmSize = 34;
  const logo = `${mark(92, 78, 1.9, fg)}<path fill="${fg}" transform="translate(150 ${f2(78 + (700 / 1000) * wmSize / 2)}) scale(${wmSize / 1000} ${-wmSize / 1000})" d="${wm.d}"/>`;
  // Tagline from the website hero (en.js): "Your business runs on your *own* software."
  const size = 52;
  let x = 56;
  const y = 192;
  let tag = '';
  for (const [str, it] of [['Your business runs on your ', false], ['own', true], [' software.', false]]) {
    const r = text(it ? frI : frN, str, size, x, y, fg);
    tag += r.svg;
    x += r.width;
  }
  const line = text(inter, 'Custom software for SMEs. Built in Belgium, hosted in Europe.', 22, 58, 244, sub).svg;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Hiveras. Your business runs on your own software.">
<defs>${glyphDefs()}<radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${H.purple}" stop-opacity="${dark ? 0.22 : 0.16}"/><stop offset="1" stop-color="${H.purple}" stop-opacity="0"/></radialGradient></defs>
<rect width="${W}" height="${Hh}" rx="12" fill="${bg}"/>
<circle cx="1060" cy="40" r="360" fill="url(#g)"/>
<g opacity="${dark ? 0.5 : 0.35}">${mark(1040, 150, 6.2, 'none')}</g>
${logo}
${tag}
${line}
</svg>
`;
}

// ---------- Kiko Nova ----------
const K = {
  dark: { page: '#0E0F12', surface: '#16181D', raised: '#1B1D22', ink: '#F4F5F0', muted: '#B9BCC4', line: '#2A2D35', accent: '#8B7CFF', accentink: '#C9C1FF', primaryink: '#C6F432' },
  light: { page: '#F6F7F2', surface: '#FFFFFF', raised: '#ECEEE4', ink: '#0E0F12', muted: '#454952', line: '#D8DBD0', accent: '#5B4BEE', accentink: '#3B2DB8', primaryink: '#4D6900' },
};
const LIME = '#C6F432', VIOLET = '#8B7CFF', NIGHT = '#0E0F12';

// App icon, verbatim geometry from kikonova/app/public/icons/icon.svg, in a rounded tile.
const iconInner = `<rect width="100" height="100" fill="${VIOLET}"/><g transform="translate(-13.816 1.129) scale(1.0984)"><path d="M28 24 L44 44 L56 44 L72 24 L71 58 L50 80 L29 58 Z" fill="${NIGHT}"/><path d="M40 58 L50 65 L60 58" fill="none" stroke="${VIOLET}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><path d="M78 14 L80 20 L86 22 L80 24 L78 30 L76 24 L70 22 L76 20 Z" fill="${LIME}"/></g>`;
const iconTile = (x, y, size, id) => `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${f2(size * 0.22)}"/></clipPath><g clip-path="url(#${id})"><g transform="translate(${x} ${y}) scale(${size / 100})">${iconInner}</g></g>`;

// Phone mock of the exercise card, from design/canvas/Main.dc.html (board copy, no pupil data). Always the dark brand.
function phone(px, py) {
  const w = 250, h = 400, d = K.dark;
  let s = `<g transform="translate(${px} ${py})">`;
  s += `<rect x="-6" y="-6" width="${w + 12}" height="${h + 12}" rx="38" fill="#2A2D35"/>`;
  s += `<clipPath id="ph"><rect width="${w}" height="${h}" rx="32"/></clipPath><g clip-path="url(#ph)">`;
  s += `<rect width="${w}" height="${h}" fill="${d.page}"/><circle cx="${w + 10}" cy="-10" r="130" fill="${VIOLET}" opacity="0.16"/>`;
  // progress segments
  for (let i = 0; i < 5; i++) s += `<rect x="${16 + i * 45}" y="22" width="41" height="3" rx="1.5" fill="${i < 2 ? LIME : '#3A3D45'}"/>`;
  s += `<rect x="16" y="38" width="128" height="24" rx="12" fill="${d.raised}"/>` + text(dmM, 'Vergelijkingen · 3 van 5', 10.5, 26, 54, d.muted).svg;
  s += text(dmM, 'LOS OP', 11, 16, 104, LIME, { tracking: 1.3 }).svg;
  s += text(brico, '5x − 7 = 2x + 2', 30, 16, 142, d.ink).svg;
  wrap(dm, 'Breng de termen met x naar het ene lid.', 11.5, w - 32).forEach((l, i) => {
    s += text(dm, l, 11.5, 16, 166 + i * 15, '#9DA1AA').svg;
  });
  // the calm wrong-answer card
  s += `<rect x="12" y="226" width="${w - 24}" height="68" rx="14" fill="#23202F" stroke="${VIOLET}"/>`;
  s += text(dmB, 'Nog niet juist.', 12.5, 24, 248, d.accentink).svg;
  wrap(dm, 'Het linkerlid en het rechterlid moeten gelijk zijn: vul x = 5 in en reken na.', 10.5, w - 48).forEach((l, i) => {
    s += text(dm, l, 10.5, 24, 267 + i * 14, '#D4D6DB').svg;
  });
  // answer field + check button
  s += `<rect x="12" y="306" width="${w - 24}" height="40" rx="14" fill="${d.surface}" stroke="${d.line}"/>`;
  s += text(bricoB, 'x =', 18, 26, 333, '#9DA1AA').svg + text(brico, '5', 22, 62, 334, d.ink).svg;
  s += `<rect x="12" y="354" width="${w - 24}" height="34" rx="12" fill="${LIME}"/>` + text(dmB, 'Check', 13, w / 2 - widthOf(dmB, 'Check', 13) / 2, 376, NIGHT).svg;
  s += `</g></g>`;
  return s;
}

function kikoCard(mode) {
  resetGlyphs();
  const c = K[mode];
  const W = 1200, Hh = 480;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Kiko Nova, coming soon. Maths practice that follows the curriculum, explains your mistakes and keeps your progress on your phone.">`;
  s += `<rect x="0.5" y="0.5" width="${W - 1}" height="${Hh - 1}" rx="20" fill="${c.page}" stroke="${c.line}"/>`;
  s += `<circle cx="${W - 160}" cy="0" r="320" fill="${VIOLET}" opacity="${mode === 'dark' ? 0.14 : 0.1}"/>`;
  s += iconTile(56, 56, 112, `ic-${mode}`);
  s += text(brico, 'Kiko Nova', 60, 196, 126, c.ink).svg;
  // coming soon pill: lime fill with night ink (the app's primary pairing)
  const pill = 'Coming soon';
  const pw = widthOf(dmB, pill, 17) + 32;
  s += `<rect x="198" y="146" width="${f2(pw)}" height="32" rx="16" fill="${LIME}"/>` + text(dmB, pill, 17, 214, 168, NIGHT).svg;
  // tagline in Kiko's voice
  wrap(dm, 'Maths practice that follows the curriculum, explains your mistakes and keeps your progress on your phone.', 28, 700).forEach((l, i) => {
    s += text(dm, l, 28, 56, 240 + i * 38, c.ink).svg;
  });
  // facts
  const facts = ['For Flemish secondary pupils', 'No ads, no loot boxes, no streak pressure', 'Progress stays on the device'];
  facts.forEach((f, i) => {
    const y = 382 + i * 30;
    s += `<path d="M58 ${y - 6} l5 5 l10 -11" fill="none" stroke="${c.primaryink}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += text(dmM, f, 19, 86, y, c.muted).svg;
  });
  s += phone(W - 320, 40);
  s += `</svg>\n`;
  return s.replace(/(<svg[^>]*>)/, `$1<defs>${glyphDefs()}</defs>`);
}

for (const m of ['light', 'dark']) {
  out(`profile/assets/banner-${m}.svg`, banner(m));
  out(`profile/assets/kikonova/card-${m}.svg`, kikoCard(m));
}
out('profile/assets/kikonova/icon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Kiko Nova">${iconInner}</svg>\n`);
console.log('assets written');
