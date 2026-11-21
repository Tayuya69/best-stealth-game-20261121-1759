// Shared constants for NIGHT SHIFT — The Archive.
// One place holds every number the rest of the game tunes against, so a
// balance change never means hunting through the render or guard code.

export const TILE = 32;
export const COLS = 30;
export const ROWS = 20;
export const VIEW_W = COLS * TILE; // 960
export const VIEW_H = ROWS * TILE; // 640

// Movement speeds, pixels per second.
export const PLAYER_WALK_SPEED = 148;
export const PLAYER_SNEAK_SPEED = 72;
export const GUARD_PATROL_SPEED = 62;
export const GUARD_SUSPICIOUS_SPEED = 88;
export const GUARD_HUNT_SPEED = 132;

// Vision: how far a guard sees and how wide the cone opens.
export const GUARD_SIGHT_RANGE = 205;
export const GUARD_HALF_FOV = 0.66; // radians, about 38 degrees each side

// Suspicion 0..100. Rises while the player stands inside a lit cone with a
// clear line of sight, falls when hidden or out of sight.
export const SUSPICION_RISE_CLOSE = 68; // per second at point blank
export const SUSPICION_RISE_FAR = 26; // per second at the edge of range
export const SUSPICION_FALL = 24; // per second while unseen
export const SUSPICION_SNEAK_FACTOR = 0.45; // sneaking is much harder to spot
export const SUSPICION_ALERT_AT = 60; // guard turns suspicious, alarm sting
export const SUSPICION_HUNT_AT = 100; // guard gives chase
export const HUNT_LOSE_SIGHT_SECONDS = 4; // unseen this long ends the hunt
export const CAUGHT_DISTANCE = 26; // guard this close catches the player

// Scoring.
export const SCORE_FILE = 500;
export const SCORE_INTEL = 150;
export const SCORE_TIME_BONUS_MAX = 300; // shrinks as the clock runs
export const SCORE_TIME_BONUS_AFTER = 240; // seconds after which it is gone
export const SCORE_ALERT_PENALTY = 100; // per full hunt triggered

// Palette: a night archive — cold floor, warm lamplight, red alarm.
export const COLORS = {
  floorA: '#20242e',
  floorB: '#1b1e28',
  floorLine: '#262b38',
  wall: '#3a3f4d',
  wallTop: '#565d70',
  shelf: '#6b4a2a',
  shelfEdge: '#8a6136',
  shelfBookA: '#c94f43',
  shelfBookB: '#4f7ec9',
  shelfBookC: '#c9a44f',
  crate: '#7a6742',
  crateEdge: '#a8895a',
  exitFloor: '#1d5c33',
  exitGlow: '#39d97a',
  fileGlow: '#ffd75e',
  intelPaper: '#efe8d2',
  player: '#e8e6df',
  playerHood: '#2f6fb2',
  guard: '#d95b4a',
  guardDark: '#8c2f24',
  coneCalm: 'rgba(255, 214, 90, 0.20)',
  coneSuspicious: 'rgba(255, 150, 50, 0.30)',
  coneHunt: 'rgba(255, 60, 40, 0.38)',
  shadow: 'rgba(4, 6, 12, 0.55)',
};
