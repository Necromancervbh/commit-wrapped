import { languageOf, isNoise } from './languages.js';

const DAY = 86_400_000;
// A single file changing by more than this in one commit is almost always generated.
const GENERATED_LINES = 5000;

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const toUTC = (d) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
const fromUTC = (t) => new Date(t).toISOString().slice(0, 10);
export const weekdayOf = (d) => new Date(toUTC(d)).getUTCDay();

const AI_TOOLS = [
  ['Claude', /claude|anthropic/i],
  ['Copilot', /copilot/i],
  ['Cursor', /\bcursor\b/i],
  ['Codex', /codex|openai|chatgpt/i],
  ['Gemini', /gemini|google-labs-jules|jules\[bot\]/i],
  ['Devin', /devin-ai|devin ai|devin\.ai/i],
  ['Aider', /\baider\b/i],
  ['Windsurf', /windsurf|codeium/i],
  ['Amazon Q', /amazon[ -]q\b/i],
  ['OpenHands', /openhands/i],
  ['Cline', /\bcline\b/i],
  ['Tabnine', /tabnine/i],
];

const FIX = /\b(fix(es|ed)?|bug(fix)?|hotfix|patch(ed)?)\b/i;
const CONVENTIONAL = /^(feat|fix|chore|docs|refactor|test|tests|perf|style|build|ci|revert)(\([^)]*\))?!?:/i;
const LAZY = /^(wip|fix|fixes|fixed|update|updates|updated|change|changes|stuff|asdf\w*|test|tmp|temp|minor|misc|commit|save|done|ok|oops|more|again|idk|\.+|-+)[.!]*$/i;
const FRUSTRATION = /\b(wtf|ugh+|argh+|damn(it)?|dammit|finally|please work|pls work|hopefully|fml|sigh|shit|fuck\w*|crap|oops)\b/i;
// Touched by every release bump, so they'd always win "most-touched file".
const RELEASE_FILE = /(^|\/)(package\.json|changelog[^/]*\.md|history\.md|version(\.txt)?)$/i;
const EMOJI =/\p{Extended_Pictographic}|:[a-z0-9_+-]+:/u;
const STOPWORDS = new Set(
  'the and for with from into that this when then than are was were has have had not but its it\'s use using via all add adds added more some new'
    .split(' '),
);

