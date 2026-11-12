import { heatmap, formatHour, formatDate, WEEKDAYS, MONTHS } from '../stats.js';

const num = (n) => n.toLocaleString('en-US');
const pct = (x) => `${Math.round(x * 100)}%`;

export function colorEnabled(stream = process.stdout) {
  if ('NO_COLOR' in process.env) return false;
  if ('FORCE_COLOR' in process.env) return process.env.FORCE_COLOR !== '0';
  return Boolean(stream.isTTY) && process.env.TERM !== 'dumb';
}

function painter(on) {
  const wrap = (open, close) => (s) => (on ? `\x1b[${open}m${s}\x1b[${close}m` : String(s));
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return {
    bold: wrap(1, 22),
    dim: wrap(2, 22),
    fg: (hex) => (s) => (on ? `\x1b[38;2;${rgb(hex).join(';')}m${s}\x1b[39m` : String(s)),
    gradient(s, from, to) {
      if (!on) return s;
      const [a, b] = [rgb(from), rgb(to)];
      const chars = [...s];
      return chars
        .map((ch, i) => {
          const k = chars.length > 1 ? i / (chars.length - 1) : 0;
          const c = a.map((v, j) => Math.round(v + (b[j] - v) * k));
          return `\x1b[38;2;${c.join(';')}m${ch}`;
        })
        .join('') + '\x1b[39m';
    },
  };
}

const HEAT = ['#2a2438', '#5b21b6', '#8b5cf6', '#d946ef', '#f9a8d4'];
const HEAT_PLAIN = ['·', '░', '▒', '▓', '█'];
const SPARK = '▁▂▃▄▅▆▇█';

export function renderTerminal(stats, { color = colorEnabled() } = {}) {
  const c = painter(color);
  const pink = c.fg('#f9a8d4');
  const violet = c.fg('#a78bfa');
  const green = c.fg('#4ade80');
  const red = c.fg('#f87171');
  const p = stats.personality;
  const lines = [];
  const add = (s = '') => lines.push(`  ${s}`);
  const label = (s) => c.dim(s.padEnd(13));

  lines.push('');
  add(`${c.bold(c.gradient(`✦ ${stats.year} WRAPPED ✦`, '#a78bfa', '#f472b6'))}  ${c.dim('·')}  ${c.bold(stats.name)}`);
  add();
  add(`${p.emoji}  ${c.bold(pink(p.title))}  ${c.dim(p.tagline)}`);
  add(`   ${wrapText(p.description, 70).join('\n     ')}`);
  add();

  const big = [
    [num(stats.commits), 'commits'],
    [num(stats.activeDays), 'active days'],
    [`${stats.longestStreak.days}-day`, 'streak'],
  ];
  add(`${big.map(([v, l]) => `${c.bold(violet(v))} ${c.dim(l)}`).join('   ')}   ${green(`+${num(stats.added)}`)} ${red(`−${num(stats.deleted)}`)} ${c.dim('lines')}`);
  add();

  // Calendar: one character per day, seven rows.
  const weeks = heatmap(stats);
  let monthRow = '';
  weeks.forEach((week, i) => {
    const first = week.find((d) => d && d.date.endsWith('-01') ) ?? (i === 0 ? week.find(Boolean) : null);
    if (first && monthRow.length <= i) monthRow = monthRow.padEnd(i) + MONTHS[+first.date.slice(5, 7) - 1].slice(0, 3);
  });
  add(c.dim(monthRow));
  for (let d = 0; d < 7; d++) {
    const row = weeks
      .map((week) => {
        const day = week[d];
        if (!day) return ' ';
        if (!color) return day.future ? ' ' : HEAT_PLAIN[day.level];
        return c.fg(day.future ? '#1a1724' : HEAT[day.level])('■');
      })
      .join('');
    add(`${row} ${c.dim(d % 2 ? WEEKDAYS[d].slice(0, 3) : '')}`);
  }
  add();

  const max = Math.max(...stats.hours, 1);
  const spark = stats.hours
    .map((n, h) => {
      const ch = SPARK[Math.min(SPARK.length - 1, Math.floor((n / max) * (SPARK.length - 1) + (n ? 0.999 : 0)))];
      return h === stats.peakHour ? pink(ch) : violet(ch);
    })
    .join('');
  add(`${label('Peak hour')}${c.bold(formatHour(stats.peakHour))} ${c.dim('on')} ${c.bold(`${WEEKDAYS[stats.peakWeekday]}s`)}   ${spark} ${c.dim('0h → 23h')}`);

  if (stats.languages.length) {
    const width = 28;
    let bar = '';
    let used = 0;
    for (const l of stats.languages.slice(0, 5)) {
      const n = Math.round(l.share * width);
      bar += color ? c.fg(l.color)('█'.repeat(n)) : '█'.repeat(n);
      used += n;
    }
    bar += c.dim('░'.repeat(Math.max(0, width - used)));
    const names = stats.languages.slice(0, 4).map((l) => `${color ? c.fg(l.color)('●') : '●'} ${l.name} ${c.dim(pct(l.share))}`);
    add(`${label('Languages')}${bar}  ${names.join('  ')}`);
  }

  if (stats.topFiles.length) {
    const f = stats.topFiles[0];
    const where = stats.repos.length > 1 ? `${f.repo}/` : '';
    add(`${label('Top file')}${c.bold(where + f.path)} ${c.dim(`· ${f.commits} commits`)}`);
  }
  if (stats.repos.length > 1) {
    add(`${label('Top repos')}${stats.repos.slice(0, 3).map((r) => `${c.bold(r.name)} ${c.dim(num(r.commits))}`).join('  ')}${stats.repos.length > 3 ? c.dim(`  +${stats.repos.length - 3} more`) : ''}`);
  }
  add();

  add(c.bold('Fun facts'));
  for (const fact of funFacts(stats)) add(`  ${fact.emoji}  ${fact.text}`);
  if (p.traits.length) {
    add();
    add(`${label('Also')}${p.traits.map((t) => `${t.emoji} ${t.title}`).join(c.dim('  ·  '))}`);
  }
  lines.push('', '');
  return lines.join('\n');
}

