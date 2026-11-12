import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const RS = '\x1e'; // between commits
const US = '\x1f'; // between fields
const TS = '\x1d'; // between co-author trailers
const FORMAT = `${RS}%H${US}%an${US}%ae${US}%aI${US}%s${US}%(trailers:key=Co-authored-by,valueonly,separator=%x1d)${US}`;

const SKIP_DIRS = new Set(['node_modules', 'vendor', 'dist', 'build', 'target', 'venv', '__pycache__']);

export function git(cwd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, { cwd, windowsHide: true });
    const out = [];
    const err = [];
    child.stdout.on('data', (d) => out.push(d));
    child.stderr.on('data', (d) => err.push(d));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(out).toString('utf8'));
      else reject(new Error(Buffer.concat(err).toString('utf8').trim() || `git ${args[0]} exited with ${code}`));
    });
  });
}

/** Resolve the given paths to a deduplicated list of git repository roots. */
export async function findRepos(roots, maxDepth = 3) {
  const found = new Set();

  const walk = (dir, depth) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    if (entries.some((e) => e.name === '.git')) {
      found.add(fs.realpathSync(dir));
      return;
    }
    if (depth >= maxDepth) return;
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
      walk(path.join(dir, e.name), depth + 1);
    }
  };

  for (const root of roots) {
    const dir = path.resolve(root);
    if (!fs.existsSync(dir)) throw new Error(`Path not found: ${root}`);
    if (fs.existsSync(path.join(dir, '.git'))) {
      found.add(fs.realpathSync(dir));
      continue;
    }
    // Inside a repo's subfolder? Use the repo it belongs to.
    const top = await git(dir, ['rev-parse', '--show-toplevel']).catch(() => '');
    if (top.trim()) found.add(fs.realpathSync(top.trim()));
    else walk(dir, 0);
  }
  return [...found];
}

export async function getIdentity(cwd) {
  const get = (key) => git(cwd, ['config', key]).then((s) => s.trim(), () => '');
  return { name: await get('user.name'), email: await get('user.email') };
}

/**
 * Read every non-merge commit from all branches/remotes/tags of a repo whose
 * author date falls in `year`. `authors` (fixed strings) narrows the scan in git
 * itself; exact matching happens later in JS.
 */
export async function readCommits(repo, { year, authors = [] }) {
  const args = [
    '-c', 'core.quotePath=false',
    '-c', 'log.showSignature=false',
    'log', '--branches', '--remotes', '--tags', '--no-merges', '--no-color',
    // Committer date >= author date, so this lower bound never drops a commit.
    `--since=${year - 1}-12-30`,
    '--numstat', `--format=${FORMAT}`,
  ];
  if (authors.length) args.push('-F', '-i', ...authors.map((a) => `--author=${a}`));
  const stdout = await git(repo, args);
  const prefix = `${year}-`;
  return parseLog(stdout, path.basename(repo)).filter((c) => c.date.startsWith(prefix));
}

export function parseLog(stdout, repo) {
  const commits = [];
  for (const chunk of stdout.split(RS)) {
    const parts = chunk.split(US);
    if (parts.length < 7) continue;
    const [hash, name, email, iso, subject, trailers, rest] = parts;
    const files = [];
    for (const raw of rest.split('\n')) {
      const m = /^(\d+|-)\t(\d+|-)\t(.+)$/.exec(raw.replace(/\r$/, ''));
      if (!m) continue;
      const binary = m[1] === '-';
      files.push({
        path: resolveRename(unquote(m[3])),
        added: binary ? 0 : Number(m[1]),
        deleted: binary ? 0 : Number(m[2]),
      });
    }
    commits.push({
      repo,
      hash,
      name,
      email,
      // Keep the author's own wall clock: 11 PM in Tokyo is a late night, wherever you run this.
      date: iso.slice(0, 10),
      hour: Number(iso.slice(11, 13)),
      tz: iso.slice(19) || 'Z',
      subject,
      coauthors: trailers ? trailers.split(TS).map((s) => s.trim()).filter(Boolean) : [],
      files,
    });
  }
  return commits;
}

function unquote(p) {
  if (p.length > 1 && p.startsWith('"') && p.endsWith('"')) {
    return p.slice(1, -1).replace(/\\(["\\])/g, '$1').replace(/\\t/g, '\t').replace(/\\n/g, '\n');
  }
  return p;
}

// "src/{old => new}/a.js" -> "src/new/a.js", "a.js => b.js" -> "b.js"
export function resolveRename(p) {
  if (!p.includes(' => ')) return p;
  const brace = /^(.*)\{(.*) => (.*)\}(.*)$/.exec(p);
  if (brace) return (brace[1] + brace[3] + brace[4]).replace(/\/{2,}/g, '/');
  return p.slice(p.indexOf(' => ') + 4);
}
