import { formatDate } from './stats.js';

const pct = (x) => `${Math.round(x * 100)}%`;
const num = (n) => n.toLocaleString('en-US');

// Each archetype scores >= 1 when it clearly applies; the highest score wins.
export const ARCHETYPES = [
  {
    id: 'cyborg',
    emoji: '🤖',
    title: 'The Cyborg',
    tagline: 'Half human, half pull request.',
    score: (s) => (s.shares.ai / 0.2) * 1.15,
    describe: (s) => `${pct(s.shares.ai)} of your commits were co-authored by AI${s.aiTools[0] ? `, mostly ${s.aiTools[0].name}` : ''}. The future of pair programming is already in your git log.`,
  },
  {
    id: 'night-owl',
    emoji: '🦉',
    title: 'The Night Owl',
    tagline: 'The bugs come out at night. So do you.',
    score: (s) => s.shares.night / 0.3,
    describe: (s) => `${pct(s.shares.night)} of your commits landed between 10 PM and 5 AM. Sleep is for people without merge conflicts.`,
  },
  {
    id: 'early-bird',
    emoji: '🌅',
    title: 'The Early Bird',
    tagline: 'Shipped before the coffee was ready.',
    score: (s) => s.shares.early / 0.25,
    describe: (s) => `${pct(s.shares.early)} of your commits were in before 9 AM. You push code while the rest of the world hits snooze.`,
  },
  {
    id: 'streak-machine',
    emoji: '🔥',
    title: 'The Streak Machine',
    tagline: 'Consistency is a superpower.',
    score: (s) => s.longestStreak.days / 21,
    describe: (s) => `You committed ${s.longestStreak.days} days in a row (${formatDate(s.longestStreak.start)} to ${formatDate(s.longestStreak.end)}). Your contribution graph has no gaps, only ambition.`,
  },
  {
    id: 'weekend-warrior',
    emoji: '⚔️',
    title: 'The Weekend Warrior',
    tagline: 'Rest days are a social construct.',
    score: (s) => s.shares.weekend / 0.35,
    describe: (s) => `${pct(s.shares.weekend)} of your commits happened on Saturdays and Sundays. Your side projects thank you.`,
  },
  {
    id: 'firefighter',
    emoji: '🧯',
    title: 'The Firefighter',
    tagline: 'When prod is on fire, they call you.',
    score: (s) => s.shares.fixes / 0.3,
    describe: (s) => `${pct(s.shares.fixes)} of your commits were fixes. Somebody has to keep the lights on, and this year it was you.`,
  },
  {
    id: 'marie-kondo',
    emoji: '🧹',
    title: 'The Marie Kondo',
    tagline: 'The best code is no code.',
    score: (s) => (s.deleted >= 500 && s.added > 0 ? s.deleted / s.added / 1.1 : 0),
    describe: (s) => `You deleted more than you wrote: -${num(s.deleted)} vs +${num(s.added)} lines. That code did not spark joy.`,
  },
  {
    id: 'architect',
    emoji: '🏗️',
    title: 'The Architect',
    tagline: "You don't push changes, you push continents.",
    score: (s) => (s.commits >= 10 ? s.linesPerCommit.mean / 250 : 0),
    describe: (s) => `Your average commit changed ${num(s.linesPerCommit.mean)} lines. Small PRs are for other people.`,
  },
  {
    id: 'surgeon',
    emoji: '🎯',
    title: 'The Surgeon',
    tagline: 'Small, precise, reviewable.',
    score: (s) => (s.commits >= 100 && s.linesPerCommit.median > 0 ? 12 / s.linesPerCommit.median : 0),
    describe: (s) => `Your median commit changed just ${s.linesPerCommit.median} lines. Code reviewers dream about developers like you.`,
  },
  {
    id: 'polyglot',
    emoji: '🌍',
    title: 'The Polyglot',
    tagline: 'Fluent in everything.',
    score: (s) => s.languages.filter((l) => l.share >= 0.05).length / 5,
    describe: (s) => {
      const names = s.languages.filter((l) => l.share >= 0.05).map((l) => l.name);
      return `You wrote serious amounts of ${names.length} languages: ${names.slice(0, -1).join(', ')} and ${names.at(-1)}. Your brain has a very interesting tokenizer.`;
    },
  },
  {
    id: 'sprinter',
    emoji: '⚡',
    title: 'The Sprinter',
    tagline: 'Zero to shipped in one day.',
    score: (s) => (s.busiestDay ? s.busiestDay.commits / 30 : 0),
    describe: (s) => `On ${formatDate(s.busiestDay.date)} you made ${s.busiestDay.commits} commits in a single day. Whatever happened, we hope it shipped.`,
  },
  {
    id: 'globetrotter',
    emoji: '✈️',
    title: 'The Globetrotter',
    tagline: 'Your code has passport stamps.',
    score: (s) => (s.team ? 0 : s.counts.timezones / 3),
    describe: (s) => `You committed from ${s.counts.timezones} different time zones. Airport Wi-Fi has seen things.`,
  },
  {
    id: 'nine-to-five',
    emoji: '💼',
    title: 'The Professional',
    tagline: 'Work-life balance: achieved.',
    score: (s) => (s.shares.office / 0.75) * 0.95,
    describe: (s) => `${pct(s.shares.office)} of your commits happened Monday to Friday, 9 to 6. When you log off, you actually log off.`,
  },
];

const FALLBACK = {
  id: 'steady-shipper',
  emoji: '📦',
  title: 'The Steady Shipper',
  tagline: 'No drama. Just shipping.',
  describe: (s) => `${num(s.commits)} commits across ${s.activeDays} days. You show up, you ship, you go home. Respect.`,
};

export function personality(stats) {
  const scored = ARCHETYPES.map((a) => ({ a, score: stats.commits ? a.score(stats) || 0 : 0 }))
    .filter((x) => x.score >= 1)
    .sort((x, y) => y.score - x.score);
  const main = scored[0]?.a ?? FALLBACK;
  return {
    id: main.id,
    emoji: main.emoji,
    title: main.title,
    tagline: main.tagline,
    description: main.describe(stats),
    traits: scored.slice(1, 4).map(({ a }) => ({ id: a.id, emoji: a.emoji, title: a.title })),
  };
}