/** Short shareable facts; shared by the terminal output and the story page. */
export function funFacts(s) {
  const facts = [];
  if (s.busiestDay) facts.push({ emoji: '📅', text: `Busiest day: ${formatDate(s.busiestDay.date)} with ${s.busiestDay.commits} commits` });
  if (s.counts.ai) facts.push({ emoji: '🤖', text: `${num(s.counts.ai)} commits co-authored with AI (${s.aiTools.map((t) => t.name).join(', ')})` });
  if (s.favoriteWord) facts.push({ emoji: '💬', text: `Favorite word in commit messages: "${s.favoriteWord.word}" (${num(s.favoriteWord.count)}×)` });
  if (s.counts.fridayEvening) facts.push({ emoji: '🚨', text: `${num(s.counts.fridayEvening)} commits on Friday evenings. Bold.` });
  if (s.counts.lazy) facts.push({ emoji: '🫠', text: `${num(s.counts.lazy)} low-effort messages like ${s.lazyExamples.slice(0, 3).map((x) => `"${x}"`).join(', ')}` });
  if (s.counts.frustrated) facts.push({ emoji: '😤', text: `${num(s.counts.frustrated)} commits written in frustration (${s.frustrationExamples.slice(0, 3).map((x) => `"${x}"`).join(', ')})` });
  if (s.counts.collaborators) facts.push({ emoji: '🤝', text: `Paired with ${num(s.counts.collaborators)} human co-author${s.counts.collaborators === 1 ? '' : 's'}` });
  if (s.shares.conventional >= 0.2) facts.push({ emoji: '📐', text: `${pct(s.shares.conventional)} of your commits follow Conventional Commits` });
  if (s.counts.timezones > 1) facts.push({ emoji: '✈️', text: `Committed from ${s.counts.timezones} time zones` });
  return facts.slice(0, 6);
}

function wrapText(s, width) {
  const out = [''];
  for (const word of s.split(' ')) {
    if (out.at(-1) && (out.at(-1) + word).length > width) out.push('');
    out[out.length - 1] += (out.at(-1) ? ' ' : '') + word;
  }
  return out;
}
