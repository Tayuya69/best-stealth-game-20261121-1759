// The archive floor: one level, read top-down.
// Legend: '#' wall, '.' floor, 'S' shelf, 'C' crate, 'E' exit,
// 'F' the file pedestal, 'I' an intel page, 'P' where the courier starts.
// Shelves and crates are cover: they block movement and a guard's sight.
// The two middle rows (6 and 13) are corridors with gaps in the room walls,
// so patrols can cross between rooms and the player can always find a way.

export const MAP = [
  '##############################',
  '#P....#......#......#........#',
  '#.....#..S...#...S..#...I....#',
  '#..S..#......#......#........#',
  '#.....#..S...#...C..#...S....#',
  '#.....#......#......#........#',
  '#..........S......S..........#',
  '#.....#......#......#...C....#',
  '#.....#..C...#...S..#...I....#',
  '#.....#......#......#........#',
  '#..S..#......#...C..#........#',
  '#.....#..S...#......#...S....#',
  '#.....#..C...#......#........#',
  '#..C.............S........F..#',
  '#.....#......#......#........#',
  '#.....#..S...#...S..#........#',
  '#.....#......#......#...S....#',
  '#.....#..C...#......#........#',
  '#.....#......#...I..#....EE..#',
  '##############################',
];

export const TILE_LEGEND = {
  wall: '#',
  floor: '.',
  shelf: 'S',
  crate: 'C',
  exit: 'E',
  file: 'F',
  intel: 'I',
  player: 'P',
};

export function tileAt(col, row) {
  if (col < 0 || row < 0 || row >= MAP.length || col >= MAP[0].length) return '#';
  return MAP[row][col];
}

export function isSolidTile(col, row) {
  const t = tileAt(col, row);
  return t === '#' || t === 'S' || t === 'C';
}

// Cover blocks a guard's line of sight as well as movement.
export function blocksSightTile(col, row) {
  return isSolidTile(col, row);
}

export function tileCenter(col, row) {
  return { x: col * 32 + 16, y: row * 32 + 16 };
}

export function findTiles(kind) {
  const out = [];
  for (let row = 0; row < MAP.length; row++) {
    for (let col = 0; col < MAP[row].length; col++) {
      if (MAP[row][col] === kind) out.push({ col, row });
    }
  }
  return out;
}

export function playerSpawn() {
  const spot = findTiles('P')[0];
  return tileCenter(spot.col, spot.row);
}

export function fileSpot() {
  const spot = findTiles('F')[0];
  return tileCenter(spot.col, spot.row);
}

export function intelSpots() {
  return findTiles('I').map((t) => tileCenter(t.col, t.row));
}

export function exitTiles() {
  return findTiles('E');
}

// Guard patrols: named guards, each with a loop of tile waypoints the
// player can learn. Every leg between two waypoints runs along a row or a
// column of open floor, so a guard never walks through a shelf or a wall.
export const GUARD_PATROLS = [
  {
    name: 'Rook',
    waypoints: [
      { col: 4, row: 6 },
      { col: 10, row: 6 },
      { col: 10, row: 13 },
      { col: 4, row: 13 },
    ],
    pauseSeconds: 1.1,
  },
  {
    name: 'Bishop',
    waypoints: [
      { col: 8, row: 2 },
      { col: 8, row: 17 },
    ],
    pauseSeconds: 1.6,
  },
  {
    name: 'Knight',
    waypoints: [
      { col: 16, row: 2 },
      { col: 16, row: 17 },
    ],
    pauseSeconds: 1.6,
  },
  {
    name: 'Queen',
    waypoints: [
      { col: 22, row: 6 },
      { col: 27, row: 6 },
      { col: 27, row: 12 },
      { col: 22, row: 12 },
    ],
    pauseSeconds: 1.1,
  },
];

// Sanity checks the build runs in Node before any screenshot is taken:
// every row is 30 tiles, every patrol leg is open floor, every special tile
// exists exactly where the game expects it.
export function validateLevel() {
  const problems = [];
  if (MAP.length !== 20) problems.push(`MAP has ${MAP.length} rows, expected 20`);
  MAP.forEach((row, i) => {
    if (row.length !== 30) problems.push(`row ${i} is ${row.length} tiles, expected 30`);
  });
  const count = (kind) => findTiles(kind).length;
  if (count('P') !== 1) problems.push(`player spawns: ${count('P')}, expected 1`);
  if (count('F') !== 1) problems.push(`file pedestals: ${count('F')}, expected 1`);
  if (count('I') !== 3) problems.push(`intel pages: ${count('I')}, expected 3`);
  if (count('E') !== 2) problems.push(`exit tiles: ${count('E')}, expected 2`);
  const walkable = (col, row) => !isSolidTile(col, row);
  const legClear = (a, b) => {
    if (a.col === b.col) {
      const [lo, hi] = [Math.min(a.row, b.row), Math.max(a.row, b.row)];
      for (let r = lo; r <= hi; r++) if (!walkable(a.col, r)) return `blocked at (${a.col},${r})`;
      return null;
    }
    if (a.row === b.row) {
      const [lo, hi] = [Math.min(a.col, b.col), Math.max(a.col, b.col)];
      for (let c = lo; c <= hi; c++) if (!walkable(c, a.row)) return `blocked at (${c},${a.row})`;
      return null;
    }
    return 'leg is diagonal';
  };
  GUARD_PATROLS.forEach((g) => {
    g.waypoints.forEach((w, i) => {
      if (!walkable(w.col, w.row)) problems.push(`${g.name} waypoint ${i} (${w.col},${w.row}) is solid`);
      const next = g.waypoints[(i + 1) % g.waypoints.length];
      const bad = legClear(w, next);
      if (bad) problems.push(`${g.name} leg ${i}->${(i + 1) % g.waypoints.length}: ${bad}`);
    });
  });
  return problems;
}
