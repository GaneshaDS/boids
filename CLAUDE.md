# Boids + Quadtree

2D artificial life simulator. HTML5, CSS and vanilla ES modules only: no libraries, no npm, no build step.

Run: `python -m http.server 8000 -d src`, then open http://localhost:8000 (ES modules do not load from `file://`).

## Architecture

Dependencies go one way: `main.js` imports `quadtree.js` and `boid.js`, which import nothing.

- `src/quadtree.js`: spatial index over any object with `x`/`y`. Rebuilt every frame; nodes are pooled to avoid GC pauses.
- `src/boid.js`: per-agent physics (Reynolds steering, cursor and obstacle avoidance). Knows nothing about the DOM.
- `src/main.js`: owns state, UI bindings, the 60 FPS loop and all drawing.
- `src/index.html`, `src/styles.css`: the canvases and the glass panel.

## Conventions

- Slider and checkbox defaults live in `index.html`; `main.js` reads them by the input's `name`.
- Two stacked canvases: `#trails` fades between frames for the neon trails, `#overlay` is cleared every frame so debug drawing never smears.
- Forces are computed for all boids before any boid moves.
- No per-boid allocation in the hot path.
