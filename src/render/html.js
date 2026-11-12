import fs from 'node:fs';
import { heatmap, formatHour, formatDate, WEEKDAYS, MONTHS } from '../stats.js';
import { funFacts } from './terminal.js';
import { esc } from './svg.js';

const asset = (name) => fs.readFileSync(new URL(`./story/${name}`, import.meta.url), 'utf8');

/** A single self-contained HTML file: an animated "story" of the year, ending on the shareable card. */
export function renderStory(stats, { card, command, repoUrl }) {
  const view = storyView(stats, { card, command, repoUrl });
  const json = JSON.stringify(view).replace(/</g, '\\u003c');
  const title = `${stats.name}'s ${stats.year} Wrapped`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(`${stats.commits} commits, ${stats.activeDays} active days, ${stats.personality.title}. Made with commit-wrapped.`)}">
<style>
${asset('story.css')}
</style>
</head>
<body>
<div class="backdrop"></div>
<main id="story" aria-label="${esc(title)}"></main>
<noscript><p style="padding:24px">This story needs JavaScript. The card is in the .svg file next to this page.</p></noscript>
<script id="data" type="application/json">${json}</script>
<script>
${asset('client.js')}
</script>
</body>
</html>
`;
}

export function storyView(s, { card, command, repoUrl }) {
  const weeks = heatmap(s);
  const busiest = s.busiestDay;
  return {
    year: s.year,
    name: s.name,
    firstName: s.name.split(/\s+/)[0] || s.name,
    commits: s.commits,
    activeDays: s.activeDays,
    perDay: s.activeDays ? (s.commits / s.activeDays).toFixed(1) : '0',
    repos: s.repos,
    busiest: busiest && busiest.commits > 1
      ? { weekday: WEEKDAYS[new Date(`${busiest.date}T00:00:00Z`).getUTCDay()], label: `${MONTHS[+busiest.date.slice(5, 7) - 1]} ${+busiest.date.slice(8, 10)}`, commits: busiest.commits }
      : null,
    hours: s.hours,
    peakHourIndex: s.peakHour,
    peakHour: formatHour(s.peakHour),
    peakWeekday: WEEKDAYS[s.peakWeekday],
    hourNote: hourNote(s),
    streak: {
      days: s.longestStreak.days,
      from: s.longestStreak.start ? formatDate(s.longestStreak.start) : '',
      to: s.longestStreak.end ? formatDate(s.longestStreak.end) : '',
    },
    // -1: outside the year, 0-4: activity level, 5: still in the future
    heat: weeks.map((week) => week.map((d) => (!d ? -1 : d.future ? 5 : d.level))),
    languageCount: s.languages.length,
    languages: s.languages.slice(0, 5).map(({ name, color, share }) => ({ name, color, share })),
    added: s.added,
    deleted: s.deleted,
    linesQuip: linesQuip(s),
    topFile: s.topFiles[0] ?? null,
    topFiles: s.topFiles.slice(1, 5),
    ai: { commits: s.counts.ai, share: s.shares.ai, tools: s.aiTools },
    facts: funFacts(s).filter((f) => !f.text.startsWith('Busiest day') && !f.text.includes('co-authored with AI')),
    personality: s.personality,
    card,
    command,
    repoUrl,
  };
}

function hourNote(s) {
  if (s.shares.night >= 0.25) return `${Math.round(s.shares.night * 100)}% of your commits happened after 10 PM.`;
  if (s.shares.early >= 0.2) return `${Math.round(s.shares.early * 100)}% of your commits happened before 9 AM.`;
  if (s.shares.office >= 0.6) return `Mostly business hours. Very responsible.`;
  return `Your commits were spread across the whole day.`;
}

function linesQuip(s) {
  const net = s.added - s.deleted;
  if (net < 0) return `You left the codebase ${(-net).toLocaleString('en-US')} lines smaller than you found it. Legendary.`;
  const pages = Math.round(s.added / 50);
  if (pages >= 2) return `Printed out, that's about ${pages.toLocaleString('en-US')} pages. Please don't print it out.`;
  return 'Quality over quantity.';
}
