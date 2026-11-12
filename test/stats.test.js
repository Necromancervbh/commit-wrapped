import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLog, resolveRename } from '../src/git.js';
import { computeStats, longestStreak, heatmap, formatHour } from '../src/stats.js';
import { personality, ARCHETYPES } from '../src/personality.js';
import { art } from '../src/art.js';
import { languageOf, isNoise } from '../src/languages.js';
import { renderCard } from '../src/render/svg.js';
import { renderStory } from '../src/render/html.js';
import { renderTerminal } from '../src/render/terminal.js';
import { demoCommits } from '../src/demo.js';

const commit = (date, hour, extra = {}) => ({
  repo: 'app',
  hash: `${date}-${hour}-${Math.random()}`,
  name: 'Ada',
  email: 'ada@example.com',
  date,
  hour,
  tz: '+00:00',
  subject: 'feat: add things',
  coauthors: [],
  files: [{ path: 'src/index.ts', added: 10, deleted: 2 }],
  ...extra,
});

test('parseLog reads fields, numstat, binary files and trailers', () => {
  const RS = '\x1e';
  const US = '\x1f';
  const out =
    `${RS}abc${US}Ada${US}ada@example.com${US}2026-03-04T23:12:01+05:30${US}fix: it${US}Claude <noreply@anthropic.com>\x1dBob <bob@x.io>${US}\n\n` +
    `12\t3\tsrc/a.ts\n-\t-\timg/logo.png\n4\t0\tsrc/{old => new}/b.ts\n` +
    `${RS}def${US}Ada${US}ada@example.com${US}2026-03-05T08:00:00-07:00${US}docs${US}${US}\n`;
  const [a, b] = parseLog(out, 'repo');
  assert.equal(a.hash, 'abc');
  assert.equal(a.date, '2026-03-04');
  assert.equal(a.hour, 23);
  assert.equal(a.tz, '+05:30');
  assert.deepEqual(a.coauthors, ['Claude <noreply@anthropic.com>', 'Bob <bob@x.io>']);
  assert.deepEqual(a.files, [
    { path: 'src/a.ts', added: 12, deleted: 3 },
    { path: 'img/logo.png', added: 0, deleted: 0 },
    { path: 'src/new/b.ts', added: 4, deleted: 0 },
  ]);
  assert.equal(b.hour, 8);
  assert.deepEqual(b.files, []);
  assert.deepEqual(b.coauthors, []);
});

test('resolveRename handles brace and plain renames', () => {
  assert.equal(resolveRename('src/{a => b}/x.js'), 'src/b/x.js');
  assert.equal(resolveRename('src/{ => lib}/x.js'), 'src/lib/x.js');
  assert.equal(resolveRename('src/{lib => }/x.js'), 'src/x.js');
  assert.equal(resolveRename('old.md => new.md'), 'new.md');
  assert.equal(resolveRename('plain.txt'), 'plain.txt');
});

test('longestStreak finds consecutive days across month boundaries', () => {
  assert.deepEqual(longestStreak([]), { days: 0, start: null, end: null });
  assert.deepEqual(longestStreak(['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-03']), {
    days: 3,
    start: '2026-01-30',
    end: '2026-02-01',
  });
});

test('computeStats counts rhythm, lines, languages and AI co-authors', () => {
  const s = computeStats(
    [
      commit('2026-01-03', 23, { coauthors: ['Claude <noreply@anthropic.com>'] }), // Saturday night
      commit('2026-01-04', 1, { subject: 'fix: crash', files: [{ path: 'package-lock.json', added: 9000, deleted: 10 }] }),
      commit('2026-01-05', 10, { files: [{ path: 'lib/a.py', added: 5, deleted: 5 }] }),
      commit('2026-01-05', 11, { subject: 'wip' }),
    ],
    { year: 2026, today: new Date(2026, 11, 31) },
  );
  assert.equal(s.commits, 4);
  assert.equal(s.activeDays, 3);
  assert.equal(s.longestStreak.days, 3);
  assert.deepEqual(s.busiestDay, { date: '2026-01-05', commits: 2 });
  assert.equal(s.added, 25); // lockfile ignored
  assert.equal(s.deleted, 9);
  assert.equal(s.languages[0].name, 'TypeScript');
  assert.equal(s.languages[1].name, 'Python');
  assert.equal(s.counts.ai, 1);
  assert.deepEqual(s.aiTools, [{ name: 'Claude', commits: 1 }]);
  assert.equal(s.counts.weekend, 2);
  assert.equal(s.counts.night, 2);
  assert.equal(s.counts.lazy, 1);
  assert.equal(s.counts.fixes, 1);
  assert.equal(s.topFiles[0].path, 'src/index.ts');
});

test('heatmap lays out a full year in Sunday-first weeks', () => {
  const s = computeStats([commit('2026-01-01', 12)], { year: 2026, today: new Date(2026, 5, 1) });
  const weeks = heatmap(s);
  const days = weeks.flat().filter(Boolean);
  assert.equal(days.length, 365);
  assert.equal(weeks[0][4].date, '2026-01-01'); // a Thursday
  assert.equal(weeks[0][4].level, 3);
  assert.equal(days.at(-1).future, true);
});

test('personality picks the strongest archetype', () => {
  const nights = Array.from({ length: 20 }, (_, i) => commit(`2026-02-${String(i + 1).padStart(2, '0')}`, 2));
  const s = computeStats(nights, { year: 2026 });
  s.name = 'Ada';
  assert.equal(personality(s).id, 'night-owl');
  assert.equal(personality(computeStats([commit('2026-02-03', 14)], { year: 2026 })).id, 'nine-to-five');
});

test('languages and noise detection', () => {
  assert.equal(languageOf('a/b/Component.tsx').name, 'TypeScript');
  assert.equal(languageOf('Dockerfile').name, 'Dockerfile');
  assert.equal(languageOf('LICENSE'), null);
  assert.ok(isNoise('web/package-lock.json'));
  assert.ok(isNoise('node_modules/x/index.js'));
  assert.ok(isNoise('public/app.min.js'));
  assert.ok(!isNoise('src/distance.ts'));
});

test('every personality has character art', () => {
  for (const id of [...ARCHETYPES.map((a) => a.id), 'steady-shipper', 'mascot', 'team']) {
    assert.match(art(id) ?? '', /^data:image\/webp;base64,/, id);
  }
});

test('formatHour', () => {
  assert.deepEqual([0, 9, 12, 23].map(formatHour), ['12 AM', '9 AM', '12 PM', '11 PM']);
});

test('renderers escape user content and produce complete documents', () => {
  const s = computeStats(demoCommits(2025), { year: 2025, today: new Date(2025, 11, 31) });
  s.name = '<script>alert(1)</script>';
  s.personality = personality(s);
  const card = renderCard(s);
  assert.ok(card.startsWith('<svg') && card.endsWith('</svg>'));
  assert.ok(!card.includes('<script>'));
  const html = renderStory(s, { card, command: 'npx commit-wrapped', repoUrl: 'https://example.com' });
  assert.ok(!html.includes('<script>alert'));
  assert.ok(html.includes('"commits":'));
  assert.ok(renderTerminal(s, { color: false }).includes('commits'));
});
