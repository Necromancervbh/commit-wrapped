import { heatmap, formatHour, WEEKDAYS } from '../stats.js';
import { art } from '../art.js';

export const THEMES = {
  aurora: {
    bg: '#0d0820',
    blobs: ['#7c3aed', '#db2777', '#f59e0b'],
    text: '#ffffff',
    muted: 'rgba(255,255,255,0.62)',
    faint: 'rgba(255,255,255,0.09)',
    accent: '#f9a8d4',
    heat: ['rgba(255,255,255,0.08)', '#5b21b6', '#8b5cf6', '#d946ef', '#f9a8d4'],
  },
  matrix: {
    bg: '#030a06',
    blobs: ['#14532d', '#065f46', '#166534'],
    text: '#e7ffe9',
    muted: 'rgba(200,255,210,0.6)',
    faint: 'rgba(120,255,150,0.08)',
    accent: '#4ade80',
    heat: ['rgba(120,255,150,0.07)', '#14532d', '#15803d', '#22c55e', '#86efac'],
  },
  paper: {
    bg: '#fbfaf7',
    blobs: ['#fde68a', '#fbcfe8', '#bfdbfe'],
    text: '#18181b',
    muted: 'rgba(24,24,27,0.6)',
    faint: 'rgba(24,24,27,0.07)',
    accent: '#db2777',
    heat: ['rgba(24,24,27,0.07)', '#c7d2fe', '#818cf8', '#6366f1', '#4338ca'],
  },
};

const W = 1200;
const H = 630;
const P = 56;
const FONT = `'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif`;

