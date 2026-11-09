import { Application, CanvasSource, Graphics, Particle, ParticleContainer, Texture } from 'pixi.js';
import { SPECIES } from './species.js';
import { PREDATOR_RADIUS } from './simulation.js';

const SHAPE_UNITS = 24;
const SHAPE_RESOLUTION = 4; // Texture pixels per shape unit.
const GLOW_TEXTURE = 64;
const GLOW_RADIUS = 20;
const GLOW_ALPHA = 0.3;
const STREAK_LENGTH = 16;
const STREAK_WIDTH = 16;
const TRAIL_SEGMENTS = 10;
const TRAIL_STRIDE = 2; // Frames of history covered by one segment.
const TRAIL_POINTS = TRAIL_SEGMENTS * TRAIL_STRIDE + 1;
const TRAIL_ALPHA = 0.5;
const TRAIL_WIDTH = 9;
const FOCUS_DIM = 0.12;
const VECTOR_SCALE = 7;
const CENTER = { anchorX: 0.5, anchorY: 0.5 };
const DYNAMIC = { position: true, rotation: true, vertex: true, color: true, uvs: false };

function makeTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'));
  return new Texture({ source: new CanvasSource({ resource: canvas, autoGenerateMipmaps: true }) });
}

/**
 * Grayscale, because each boid multiplies it by its own tint. The dark rim keeps
 * bodies apart where they overlap and the dark mark shows where each one faces.
 */
function makeBodyTexture({ path, mark }) {
  const size = SHAPE_UNITS * SHAPE_RESOLUTION;
  return makeTexture(size, size, (ctx) => {
    ctx.scale(SHAPE_RESOLUTION, SHAPE_RESOLUTION);
    ctx.translate(SHAPE_UNITS / 2, SHAPE_UNITS / 2);

    const gradient = ctx.createLinearGradient(SHAPE_UNITS / 2, 0, -SHAPE_UNITS / 2, 0);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, '#a8a8a8');
    const body = new Path2D(path);
    ctx.fillStyle = gradient;
    ctx.fill(body);
    ctx.strokeStyle = 'rgb(0 0 0 / 0.75)';
    ctx.lineWidth = 1.1;
    ctx.lineJoin = 'round';
    ctx.stroke(body);

    ctx.fillStyle = 'rgb(0 0 0 / 0.62)';
    ctx.fill(new Path2D(mark));
  });
}

function makeGlowTexture() {
  const radius = GLOW_TEXTURE / 2;
  return makeTexture(GLOW_TEXTURE, GLOW_TEXTURE, (ctx) => {
    const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
    gradient.addColorStop(0, 'rgb(255 255 255 / 1)');
    gradient.addColorStop(0.4, 'rgb(255 255 255 / 0.28)');
    gradient.addColorStop(1, 'rgb(255 255 255 / 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GLOW_TEXTURE, GLOW_TEXTURE);
  });
}

function makeStreakTexture() {
  return makeTexture(STREAK_LENGTH, STREAK_WIDTH, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, STREAK_WIDTH);
    gradient.addColorStop(0, 'rgb(255 255 255 / 0)');
    gradient.addColorStop(0.5, 'rgb(255 255 255 / 1)');
    gradient.addColorStop(1, 'rgb(255 255 255 / 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, STREAK_LENGTH, STREAK_WIDTH);
  });
}

/** Draws the world with WebGL: one reusable set of particles per boid. */
export class FlockRenderer {
  #slots = [];
  #dims = new Float32Array(SPECIES.length);

  static async create(canvas) {
    const app = new Application();
    await app.init({
      canvas,
      resizeTo: window,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      preference: 'webgl',
      autoStart: false,
    });
    return new FlockRenderer(app);
  }

  constructor(app) {
    this.app = app;
    this.bodyTextures = SPECIES.map(makeBodyTexture);
    this.glowTexture = makeGlowTexture();
    this.streakTexture = makeStreakTexture();

    this.trailLayer = new ParticleContainer({ texture: this.streakTexture, dynamicProperties: DYNAMIC });
    this.glowLayer = new ParticleContainer({ texture: this.glowTexture, dynamicProperties: DYNAMIC });
    this.trailLayer.blendMode = 'add';
    this.glowLayer.blendMode = 'add';
    this.bodyLayers = this.bodyTextures.map(
      (texture) => new ParticleContainer({ texture, dynamicProperties: DYNAMIC }),
    );
    this.overlay = new Graphics();
    app.stage.addChild(this.trailLayer, this.glowLayer, ...this.bodyLayers, this.overlay);
  }

  get width() {
    return this.app.screen.width;
  }

  get height() {
    return this.app.screen.height;
  }

  #addSlot(boid) {
    const body = new Particle({ ...CENTER, texture: this.bodyTextures[boid.species.index], tint: boid.tint });
    const glow = new Particle({ ...CENTER, texture: this.glowTexture, tint: boid.tint });
    const trail = Array.from(
      { length: TRAIL_SEGMENTS },
      () => new Particle({ anchorX: 0, anchorY: 0.5, texture: this.streakTexture, tint: boid.tint }),
    );
    this.bodyLayers[boid.species.index].addParticle(body);
    this.glowLayer.addParticle(glow);
    this.trailLayer.addParticle(...trail);

