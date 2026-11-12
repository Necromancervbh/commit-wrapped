import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';
import { findRepos, getIdentity, readCommits } from './git.js';
import { computeStats } from './stats.js';
import { personality } from './personality.js';
import { demoCommits } from './demo.js';
import { renderTerminal, colorEnabled } from './render/terminal.js';
import { renderCard, THEMES } from './render/svg.js';
import { renderStory } from './render/html.js';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const REPO_URL = 'https://github.com/Necromancervbh/commit-wrapped';
const COMMAND = 'npx commit-wrapped';

const HELP = `
  commit-wrapped ${pkg.version}
  Your year in code, wrapped. Runs 100% locally.

  Usage
    $ commit-wrapped [paths...] [options]

    paths are git repos, or folders to search for repos (default: current directory)

  Options
    -y, --year <year>      Year to wrap (default: this year)
    -a, --author <text>    Count commits whose author name or email contains <text>.
                           Repeatable. Default: your git user.name and user.email
    -e, --everyone         Count every author (a team or project wrapped)
    -n, --name <name>      Name to show on the card
    -o, --out <dir>        Where to save the .html story, .svg card and .json
                           (default: a temp folder)
    -t, --theme <theme>    Card theme: ${Object.keys(THEMES).join(', ')} (default: aurora)
    -d, --depth <n>        How deep to search folders for repos (default: 3)
        --json             Print the raw stats as JSON
        --demo             Use sample data instead of your repos
        --no-open          Don't open the story in your browser
        --no-color         Disable colors
    -h, --help             Show this help
    -v, --version          Show the version

  Examples
    $ commit-wrapped                     # the repo you're in
    $ commit-wrapped ~/code              # every repo under ~/code, combined
    $ commit-wrapped -y 2025 -o .        # last year, saved here
    $ commit-wrapped --everyone          # the whole team's year
`;

