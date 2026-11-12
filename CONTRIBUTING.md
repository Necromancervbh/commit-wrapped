# Contributing

Thanks for helping make commit-wrapped better! It's a small, dependency-free Node project, so getting started takes seconds:

```bash
git clone https://github.com/Necromancervbh/commit-wrapped
cd commit-wrapped
node bin/commit-wrapped.js --demo   # try it with sample data
node bin/commit-wrapped.js ~/code   # try it on your own repos
npm test
```

## Layout

| Path | What it does |
| --- | --- |
| `src/git.js` | Finds repos and parses `git log --numstat` |
| `src/stats.js` | Turns commits into numbers (pure, easy to test) |
| `src/personality.js` | The coding personalities |
| `src/languages.js` | File extension → language, plus files we ignore |
| `src/render/` | Terminal output, SVG card, and the HTML story |

## Good first contributions

- **A new personality.** Add an entry to `ARCHETYPES` in `src/personality.js` with a `score` (≥ 1 means "this applies") and a fun `describe`, plus a 384×384 portrait at `src/assets/personalities/<id>.webp` in the same glossy 3D style (the existing ones are a good reference for an image-generation prompt).
- **A new card theme.** Add a palette to `THEMES` in `src/render/svg.js`.
- **A missing language.** Add the extension to `src/languages.js`.
- **A new story slide or fun fact.** See `src/render/story/client.js` and `funFacts()` in `src/render/terminal.js`.

## Ground rules

- No runtime dependencies. `npx commit-wrapped` should start instantly.
- Nothing leaves the user's machine. No network calls, no telemetry.
- Add a test for new stats in `test/`.

To refresh the README card and the live demo after changing the visuals:

```bash
node bin/commit-wrapped.js --demo --no-open --out docs
mv docs/commit-wrapped-*.html docs/index.html && mv docs/commit-wrapped-*.svg assets/demo-card.svg && rm docs/commit-wrapped-*.json
```
