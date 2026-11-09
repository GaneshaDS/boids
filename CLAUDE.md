# Boids + Quadtree

2D artificial life simulator with five species. Vite, Vue 3, Tailwind CSS v4 and PixiJS (WebGL).

Run: `npm install`, then `npm run dev`. Production build: `npm run build`.

## Architecture

Dependencies go one way: `App.vue` imports `simulation.js` and `renderer.js`; the simulation imports `quadtree.js`, `boid.js` and `species.js`.

- `src/quadtree.js`: spatial index over any object with `x`/`y`. Rebuilt every frame; nodes are pooled to avoid GC pauses.
- `src/species.js`: silhouette, palette and physics of each species. The renderer and the legend both draw from these SVG paths.
- `src/boid.js`: per-agent physics (Reynolds steering, species affinity, cursor and obstacle avoidance). Knows nothing about the DOM.
- `src/simulation.js`: world state and the physics step. Knows nothing about the DOM.
- `src/renderer.js`: all drawing, as PixiJS particle layers (trails, glow, one layer per species) plus a `Graphics` overlay.
- `src/App.vue`: settings, pointer input and the 60 FPS loop.
- `src/components/`: the control panel.

## Conventions

- Slider and switch defaults live in `settings` in `App.vue`; `ControlPanel.vue` declares their ranges.
- The simulation and renderer read the raw settings object, never the Vue proxy.
- Trails are particles over a per-boid history, not a fading canvas, so the page background shows through.
- Body textures are grayscale; each boid's color comes from its tint.
- Forces are computed for all boids before any boid moves.
- No per-boid allocation in the hot path; particles are only created when the population changes.
- The population only changes inside `Simulation.step`, at the end of the array.
