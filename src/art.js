import fs from 'node:fs';

const cache = new Map();

/** Character art bundled in src/assets, as a data: URI so pages and cards stay single-file. */
export function art(name) {
  if (!cache.has(name)) {
    const file = name === 'logo' ? 'logo-64.png' : `personalities/${name}.webp`;
    let uri = null;
    try {
      const data = fs.readFileSync(new URL(`./assets/${file}`, import.meta.url));
      uri = `data:image/${file.endsWith('.png') ? 'png' : 'webp'};base64,${data.toString('base64')}`;
    } catch {
      // Art is decoration; everything still renders without it.
    }
    cache.set(name, uri);
  }
  return cache.get(name);
}
