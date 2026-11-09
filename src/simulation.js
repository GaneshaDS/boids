import { Quadtree } from './quadtree.js';
import { Boid } from './boid.js';
import { SPECIES } from './species.js';

const MAX_NEIGHBORS = 120; // Bounds the cost when a flock collapses into a point.
const PREDATOR_WEIGHT = 7;
const MAX_OBSTACLES = 60;
export const PREDATOR_RADIUS = 130;

/** World state and one physics step. Knows nothing about the DOM or drawing. */
export class Simulation {
  boids = [];
  obstacles = [];
  pointer = { x: 0, y: 0, active: false };
  tree = new Quadtree(0, 0, 1, 1);
  #neighbors = [];

  /** `params` is read every step, so it can be changed live. */
  constructor(params) {
    this.params = params;
  }

  #syncPopulation(width, height) {
    const { boids, params } = this;
    while (boids.length < params.agents) {
      const species = SPECIES[boids.length % SPECIES.length];
      boids.push(new Boid(Math.random() * width, Math.random() * height, species));
    }
    boids.length = params.agents;
  }

  /** Forces are computed for all boids before any boid moves. */
  step(dt, width, height) {
    const { boids, obstacles, pointer, tree, params } = this;
    const neighbors = this.#neighbors;
    this.#syncPopulation(width, height);

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

  addObstacle(x, y) {
    this.obstacles.push({ x, y, r: 16 + Math.random() * 22 });
    if (this.obstacles.length > MAX_OBSTACLES) this.obstacles.shift();
  }

  clearObstacles() {
    this.obstacles.length = 0;
  }
}