export const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const num = (n) => n.toLocaleString('en-US');
const compact = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1)}k` : num(n));
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** A 1200x630 shareable card. Pure SVG, no scripts or external fonts, so it renders inside a GitHub README. */
export function renderCard(stats, { theme = 'aurora', credit = 'commit-wrapped' } = {}) {
  const t = THEMES[theme] ?? THEMES.aurora;
  const p = stats.personality;
  const out = [];

  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`${stats.name}'s ${stats.year} in code: ${stats.commits} commits, ${p.title}`)}">`);
  out.push('<defs>');
  t.blobs.forEach((c, i) => {
    out.push(`<radialGradient id="b${i}"><stop offset="0" stop-color="${c}" stop-opacity="0.75"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`);
  });
  out.push(`<linearGradient id="hl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${t.heat[2]}"/><stop offset="1" stop-color="${t.heat[4]}"/></linearGradient>`);
  out.push(`<clipPath id="r"><rect width="${W}" height="${H}" rx="28"/></clipPath>`);
  const portrait = art(p.id);
  const ps = 132;
  const px = W - P - ps;
  const py = 34;
  if (portrait) out.push(`<clipPath id="pc"><rect x="${px}" y="${py}" width="${ps}" height="${ps}" rx="24"/></clipPath>`);
  out.push('</defs>');
  out.push(`<g clip-path="url(#r)" font-family="${esc(FONT)}">`);
  out.push(`<rect width="${W}" height="${H}" fill="${t.bg}"/>`);
  out.push(`<circle cx="1080" cy="40" r="420" fill="url(#b0)"/><circle cx="120" cy="640" r="380" fill="url(#b1)"/><circle cx="760" cy="700" r="300" fill="url(#b2)"/>`);

  // Header
  out.push(text(P, 84, `${stats.year} WRAPPED`, { size: 15, fill: t.muted, weight: 700, spacing: 5 }));
  out.push(text(P, 136, clip(stats.name, 22), { size: 46, fill: t.text, weight: 800 }));
  const tx0 = portrait ? px - 24 : W - P;
  out.push(text(tx0, 84, 'CODING PERSONALITY', { size: 15, fill: t.muted, weight: 700, spacing: 5, anchor: 'end' }));
  out.push(text(tx0, 136, portrait ? p.title : `${p.emoji} ${p.title}`, { size: 36, fill: t.accent, weight: 800, anchor: 'end' }));
  if (portrait) {
    out.push(`<image href="${portrait}" x="${px}" y="${py}" width="${ps}" height="${ps}" clip-path="url(#pc)" preserveAspectRatio="xMidYMid slice"/>`);
    out.push(`<rect x="${px}" y="${py}" width="${ps}" height="${ps}" rx="24" fill="none" stroke="${t.accent}" stroke-opacity="0.45" stroke-width="2"/>`);
  }

  // Big numbers
  const big = [
    [compact(stats.commits), 'COMMITS'],
    [num(stats.activeDays), 'ACTIVE DAYS'],
    [`${stats.longestStreak.days}d`, 'LONGEST STREAK'],
    [`+${compact(stats.added)}`, `LINES ADDED · −${compact(stats.deleted)}`],
  ];
  big.forEach(([value, label], i) => {
    const x = P + i * 272;
    out.push(text(x, 248, value, { size: 60, fill: t.text, weight: 800, spacing: -1 }));
    out.push(text(x, 280, label, { size: 14, fill: t.muted, weight: 700, spacing: 2.5 }));
  });

  // Contribution calendar
  const weeks = heatmap(stats);
  const cell = 11;
  const gap = 2;
  const hx = P;
  const hy = 340;
  out.push(text(hx, 324, `${stats.year} IN COMMITS`, { size: 13, fill: t.muted, weight: 700, spacing: 2.5 }));
  weeks.forEach((week, wi) => {
    week.forEach((day, di) => {
      if (!day) return;
      const fill = t.heat[day.level];
      const opacity = day.future ? ' opacity="0.35"' : '';
      out.push(`<rect x="${hx + wi * (cell + gap)}" y="${hy + di * (cell + gap)}" width="${cell}" height="${cell}" rx="2.5" fill="${fill}"${opacity}/>`);
    });
  });

  // Hours histogram
  const max = Math.max(...stats.hours, 1);
  const gx = 812;
  const gw = W - P - gx;
  const bw = gw / 24;
  const gh = 7 * (cell + gap) - gap;
  out.push(text(gx, 324, `PEAK HOUR · ${formatHour(stats.peakHour)} · ${WEEKDAYS[stats.peakWeekday].toUpperCase()}S`, { size: 13, fill: t.muted, weight: 700, spacing: 2.5 }));
  stats.hours.forEach((n, h) => {
    const bh = Math.max(3, (n / max) * gh);
    const fill = h === stats.peakHour ? 'url(#hl)' : t.heat[n ? 2 : 0];
    const opacity = h === stats.peakHour || !n ? '' : ' opacity="0.55"';
    out.push(`<rect x="${(gx + h * bw + 1.5).toFixed(1)}" y="${(hy + gh - bh).toFixed(1)}" width="${(bw - 3).toFixed(1)}" height="${bh.toFixed(1)}" rx="2.5" fill="${fill}"${opacity}/>`);
  });
  [0, 6, 12, 18].forEach((h) => out.push(text(gx + h * bw + 1.5, hy + gh + 18, formatHour(h), { size: 11, fill: t.muted })));

  // Languages
  const ly = 492;
  const langs = stats.languages.slice(0, 5);
  const rest = Math.max(0, 1 - langs.reduce((s, l) => s + l.share, 0));
  out.push(text(P, ly, 'TOP LANGUAGES', { size: 13, fill: t.muted, weight: 700, spacing: 2.5 }));
  out.push(`<clipPath id="lb"><rect x="${P}" y="${ly + 14}" width="${W - 2 * P}" height="12" rx="6"/></clipPath><g clip-path="url(#lb)"><rect x="${P}" y="${ly + 14}" width="${W - 2 * P}" height="12" fill="${t.faint}"/>`);
  let lx = P;
  for (const l of langs) {
    const w = l.share * (W - 2 * P);
    out.push(`<rect x="${lx.toFixed(1)}" y="${ly + 14}" width="${w.toFixed(1)}" height="12" fill="${l.color}"/>`);
    lx += w;
  }
  out.push('</g>');
  let tx = P;
  for (const l of langs) {
    const label = `${l.name} ${Math.round(l.share * 100)}%`;
    if (tx + 18 + label.length * 8.6 > W - P - 110) break;
    out.push(`<circle cx="${tx + 6}" cy="${ly + 50}" r="6" fill="${l.color}"/>`);
    out.push(text(tx + 18, ly + 55, label, { size: 15, fill: t.text, weight: 600 }));
    tx += 34 + label.length * 8.6;
  }
  if (!langs.length) out.push(text(P, ly + 55, 'No source files detected', { size: 15, fill: t.muted }));
  else if (rest > 0.02) out.push(text(tx, ly + 55, `+ ${Math.round(rest * 100)}% other`, { size: 15, fill: t.muted }));

  // Footer
  const repoNote = stats.repos.length > 1 ? `${stats.repos.length} repos · ` : '';
  out.push(text(P, H - 38, `${repoNote}${p.tagline}`, { size: 15, fill: t.muted, weight: 500 }));
  out.push(text(W - P, H - 38, credit, { size: 15, fill: t.muted, weight: 700, anchor: 'end' }));

  out.push('</g></svg>');
  return out.join('\n');
}

function text(x, y, content, { size, fill, weight = 400, spacing = 0, anchor = 'start' }) {
  const attrs = [`x="${typeof x === 'number' ? +x.toFixed(1) : x}"`, `y="${y}"`, `font-size="${size}"`, `font-weight="${weight}"`, `fill="${fill}"`];
  if (spacing) attrs.push(`letter-spacing="${spacing}"`);
  if (anchor !== 'start') attrs.push(`text-anchor="${anchor}"`);
  return `<text ${attrs.join(' ')}>${esc(content)}</text>`;
}
