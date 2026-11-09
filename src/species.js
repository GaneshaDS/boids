/**
 * Species differ in silhouette and color, so they stay apart even for
 * color-blind viewers, and in physics, so they also move differently.
 *
 * `path` and `mark` are SVG paths in a 24-unit box centered on the origin and
 * facing +x. One unit is one world pixel at size 1. The renderer and the legend
 * both draw from them. `shades` holds the tints a single boid can be born with.
 */
export const SPECIES = [
  {
    name: 'Escudo',
    trait: 'Lento y robusto',
    shades: [0xc4b5fd, 0xa78bfa, 0x8b5cf6, 0xddd6fe],
    size: 1,
    speed: 0.72,
    agility: 0.7,
    path: 'M10 0 L5 -8 L-6 -8 L-10 0 L-6 8 L5 8 Z',
    mark: 'M-4 -5 L0.5 -5 L5.5 0 L0.5 5 L-4 5 L0.5 0 Z',
  },
  {
    name: 'Manta',
    trait: 'Planeadora',
    shades: [0xfda4af, 0xfb7185, 0xf43f5e, 0xfecdd3],
    size: 0.85,
    speed: 0.86,
    agility: 0.85,
    path: 'M9 0 C5 -2 -1 -10 -9 -11 C-6.5 -5.5 -6 -2.5 -8 0 C-6 2.5 -6.5 5.5 -9 11 C-1 10 5 2 9 0 Z',
    mark: 'M2.8 0 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0 Z',
  },
  {
    name: 'Prisma',
    trait: 'Equilibrado',
    shades: [0xbef264, 0xa3e635, 0x84cc16, 0xd9f99d],
    size: 0.85,
    speed: 0.96,
    agility: 1,
    path: 'M11 0 L0 -7.5 L-11 0 L0 7.5 Z',
    mark: 'M-6 -0.9 L7 -0.9 L7 0.9 L-6 0.9 Z',
  },
  {
    name: 'Cometa',
    trait: 'Ágil',
    shades: [0xfcd34d, 0xfbbf24, 0xf59e0b, 0xfde68a],
    size: 0.8,
    speed: 1.06,
    agility: 1.35,
    path: 'M5 -6.5 A6.5 6.5 0 0 1 5 6.5 C1 6.5 -6 3 -11 0 C-6 -3 1 -6.5 5 -6.5 Z',
    mark: 'M5.5 0 m-2.8 0 a2.8 2.8 0 1 0 5.6 0 a2.8 2.8 0 1 0 -5.6 0 Z',
  },
  {
    name: 'Dardo',
    trait: 'El más veloz',
    shades: [0x67e8f9, 0x22d3ee, 0x06b6d4, 0xa5f3fc],
    size: 0.9,
    speed: 1.2,
    agility: 1.15,
    path: 'M12 0 L-9 -5.5 L-5 0 L-9 5.5 Z',
    mark: 'M8 0 L1 -1.4 L1 1.4 Z',
  },
].map((species, index) => ({ ...species, index }));

export const toCssColor = (hex) => `#${hex.toString(16).padStart(6, '0')}`;

/** Population of a species when `total` boids are dealt out in turn. */
export const speciesCount = (species, total) =>
  Math.floor((total + SPECIES.length - 1 - species.index) / SPECIES.length);
