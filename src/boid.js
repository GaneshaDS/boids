const MAX_SPEED = 3.6;
const MIN_SPEED = 1.4;
const MAX_FORCE = 0.09;
const SEPARATION_RATIO = 0.45; // Separation radius as a fraction of vision.
const EDGE_MARGIN = 40;
const EDGE_WEIGHT = 3;
const OBSTACLE_MARGIN = 60;
const OBSTACLE_WEIGHT = 8;

export class Boid {
  constructor(x, y) {
    const angle = Math.random() * Math.PI * 2;
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * MAX_SPEED;
    this.vy = Math.sin(angle) * MAX_SPEED;
    this.ax = 0;
    this.ay = 0;
  }

  /** Reynolds steering: desired velocity along (dx, dy) minus current, capped. */
  #steer(dx, dy, weight) {
    const length = Math.hypot(dx, dy);
    if (length === 0 || weight === 0) return;

    let sx = (dx / length) * MAX_SPEED - this.vx;
    let sy = (dy / length) * MAX_SPEED - this.vy;
    const force = Math.hypot(sx, sy);
    if (force > MAX_FORCE) {
      sx *= MAX_FORCE / force;
      sy *= MAX_FORCE / force;
    }
    this.ax += sx * weight;
    this.ay += sy * weight;
  }

  flock(neighbors, { separation, alignment, cohesion, vision }) {
    const separationR2 = (vision * SEPARATION_RATIO) ** 2;
    let count = 0;
    let sepX = 0;
    let sepY = 0;
    let velX = 0;
    let velY = 0;
    let posX = 0;
    let posY = 0;

    for (const other of neighbors) {
      if (other === this) continue;
      count++;
      velX += other.vx;
      velY += other.vy;
      posX += other.x;
      posY += other.y;

      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > 0 && d2 < separationR2) {
        // Dividing by d² yields a unit vector scaled by 1/d: closer pushes harder.
        sepX += dx / d2;
        sepY += dy / d2;
      }
    }
    if (count === 0) return;

    this.#steer(sepX, sepY, separation);
    this.#steer(velX, velY, alignment);
    this.#steer(posX / count - this.x, posY / count - this.y, cohesion);
  }

  /** Flees (px, py) inside `radius`, harder the closer it is. */
  flee(px, py, radius, strength) {
    const dx = this.x - px;
    const dy = this.y - py;
    const d2 = dx * dx + dy * dy;
    if (d2 === 0 || d2 >= radius * radius) return;
    this.#steer(dx, dy, strength * (1 - Math.sqrt(d2) / radius));
  }

  /** Repels from a circular obstacle and never lets the boid end up inside it. */
  avoid(obstacle) {
    this.flee(obstacle.x, obstacle.y, obstacle.r + OBSTACLE_MARGIN, OBSTACLE_WEIGHT);

    const dx = this.x - obstacle.x;
    const dy = this.y - obstacle.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 0 && distance < obstacle.r) {
      this.x = obstacle.x + (dx / distance) * obstacle.r;
      this.y = obstacle.y + (dy / distance) * obstacle.r;
    }
  }

  keepInside(width, height) {
    const dx = (this.x < EDGE_MARGIN ? 1 : 0) - (this.x > width - EDGE_MARGIN ? 1 : 0);
    const dy = (this.y < EDGE_MARGIN ? 1 : 0) - (this.y > height - EDGE_MARGIN ? 1 : 0);
    this.#steer(dx, dy, EDGE_WEIGHT);
  }

  /** Integrates the accumulated force. `dt` is in 60 Hz frames (1 = 16.7 ms). */
  move(dt, width, height) {
    this.vx += this.ax * dt;
    this.vy += this.ay * dt;
    this.ax = 0;
    this.ay = 0;

    const speed = Math.hypot(this.vx, this.vy);
    const limited = Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed));
    if (speed > 0 && limited !== speed) {
      this.vx *= limited / speed;
      this.vy *= limited / speed;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.x < 0 || this.x > width) {
      this.x = Math.max(0, Math.min(width, this.x));
      this.vx = -this.vx;
    }
    if (this.y < 0 || this.y > height) {
      this.y = Math.max(0, Math.min(height, this.y));
      this.vy = -this.vy;
    }
  }
}
