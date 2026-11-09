const CAPACITY = 8;
const MAX_DEPTH = 8; // Stops endless splitting when many items share one point.

class Node {
  items = [];
  children = null;

  set(x, y, w, h, depth) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.depth = depth;
    this.items.length = 0;
    this.children = null;
    return this;
  }
}

/** Point quadtree over any object with numeric `x` and `y`. Only leaves hold items. */
export class Quadtree {
  #pool = [];
  #used = 0;
  #turn = 0;

  constructor(x, y, w, h) {
    this.reset(x, y, w, h);
  }

  /** Empties the tree. Bounds are half-open: [x, x + w) and [y, y + h). */
  reset(x, y, w, h) {
    this.#used = 0;
    this.root = this.#node(x, y, w, h, 0);
  }

  #node(x, y, w, h, depth) {
    const node = (this.#pool[this.#used] ??= new Node());
    this.#used++;
    return node.set(x, y, w, h, depth);
  }

  #childFor(node, item) {
    const east = item.x >= node.x + node.w / 2 ? 1 : 0;
    const south = item.y >= node.y + node.h / 2 ? 2 : 0;
    return node.children[east | south];
  }

  #split(node) {
    const { x, y, depth } = node;
    const w = node.w / 2;
    const h = node.h / 2;
    node.children = [
      this.#node(x, y, w, h, depth + 1),
      this.#node(x + w, y, w, h, depth + 1),
      this.#node(x, y + h, w, h, depth + 1),
      this.#node(x + w, y + h, w, h, depth + 1),
    ];
    for (const item of node.items) this.#childFor(node, item).items.push(item);
    node.items.length = 0;
  }

  /** @returns {boolean} false when the item is outside the root bounds. */
  insert(item) {
    let node = this.root;
    const inside =
      item.x >= node.x && item.x < node.x + node.w && item.y >= node.y && item.y < node.y + node.h;
    if (!inside) return false;

    for (;;) {
      if (!node.children) {
        if (node.items.length < CAPACITY || node.depth >= MAX_DEPTH) {
          node.items.push(item);
          return true;
        }
        this.#split(node);
      }
      node = this.#childFor(node, item);
    }
  }

  /**
   * Fills `out` with items within `radius` of (cx, cy), stopping at `limit`.
   * The child visiting order rotates between queries so that a limit does not
   * always favor the same quadrant, which would make a flock drift.
   */
  query(cx, cy, radius, out, limit = Infinity) {
    out.length = 0;
    this.#turn = (this.#turn + 1) & 3;
    this.#visit(this.root, cx, cy, radius * radius, out, limit);
    return out;
  }

  #visit(node, cx, cy, r2, out, limit) {
    const gapX = cx - Math.max(node.x, Math.min(cx, node.x + node.w));
    const gapY = cy - Math.max(node.y, Math.min(cy, node.y + node.h));
    if (gapX * gapX + gapY * gapY > r2) return;

    if (node.children) {
      for (let i = 0; i < 4 && out.length < limit; i++) {
        this.#visit(node.children[(this.#turn + i) & 3], cx, cy, r2, out, limit);
      }
      return;
    }

    for (const item of node.items) {
      if (out.length >= limit) return;
      const dx = item.x - cx;
      const dy = item.y - cy;
      if (dx * dx + dy * dy <= r2) out.push(item);
    }
  }

  /** Calls `fn(node)` for every leaf, for debug drawing. */
  forEachLeaf(fn) {
    for (let i = 0; i < this.#used; i++) {
      if (!this.#pool[i].children) fn(this.#pool[i]);
    }
  }
}
