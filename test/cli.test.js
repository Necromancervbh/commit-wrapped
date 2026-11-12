import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = fileURLToPath(new URL('../bin/commit-wrapped.js', import.meta.url));
let root;

const gitIn = (cwd, args, env = {}) => execFileSync('git', args, { cwd, env: { ...process.env, ...env }, stdio: 'pipe' }).toString();
const run = (args, cwd) => {
  try {
    return { code: 0, stdout: execFileSync(process.execPath, [BIN, ...args], { cwd, stdio: 'pipe', env: { ...process.env, NO_COLOR: '1' } }).toString() };
  } catch (err) {
    return { code: err.status, stdout: err.stdout.toString(), stderr: err.stderr.toString() };
  }
};

function makeRepo(name, commits) {
  const dir = path.join(root, 'code', name);
  fs.mkdirSync(dir, { recursive: true });
  gitIn(dir, ['init', '-q', '-b', 'main']);
  gitIn(dir, ['config', 'user.name', 'Ada Lovelace']);
  gitIn(dir, ['config', 'user.email', 'ada@example.com']);
  commits.forEach(([date, author, file, message], i) => {
    fs.writeFileSync(path.join(dir, file), `line ${i}\n`.repeat(i + 1));
    gitIn(dir, ['add', '.']);
    const [name, email] = author.split(':');
    gitIn(dir, ['commit', '-q', '-m', message], {
      GIT_AUTHOR_NAME: name,
      GIT_AUTHOR_EMAIL: email,
      GIT_AUTHOR_DATE: date,
      GIT_COMMITTER_NAME: name,
      GIT_COMMITTER_EMAIL: email,
      GIT_COMMITTER_DATE: date,
    });
  });
  return dir;
}

before(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'commit-wrapped-test-'));
  makeRepo('api', [
    ['2024-12-31T10:00:00+00:00', 'Ada Lovelace:ada@example.com', 'old.py', 'last year'],
    ['2025-03-01T23:30:00+01:00', 'Ada Lovelace:ada@example.com', 'main.py', 'first'],
    ['2025-03-02T00:30:00+01:00', 'Ada Lovelace:ada@example.com', 'main.py', 'fix: second\n\nCo-authored-by: Claude <noreply@anthropic.com>'],
    ['2025-03-03T12:00:00+01:00', 'Grace Hopper:grace@example.com', 'util.py', 'someone else'],
  ]);
  makeRepo('web', [['2025-03-03T22:00:00-05:00', 'Ada Lovelace:ada@example.com', 'app.ts', 'feat: web']]);
});

after(() => fs.rmSync(root, { recursive: true, force: true }));

test('scans a folder of repos and counts only your commits', () => {
  const { code, stdout } = run(['code', '--year', '2025', '--json'], root);
  assert.equal(code, 0);
  const s = JSON.parse(stdout);
  assert.equal(s.commits, 3);
  assert.equal(s.name, 'Ada Lovelace');
  assert.deepEqual(s.repos.map((r) => r.name).sort(), ['api', 'web']);
  assert.equal(s.longestStreak.days, 3);
  assert.equal(s.counts.ai, 1);
  assert.equal(s.hours[23], 1);
  assert.equal(s.hours[0], 1);
  assert.equal(s.languages[0].name, 'Python');
});

test('--everyone and --author change whose commits count', () => {
  assert.equal(JSON.parse(run(['code', '-y', '2025', '--json', '--everyone'], root).stdout).commits, 4);
  assert.equal(JSON.parse(run(['code', '-y', '2025', '--json', '-a', 'grace'], root).stdout).commits, 1);
});

test('writes the story, card and json to --out', () => {
  const out = path.join(root, 'out');
  const { code, stdout } = run([path.join(root, 'code', 'api'), '-y', '2025', '-o', out, '--no-open'], root);
  assert.equal(code, 0);
  assert.match(stdout, /2025 WRAPPED/);
  for (const ext of ['html', 'svg', 'json']) assert.ok(fs.existsSync(path.join(out, `commit-wrapped-2025.${ext}`)));
});

test('explains what to do when there is nothing to wrap', () => {
  const { code, stderr } = run(['code', '-y', '2023'], root);
  assert.equal(code, 1);
  assert.match(stderr, /No commits by you in 2023/);
});

test('rejects bad options', () => {
  assert.equal(run(['--year', 'soon'], root).code, 1);
  assert.equal(run(['--theme', 'nope', '--demo'], root).code, 1);
  assert.equal(run(['--wat'], root).code, 1);
});