export async function main(argv) {
  let args;
  try {
    args = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        year: { type: 'string', short: 'y' },
        author: { type: 'string', short: 'a', multiple: true },
        everyone: { type: 'boolean', short: 'e' },
        name: { type: 'string', short: 'n' },
        out: { type: 'string', short: 'o' },
        theme: { type: 'string', short: 't', default: 'aurora' },
        depth: { type: 'string', short: 'd', default: '3' },
        json: { type: 'boolean' },
        demo: { type: 'boolean' },
        'no-open': { type: 'boolean' },
        'no-color': { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
      },
    });
  } catch (err) {
    return fail(`${err.message}\n  Run commit-wrapped --help for usage.`);
  }
  const { values: opts, positionals } = args;
  if (opts.help) return void process.stdout.write(HELP);
  if (opts.version) return void console.log(pkg.version);

  const color = !opts['no-color'] && colorEnabled();
  const now = new Date();
  const year = opts.year ? Number(opts.year) : now.getFullYear();
  if (!Number.isInteger(year) || year < 1970 || year > now.getFullYear()) return fail(`--year must be a year between 1970 and ${now.getFullYear()}`);
  if (!THEMES[opts.theme]) return fail(`Unknown theme "${opts.theme}". Try one of: ${Object.keys(THEMES).join(', ')}`);
  const depth = Number(opts.depth);
  if (!Number.isInteger(depth) || depth < 0) return fail('--depth must be a whole number');

  let commits;
  let name = opts.name;
  let today = now;
  const warnings = [];

  if (opts.demo) {
    commits = demoCommits(year);
    name ??= 'Alex Rivera';
    today = new Date(year, 11, 31);
  } else {
    let repos;
    try {
      repos = await findRepos(positionals.length ? positionals : ['.'], depth);
    } catch (err) {
      return fail(err.code === 'ENOENT' ? 'git is not installed or not on your PATH.' : err.message);
    }
    if (!repos.length) return fail(`No git repositories found in ${positionals.join(', ') || 'the current directory'}. Pass a repo or a folder of repos.`);

    let match = () => true;
    let authors = [];
    if (opts.author?.length) {
      authors = opts.author;
      const needles = authors.map((a) => a.toLowerCase());
      match = (c) => needles.some((n) => c.name.toLowerCase().includes(n) || c.email.toLowerCase().includes(n));
    } else if (!opts.everyone) {
      const ids = await Promise.all(repos.slice(0, 20).map(getIdentity));
      const names = new Set(ids.map((i) => i.name.toLowerCase()).filter(Boolean));
      const emails = new Set(ids.map((i) => i.email.toLowerCase()).filter(Boolean));
      if (!names.size && !emails.size) return fail("Couldn't tell who you are: git user.name and user.email are not set.\n  Pass --author <you@example.com>, or --everyone for all authors.");
      authors = [...names, ...emails];
      match = (c) => emails.has(c.email.toLowerCase()) || names.has(c.name.toLowerCase());
      name ??= ids.find((i) => i.name)?.name;
    }

    const status = process.stderr.isTTY && !opts.json ? (msg) => process.stderr.write(`\r\x1b[2K  ${msg}`) : () => {};
    let done = 0;
    const perRepo = await mapLimit(repos, 8, async (repo) => {
      try {
        return await readCommits(repo, { year, authors });
      } catch (err) {
        warnings.push(`${path.basename(repo)}: ${err.message.split('\n')[0]}`);
        return [];
      } finally {
        status(`Unwrapping ${++done}/${repos.length} repo${repos.length === 1 ? '' : 's'}…`);
      }
    });
    if (process.stderr.isTTY && !opts.json) process.stderr.write('\r\x1b[2K');

    const seen = new Set();
    commits = perRepo.flat().filter((c) => match(c) && !seen.has(c.hash) && seen.add(c.hash));
    if (opts.everyone) name ??= repos.length === 1 ? path.basename(repos[0]) : 'The Team';

    if (!commits.length) {
      for (const w of warnings) console.error(`  ⚠ ${w}`);
      return fail(
        `No commits${opts.everyone ? '' : ' by you'} in ${year} across ${repos.length} repo${repos.length === 1 ? '' : 's'}.\n` +
          `  Try another year (--year ${year - 1}), another author (--author <email>), or --everyone.`,
      );
    }
  }

  const stats = computeStats(commits, { year, today });
  stats.name = name || 'You';
  stats.team = Boolean(opts.everyone);
  stats.personality = personality(stats);

  if (opts.json) return void console.log(JSON.stringify(stats, null, 2));

  const card = renderCard(stats, { theme: opts.theme, credit: REPO_URL.replace('https://', '') });
  const story = renderStory(stats, { card, command: COMMAND, repoUrl: REPO_URL });

  const outDir = path.resolve(opts.out ?? path.join(os.tmpdir(), 'commit-wrapped'));
  fs.mkdirSync(outDir, { recursive: true });
  const base = path.join(outDir, `commit-wrapped-${year}`);
  fs.writeFileSync(`${base}.svg`, card);
  fs.writeFileSync(`${base}.html`, story);
  fs.writeFileSync(`${base}.json`, JSON.stringify(stats, null, 2));

  process.stdout.write(renderTerminal(stats, { color }));
  for (const w of warnings) console.error(`  ⚠ Skipped ${w}`);

  const shouldOpen = !opts['no-open'] && process.stdout.isTTY && !process.env.CI;
  const dim = (s) => (color ? `\x1b[2m${s}\x1b[22m` : s);
  console.log(`  ✨ Story  ${base}.html${shouldOpen ? dim('  (opening in your browser)') : ''}`);
  console.log(`  🖼  Card   ${base}.svg`);
  console.log(dim(`\n  Like it? A ⭐ helps others find it: ${REPO_URL}\n`));
  if (shouldOpen) openFile(`${base}.html`);
}

function fail(message) {
  console.error(`\n  ✖ ${message}\n`);
  process.exitCode = 1;
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function openFile(file) {
  const [cmd, args, extra] =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '""', `"${file}"`], { windowsVerbatimArguments: true }]
      : [process.platform === 'darwin' ? 'open' : 'xdg-open', [file], {}];
  try {
    const child = spawn(cmd, args, { detached: true, stdio: 'ignore', ...extra });
    child.on('error', () => {});
    child.unref();
  } catch {
    // Opening the browser is a nicety; the path is already printed.
  }
}