    const history = new Float32Array(TRAIL_POINTS * 2);
    for (let i = 0; i < TRAIL_POINTS; i++) {
      history[i * 2] = boid.x;
      history[i * 2 + 1] = boid.y;
    }
    this.#slots.push({ body, glow, trail, history, head: 0 });
  }

  #removeSlot() {
    const { body, glow, trail } = this.#slots.pop();
    this.bodyLayers[this.#slots.length % SPECIES.length].removeParticle(body);
    this.glowLayer.removeParticle(glow);
    this.trailLayer.removeParticle(...trail);
  }

  /** The simulation only adds or removes boids at the end of its array. */
  #syncSlots(boids) {
    while (this.#slots.length > boids.length) this.#removeSlot();
    while (this.#slots.length < boids.length) this.#addSlot(boids[this.#slots.length]);
  }

  #drawTrail(slot, boid, dim) {
    const { trail, history } = slot;
    slot.head = (slot.head + 1) % TRAIL_POINTS;
    history[slot.head * 2] = boid.x;
    history[slot.head * 2 + 1] = boid.y;

    for (let k = 0; k < TRAIL_SEGMENTS; k++) {
      const from = ((slot.head - k * TRAIL_STRIDE + TRAIL_POINTS) % TRAIL_POINTS) * 2;
      const to = ((slot.head - (k + 1) * TRAIL_STRIDE + TRAIL_POINTS) % TRAIL_POINTS) * 2;
      const dx = history[to] - history[from];
      const dy = history[to + 1] - history[from + 1];
      const fade = 1 - k / TRAIL_SEGMENTS;

      const segment = trail[k];
      segment.x = history[from];
      segment.y = history[from + 1];
      segment.rotation = Math.atan2(dy, dx);
      segment.scaleX = Math.hypot(dx, dy) / STREAK_LENGTH;
      segment.scaleY = (TRAIL_WIDTH * boid.size * fade) / STREAK_WIDTH;
      segment.alpha = TRAIL_ALPHA * fade * fade * dim;
    }
  }

  #drawBoids(boids, settings, focus) {
    for (const { index } of SPECIES) {
      this.#dims[index] = focus === null || focus === index ? 1 : FOCUS_DIM;
      this.bodyLayers[index].alpha = this.#dims[index];
    }
    this.trailLayer.visible = settings.trails;

    for (let i = 0; i < boids.length; i++) {
      const boid = boids[i];
      const slot = this.#slots[i];
      const dim = this.#dims[boid.species.index];
      const scale = boid.size * settings.agentScale;

      slot.body.x = boid.x;
      slot.body.y = boid.y;
      slot.body.rotation = Math.atan2(boid.vy, boid.vx);
      slot.body.scaleX = slot.body.scaleY = scale / SHAPE_RESOLUTION;

      slot.glow.x = boid.x;
      slot.glow.y = boid.y;
      slot.glow.scaleX = slot.glow.scaleY = (scale * GLOW_RADIUS * 2) / GLOW_TEXTURE;
      slot.glow.alpha = GLOW_ALPHA * dim;

      this.#drawTrail(slot, boid, dim);
    }
  }

  #drawOverlay({ boids, obstacles, pointer, tree }, settings) {
    const g = this.overlay;
    g.clear();

    if (settings.quadtree) {
      tree.forEachLeaf(({ x, y, w, h }) => g.rect(x, y, w, h));
      g.stroke({ width: 1, color: 0x7dd3fc, alpha: 0.25 });
    }

    if (settings.vectors) {
      for (const { x, y, vx, vy } of boids) {
        g.moveTo(x, y);
        g.lineTo(x + vx * VECTOR_SCALE, y + vy * VECTOR_SCALE);
      }
      g.stroke({ width: 1, color: 0xf8fafc, alpha: 0.55 });
    }

    for (const { x, y, r } of obstacles) {
      g.circle(x, y, r + 5).fill({ color: 0xf8fafc, alpha: 0.04 });
      g.circle(x, y, r).fill({ color: 0x0b1220, alpha: 0.9 }).stroke({ width: 1.5, color: 0xe2e8f0, alpha: 0.8 });
      g.circle(x, y, r * 0.45).stroke({ width: 1, color: 0xe2e8f0, alpha: 0.3 });
    }

    if (pointer.active) {
      g.circle(pointer.x, pointer.y, PREDATOR_RADIUS)
        .fill({ color: 0xf8fafc, alpha: 0.025 })
        .stroke({ width: 1, color: 0xf8fafc, alpha: 0.28 });
      g.circle(pointer.x, pointer.y, 4).fill({ color: 0xf8fafc });
    }
  }

  /** `focus` is a species index to highlight, or null. */
  render(simulation, settings, focus) {
    this.#syncSlots(simulation.boids);
    this.#drawBoids(simulation.boids, settings, focus);
    this.#drawOverlay(simulation, settings);
    this.app.render();
  }

  destroy() {
    this.app.destroy({ removeView: false }, { children: true, texture: true, textureSource: true });
  }
}
