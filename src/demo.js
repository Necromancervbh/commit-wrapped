// Deterministic sample data so anyone can try commit-wrapped (and so the README has a real card).

const FILES = [
  ['web', 'src/app/page.tsx', 30], ['web', 'src/components/Editor.tsx', 22], ['web', 'src/lib/sync.ts', 18],
  ['web', 'src/styles/globals.css', 8], ['web', 'README.md', 5],
  ['engine', 'src/parser.rs', 20], ['engine', 'src/eval.rs', 16], ['engine', 'Cargo.toml', 3],
  ['ml-notebooks', 'train.py', 12], ['ml-notebooks', 'data/loader.py', 7],
  ['cli', 'cmd/root.go', 9], ['cli', 'internal/config.go', 6],
  ['web', '.github/workflows/ci.yml', 3],
];
const SUBJECTS = [
  'feat(editor): add multi-cursor support', 'fix: race condition in sync queue', 'refactor parser into smaller passes',
  'fix flaky test', 'wip', 'Add dark mode', 'perf: cache tokenizer output', 'fix typo', 'finally fix the build',
  'feat: offline mode', 'chore: bump deps', 'update', 'fix: handle empty files', 'docs: explain plugin API',
  'please work', 'Rewrite eval loop', 'feat(cli): add --json output', 'fix: memory leak in watcher', '🚀 release v2.0',
];

function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function demoCommits(year) {
  const r = rng(year);
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const weighted = (arr) => {
    const total = arr.reduce((s, x) => s + x[2], 0);
    let k = r() * total;
    return arr.find((x) => (k -= x[2]) < 0) ?? arr[0];
  };
  const commits = [];
  for (let t = Date.UTC(year, 0, 1); t <= Date.UTC(year, 11, 31); t += 86_400_000) {
    const day = new Date(t);
    const date = day.toISOString().slice(0, 10);
    const weekend = day.getUTCDay() % 6 === 0;
    // A long streak in spring, a quiet August, busier weekends than is healthy.
    const inStreak = date >= `${year}-03-02` && date <= `${year}-03-27`;
    const quiet = date.slice(5, 7) === '08';
    if (!inStreak && r() < (quiet ? 0.82 : weekend ? 0.2 : 0.35)) continue;
    const n = date === `${year}-06-14` ? 41 : 1 + Math.floor(r() * r() * (weekend ? 9 : 7));
    for (let i = 0; i < n; i++) {
      const hour = r() < 0.48 ? [22, 23, 23, 0, 1, 2][Math.floor(r() * 6)] : 10 + Math.floor(r() * 11);
      const [repo, path] = weighted(FILES);
      const files = [{ path, added: Math.floor(r() * r() * 160) + 1, deleted: Math.floor(r() * r() * 70) }];
      if (r() < 0.35) {
        const [, p2] = weighted(FILES.filter((f) => f[0] === repo));
        files.push({ path: p2, added: Math.floor(r() * 40), deleted: Math.floor(r() * 25) });
      }
      const coauthors = [];
      if (date >= `${year}-05-01` && r() < 0.24) coauthors.push(pick(['Claude <noreply@anthropic.com>', 'Claude <noreply@anthropic.com>', 'Copilot <copilot@github.com>']));
      if (r() < 0.04) coauthors.push(pick(['Sam Lee <sam@example.com>', 'Priya N <priya@example.com>']));
      commits.push({
        repo,
        hash: `${date}-${i}`,
        name: 'Alex Rivera',
        email: 'alex@example.com',
        date,
        hour,
        tz: date >= `${year}-09-20` && date <= `${year}-09-27` ? '+09:00' : '-07:00',
        subject: pick(SUBJECTS),
        coauthors,
        files,
      });
    }
  }
  return commits;
}
