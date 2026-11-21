// The courier: smooth top-down movement with wall sliding, a sneak walk,
// and click-to-move for the mouse. The player is a circle of radius 11;
// collision tests the circle against the solid tiles around it.

import { TILE, PLAYER_WALK_SPEED, PLAYER_SNEAK_SPEED } from './config.js';
import { isSolidTile } from './level.js';

const RADIUS = 11;

function circleHitsWall(x, y) {
  const left = Math.floor((x - RADIUS) / TILE);
  const right = Math.floor((x + RADIUS) / TILE);
  const top = Math.floor((y - RADIUS) / TILE);
  const bottom = Math.floor((y + RADIUS) / TILE);
  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      if (!isSolidTile(col, row)) continue;
      // Closest point on the tile to the circle centre.
      const cx = Math.max(col * TILE, Math.min(x, col * TILE + TILE));
      const cy = Math.max(row * TILE, Math.min(y, row * TILE + TILE));
      if ((x - cx) ** 2 + (y - cy) ** 2 < RADIUS * RADIUS) return true;
    }
  }
  return false;
}

export class Player {
  constructor(spawn) {
    this.x = spawn.x;
    this.y = spawn.y;
    this.sneaking = false;
    this.moveTarget = null; // {x, y} while click-to-move is active
    this.stepTimer = 0;
    // Hooks the game wires up: sound and scoring callbacks.
    this.onGuardStep = null;
    this.onSpotted = null;
    this.onFullAlert = null;
    this.onStep = null;
  }

  tile() {
    return { col: Math.floor(this.x / TILE), row: Math.floor(this.y / TILE) };
  }

  // Try the move one axis at a time so the player slides along walls
  // instead of sticking on corners.
  tryMove(dx, dy) {
    if (dx !== 0 && !circleHitsWall(this.x + dx, this.y)) this.x += dx;
    if (dy !== 0 && !circleHitsWall(this.x, this.y + dy)) this.y += dy;
  }

  update(dt, input) {
    this.sneaking = input.sneak;
    const speed = this.sneaking ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
    let moved = false;

    if (input.moveTarget) {
      // Click-to-move: steer at the clicked point, stop on arrival or when
      // the player takes the keys again.
      this.moveTarget = input.moveTarget;
    }
    if (input.keys.size > 0) this.moveTarget = null;

    let mx = 0;
    let my = 0;
    if (input.keys.has('up')) my -= 1;
    if (input.keys.has('down')) my += 1;
    if (input.keys.has('left')) mx -= 1;
    if (input.keys.has('right')) mx += 1;

    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my);
      this.tryMove((mx / len) * speed * dt, (my / len) * speed * dt);
      moved = true;
    } else if (this.moveTarget) {
      const dx = this.moveTarget.x - this.x;
      const dy = this.moveTarget.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 6) {
        this.moveTarget = null;
      } else {
        const step = Math.min(d, speed * dt);
        this.tryMove((dx / d) * step, (dy / d) * step);
        moved = true;
      }
    }

    if (moved) {
      this.stepTimer += dt * (this.sneaking ? 0.6 : 1);
      if (this.stepTimer > 0.42) {
        this.stepTimer = 0;
        this.onStep?.(this.sneaking);
      }
    }
  }
}
