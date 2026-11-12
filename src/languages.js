// Extension -> [language, color]. Colors follow GitHub Linguist, nudged brighter
// where the original is unreadable on a dark card.
const LANGS = {
  ts: ['TypeScript', '#3178c6'], tsx: ['TypeScript', '#3178c6'], mts: ['TypeScript', '#3178c6'], cts: ['TypeScript', '#3178c6'],
  js: ['JavaScript', '#f1e05a'], jsx: ['JavaScript', '#f1e05a'], mjs: ['JavaScript', '#f1e05a'], cjs: ['JavaScript', '#f1e05a'],
  py: ['Python', '#3572a5'], pyi: ['Python', '#3572a5'], ipynb: ['Jupyter Notebook', '#da5b0b'],
  go: ['Go', '#00add8'],
  rs: ['Rust', '#dea584'],
  java: ['Java', '#b07219'],
  kt: ['Kotlin', '#a97bff'], kts: ['Kotlin', '#a97bff'],
  swift: ['Swift', '#f05138'],
  c: ['C', '#a8b9cc'], h: ['C', '#a8b9cc'],
  cpp: ['C++', '#f34b7d'], cc: ['C++', '#f34b7d'], cxx: ['C++', '#f34b7d'], hpp: ['C++', '#f34b7d'], hh: ['C++', '#f34b7d'], hxx: ['C++', '#f34b7d'],
  cs: ['C#', '#178600'],
  m: ['Objective-C', '#438eff'], mm: ['Objective-C', '#438eff'],
  rb: ['Ruby', '#cc342d'],
  php: ['PHP', '#777bb4'],
  dart: ['Dart', '#00b4ab'],
  scala: ['Scala', '#c22d40'],
  ex: ['Elixir', '#9b6bb3'], exs: ['Elixir', '#9b6bb3'],
  erl: ['Erlang', '#b83998'],
  hs: ['Haskell', '#8f7ad6'],
  lua: ['Lua', '#4f6ed3'],
  zig: ['Zig', '#ec915c'],
  nim: ['Nim', '#ffc200'],
  ml: ['OCaml', '#ef7a08'], mli: ['OCaml', '#ef7a08'],
  clj: ['Clojure', '#db5855'], cljs: ['Clojure', '#db5855'], cljc: ['Clojure', '#db5855'],
  fs: ['F#', '#b845fc'], fsx: ['F#', '#b845fc'],
  r: ['R', '#198ce7'],
  jl: ['Julia', '#a270ba'],
  pl: ['Perl', '#0298c3'], pm: ['Perl', '#0298c3'],
  sh: ['Shell', '#89e051'], bash: ['Shell', '#89e051'], zsh: ['Shell', '#89e051'], fish: ['Shell', '#89e051'],
  ps1: ['PowerShell', '#3b82c4'], psm1: ['PowerShell', '#3b82c4'],
  html: ['HTML', '#e34c26'], htm: ['HTML', '#e34c26'],
  css: ['CSS', '#8e5bd6'],
  scss: ['SCSS', '#c6538c'], sass: ['SCSS', '#c6538c'],
  less: ['Less', '#3d6ba3'],
  vue: ['Vue', '#41b883'],
  svelte: ['Svelte', '#ff3e00'],
  astro: ['Astro', '#ff5a03'],
  md: ['Markdown', '#4c8eda'], mdx: ['MDX', '#fcb32c'],
  json: ['JSON', '#e6c86e'], jsonc: ['JSON', '#e6c86e'],
  yml: ['YAML', '#cb171e'], yaml: ['YAML', '#cb171e'],
  toml: ['TOML', '#c4693a'],
  xml: ['XML', '#3f8fd2'],
  sql: ['SQL', '#e38c00'],
  graphql: ['GraphQL', '#e10098'], gql: ['GraphQL', '#e10098'],
  tf: ['HCL', '#844fba'], hcl: ['HCL', '#844fba'],
  nix: ['Nix', '#7e7eff'],
  sol: ['Solidity', '#aa6746'],
  elm: ['Elm', '#60b5cc'],
  gleam: ['Gleam', '#ffaff3'],
  prisma: ['Prisma', '#5a67d8'],
  proto: ['Protocol Buffers', '#9aa5b1'],
  groovy: ['Groovy', '#4298b8'], gradle: ['Groovy', '#4298b8'],
  asm: ['Assembly', '#a0784a'], s: ['Assembly', '#a0784a'],
  vim: ['Vim Script', '#199f4b'],
  tex: ['TeX', '#5a8f2a'],
  dockerfile: ['Dockerfile', '#5a8fa3'],
};

const FILENAMES = {
  dockerfile: ['Dockerfile', '#5a8fa3'],
  containerfile: ['Dockerfile', '#5a8fa3'],
  makefile: ['Makefile', '#427819'],
  gnumakefile: ['Makefile', '#427819'],
  justfile: ['Just', '#384d54'],
  rakefile: ['Ruby', '#cc342d'],
  gemfile: ['Ruby', '#cc342d'],
};

// Lockfiles, build output and minified bundles would drown out real work.
const NOISE_FILES = new Set([
  'package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lock', 'bun.lockb',
  'cargo.lock', 'poetry.lock', 'pipfile.lock', 'uv.lock', 'composer.lock', 'gemfile.lock', 'go.sum',
  'flake.lock', 'packages.lock.json', 'podfile.lock', 'mix.lock', 'pubspec.lock', 'deno.lock',
]);
const NOISE_PATH = /(^|\/)(node_modules|vendor|dist|third_party|\.yarn)\/|\.min\.(js|css)$|\.map$|\.snap$/i;

const baseName = (p) => p.slice(p.lastIndexOf('/') + 1).toLowerCase();

export function languageOf(path) {
  const base = baseName(path);
  if (FILENAMES[base]) return { name: FILENAMES[base][0], color: FILENAMES[base][1] };
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return null;
  const hit = LANGS[base.slice(dot + 1)];
  return hit ? { name: hit[0], color: hit[1] } : null;
}

export function isNoise(path) {
  return NOISE_FILES.has(baseName(path)) || NOISE_PATH.test(path);
}
