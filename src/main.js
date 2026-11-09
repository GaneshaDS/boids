import { Quadtree } from './quadtree.js';
import { Boid } from './boid.js';

const FRAME_MS = 1000 / 60;
const MAX_DT = 3; // Avoids huge jumps after the tab was in the background.
const MAX_NEIGHBORS = 120; // Bounds the cost when a flock collapses into a point.
const PREDATOR_RADIUS = 130;
const PREDATOR_WEIGHT = 7;
const MAX_OBSTACLES = 60;
const BACKGROUND = '#05060f';
const TRAIL_FADE = 'rgba(5, 6, 15, 0.14)';
const HUE_BUCKETS = 32;
const GLOW_RADIUS = 13;
const VECTOR_SCALE = 7;

const trails = document.querySelector('#trails');
const overlay = document.querySelector('#overlay');
const panel = document.querySelector('#panel');
const fpsLabel = document.querySelector('#fps');
const trailsCtx = trails.getContext('2d', { alpha: false });
const overlayCtx = overlay.getContext('2d');

const params = {};
const view = {};
const boids = [];
const obstacles = [];
const neighbors = [];
const pointer = { x: 0, y: 0, active: false };
const tree = new Quadtree(0, 0, 1, 1);

let width = 0;
let height = 0;

/** The heading maps to a cyan-to-magenta hue that loops without a seam. */
const buckets = Array.from({ length: HUE_BUCKETS }, (_, i) => {
  const blend = 0.5 - 0.5 * Math.cos((i / HUE_BUCKETS) * Math.PI * 2);
  const hue = Math.round(185 + 135 * blend);
  return { color: `hsl(${hue} 100% 68%)`, glow: makeGlow(hue), boids: [] };
});

function makeGlow(hue) {
  const size = GLOW_RADIUS * 2;
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = size;
  const ctx = sprite.getContext('2d');
  const gradient = ctx.createRadialGradient(GLOW_RADIUS, GLOW_RADIUS, 0, GLOW_RADIUS, GLOW_RADIUS, GLOW_RADIUS);
  gradient.addColorStop(0, `hsl(${hue} 100% 60% / 0.34)`);
  gradient.addColorStop(1, `hsl(${hue} 100% 60% / 0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return sprite;
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  for (const canvas of [trails, overlay]) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  trailsCtx.fillStyle = BACKGROUND;
  trailsCtx.fillRect(0, 0, width, height);
}

function syncPopulation() {
  while (boids.length < params.agents) {
    boids.push(new Boid(Math.random() * width, Math.random() * height));
  }
  boids.length = params.agents;
}

function step(dt) {
  // One pixel of padding keeps boids sitting exactly on the far edge in bounds.
  tree.reset(-1, -1, width + 2, height + 2);
  for (const boid of boids) tree.insert(boid);

  for (const boid of boids) {
    tree.query(boid.x, boid.y, params.vision, neighbors, MAX_NEIGHBORS);
    boid.flock(neighbors, params);
    if (pointer.active) boid.flee(pointer.x, pointer.y, PREDATOR_RADIUS, PREDATOR_WEIGHT);
    for (const obstacle of obstacles) boid.avoid(obstacle);
    boid.keepInside(width, height);
  }
  for (const boid of boids) boid.move(dt, width, height);
}

function drawBoids() {
  const ctx = trailsCtx;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = view.trails ? TRAIL_FADE : BACKGROUND;
  ctx.fillRect(0, 0, width, height);

  for (const bucket of buckets) bucket.boids.length = 0;
  for (const boid of boids) {
    const turn = Math.atan2(boid.vy, boid.vx) / (Math.PI * 2) + 0.5;
    buckets[Math.floor(turn * HUE_BUCKETS) % HUE_BUCKETS].boids.push(boid);
  }

  ctx.globalCompositeOperation = 'lighter';
  for (const { color, glow, boids: group } of buckets) {
    if (group.length === 0) continue;
    ctx.beginPath();
    for (const { x, y, vx, vy } of group) {
      ctx.drawImage(glow, x - GLOW_RADIUS, y - GLOW_RADIUS);
      const speed = Math.hypot(vx, vy) || 1;
      const ux = vx / speed;
      const uy = vy / speed;
      ctx.moveTo(x + ux * 7, y + uy * 7);
      ctx.lineTo(x - ux * 4 - uy * 3, y - uy * 4 + ux * 3);
      ctx.lineTo(x - ux * 4 + uy * 3, y - uy * 4 - ux * 3);
      ctx.closePath();
    }
    ctx.fillStyle = color;
    ctx.fill();
  }
}

function drawOverlay() {
  const ctx = overlayCtx;
  ctx.clearRect(0, 0, width, height);

  if (view.quadtree) {
    ctx.beginPath();
    tree.forEachLeaf(({ x, y, w, h }) => ctx.rect(x, y, w, h));
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.28)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  if (view.vectors) {
    ctx.beginPath();
    for (const { x, y, vx, vy } of boids) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + vx * VECTOR_SCALE, y + vy * VECTOR_SCALE);
    }
    ctx.strokeStyle = 'rgba(214, 255, 87, 0.65)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  for (const { x, y, r } of obstacles) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 45, 120, 0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 45, 120, 0.3)';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = '#ff5c9a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  if (pointer.active) {
    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, PREDATOR_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 170, 60, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffaa3c';
    ctx.fill();
  }
}

function bindPanel() {
  for (const input of panel.querySelectorAll('input[type="range"]')) {
    const output = panel.querySelector(`output[for="${input.id}"]`);
    const sync = () => {
      params[input.name] = Number(input.value);
      output.value = input.value;
      if (input.name === 'agents') syncPopulation();
    };
    input.addEventListener('input', sync);
    sync();
  }

  for (const input of panel.querySelectorAll('input[type="checkbox"]')) {
    const sync = () => {
      view[input.name] = input.checked;
    };
    input.addEventListener('change', sync);
    sync();
  }

  panel.querySelector('#clear').addEventListener('click', () => {
    obstacles.length = 0;
  });
}

function bindPointer() {
  const track = (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
  };

  trails.addEventListener('pointermove', track);
  trails.addEventListener('pointerleave', () => {
    pointer.active = false;
  });
  trails.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    track(event);
    obstacles.push({ x: event.clientX, y: event.clientY, r: 16 + Math.random() * 22 });
    if (obstacles.length > MAX_OBSTACLES) obstacles.shift();
  });
}

let lastTime = performance.now();
let nextFrame = lastTime;
let fpsFrames = 0;
let fpsSince = lastTime;

function frame(now) {
  requestAnimationFrame(frame);

  // Holds 60 FPS on faster displays. The 1 ms allows for timer jitter.
  if (now < nextFrame - 1) return;
  nextFrame = Math.max(nextFrame + FRAME_MS, now);

  const dt = Math.min((now - lastTime) / FRAME_MS, MAX_DT);
  lastTime = now;

  step(dt);
  drawBoids();
  drawOverlay();

  fpsFrames++;
  if (now - fpsSince >= 500) {
    fpsLabel.textContent = Math.round((fpsFrames * 1000) / (now - fpsSince));
    fpsFrames = 0;
    fpsSince = now;
  }
}

resize();
window.addEventListener('resize', resize);
bindPanel();
bindPointer();
requestAnimationFrame(frame);