export function computeStats(commits, { year, today = new Date() } = {}) {
  const hours = Array(24).fill(0);
  const weekdays = Array(7).fill(0);
  const months = Array(12).fill(0);
  const daily = {};
  const langs = new Map();
  const files = new Map();
  const repos = new Map();
  const words = new Map();
  const timezones = new Set();
  const humans = new Set();
  const aiTools = new Map();
  const lineCounts = [];
  const lazyExamples = new Set();
  const frustrationExamples = new Set();
  const c = { weekend: 0, night: 0, early: 0, office: 0, fridayEvening: 0, ai: 0, fixes: 0, conventional: 0, emoji: 0, lazy: 0, frustrated: 0 };
  let added = 0;
  let deleted = 0;
  let longestMessage = '';

  const sorted = [...commits].sort((a, b) => (a.date + pad(a.hour)).localeCompare(b.date + pad(b.hour)));

  for (const commit of sorted) {
    const wd = weekdayOf(commit.date);
    const h = commit.hour;
    hours[h]++;
    weekdays[wd]++;
    months[+commit.date.slice(5, 7) - 1]++;
    daily[commit.date] = (daily[commit.date] || 0) + 1;
    repos.set(commit.repo, (repos.get(commit.repo) || 0) + 1);
    timezones.add(commit.tz);

    if (wd === 0 || wd === 6) c.weekend++;
    if (h >= 22 || h < 5) c.night++;
    if (h >= 5 && h < 9) c.early++;
    if (wd >= 1 && wd <= 5 && h >= 9 && h < 18) c.office++;
    if (wd === 5 && h >= 17) c.fridayEvening++;

    const subject = commit.subject.trim();
    if (FIX.test(subject)) c.fixes++;
    if (CONVENTIONAL.test(subject)) c.conventional++;
    if (EMOJI.test(subject)) c.emoji++;
    if (LAZY.test(subject)) {
      c.lazy++;
      lazyExamples.add(subject.toLowerCase());
    }
    const f = FRUSTRATION.exec(subject);
    if (f) {
      c.frustrated++;
      frustrationExamples.add(f[0].toLowerCase());
    }
    if (subject.length > longestMessage.length) longestMessage = subject;
    for (const w of subject.replace(CONVENTIONAL, '').toLowerCase().split(/[^a-z0-9']+/)) {
      if (w.length < 3 || STOPWORDS.has(w) || /^\d+$/.test(w)) continue;
      words.set(w, (words.get(w) || 0) + 1);
    }

    let usedAI = false;
    for (const co of commit.coauthors) {
      const tool = AI_TOOLS.find(([, re]) => re.test(co));
      if (tool) {
        usedAI = true;
        aiTools.set(tool[0], (aiTools.get(tool[0]) || 0) + 1);
      } else if (!/\[bot\]|noreply@github\.com/i.test(co)) {
        humans.add(co.toLowerCase().replace(/^.*<|>$/g, ''));
      }
    }
    if (usedAI) c.ai++;

    let lines = 0;
    for (const file of commit.files) {
      const n = file.added + file.deleted;
      if (isNoise(file.path) || n > GENERATED_LINES) continue;
      added += file.added;
      deleted += file.deleted;
      lines += n;
      const lang = languageOf(file.path);
      if (lang) {
        const entry = langs.get(lang.name) || { name: lang.name, color: lang.color, lines: 0 };
        entry.lines += n;
        langs.set(lang.name, entry);
      }
      if (!RELEASE_FILE.test(file.path)) {
        const key = `${commit.repo}\0${file.path}`;
        files.set(key, (files.get(key) || 0) + 1);
      }
    }
    lineCounts.push(lines);
  }

  const total = sorted.length;
  const share = (n) => (total ? n / total : 0);
  const activeDates = Object.keys(daily).sort();
  const langTotal = [...langs.values()].reduce((s, l) => s + l.lines, 0);
  const busiest = activeDates.reduce((best, d) => (daily[d] > (best?.commits ?? 0) ? { date: d, commits: daily[d] } : best), null);

  return {
    year,
    today: fromUTC(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())),
    commits: total,
    activeDays: activeDates.length,
    added,
    deleted,
    longestStreak: longestStreak(activeDates),
    busiestDay: busiest,
    hours,
    weekdays,
    months,
    peakHour: argmax(hours),
    peakWeekday: argmax(weekdays),
    peakMonth: argmax(months),
    daily,
    languages: [...langs.values()]
      .sort((a, b) => b.lines - a.lines)
      .map((l) => ({ ...l, share: langTotal ? l.lines / langTotal : 0 })),
    topFiles: [...files.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, n]) => ({ repo: key.split('\0')[0], path: key.split('\0')[1], commits: n })),
    repos: [...repos.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, n]) => ({ name, commits: n })),
    firstCommit: sorted[0] ? pick(sorted[0]) : null,
    lastCommit: sorted[total - 1] ? pick(sorted[total - 1]) : null,
    shares: {
      weekend: share(c.weekend),
      night: share(c.night),
      early: share(c.early),
      office: share(c.office),
      fixes: share(c.fixes),
      conventional: share(c.conventional),
      ai: share(c.ai),
    },
    counts: { ...c, timezones: timezones.size, collaborators: humans.size },
    aiTools: [...aiTools.entries()].sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, commits: n })),
    linesPerCommit: { median: median(lineCounts), mean: total ? Math.round((added + deleted) / total) : 0 },
    favoriteWord: [...words.entries()].sort((a, b) => b[1] - a[1]).map(([word, count]) => ({ word, count }))[0] ?? null,
    longestMessage,
    lazyExamples: [...lazyExamples].slice(0, 4),
    frustrationExamples: [...frustrationExamples].slice(0, 4),
  };
}

export function longestStreak(dates) {
  let best = { days: 0, start: null, end: null };
  let start = null;
  let prev = null;
  for (const d of dates) {
    const t = toUTC(d);
    if (prev === null || t - prev !== DAY) start = d;
    const days = Math.round((t - toUTC(start)) / DAY) + 1;
    if (days > best.days) best = { days, start, end: d };
    prev = t;
  }
  return best;
}

/** Calendar grid for a year: columns of weeks (Sunday first), each cell { date, count, level, future }. */
export function heatmap(stats) {
  const { year, daily, today } = stats;
  const jan1 = Date.UTC(year, 0, 1);
  const end = Date.UTC(year, 11, 31);
  // Level by percentile rank among active days (ties share the midpoint), so one
  // huge day doesn't wash out the rest and an even year doesn't look faint.
  const counts = Object.values(daily);
  const level = (n) => {
    if (n === 0) return 0;
    let less = 0;
    let equal = 0;
    for (const c of counts) c < n ? less++ : c === n && equal++;
    return Math.min(4, 1 + Math.floor(((less + equal / 2) / counts.length) * 4));
  };
  const weeks = [];
  for (let t = jan1 - new Date(jan1).getUTCDay() * DAY; t <= end; t += 7 * DAY) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const tt = t + i * DAY;
      const date = fromUTC(tt);
      const inYear = tt >= jan1 && tt <= end;
      const count = daily[date] || 0;
      week.push(inYear ? { date, count, level: level(count), future: date > today } : null);
    }
    weeks.push(week);
  }
  return weeks;
}

export function formatHour(h) {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

export function formatDate(d) {
  return `${MONTHS[+d.slice(5, 7) - 1].slice(0, 3)} ${+d.slice(8, 10)}`;
}

const pad = (n) => String(n).padStart(2, '0');
const argmax = (arr) => arr.reduce((best, v, i) => (v > arr[best] ? i : best), 0);
const pick = (c) => ({ date: c.date, subject: c.subject, repo: c.repo });

function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}
