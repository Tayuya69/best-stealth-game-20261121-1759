// Guards: patrol routes the player can learn, vision cones that react,
// and a suspicion meter with a chance to recover.
//
// States: 'patrol' -> 'suspicious' (saw something, moves to look) ->
// 'hunt' (saw the player clearly, gives chase) -> back to 'patrol' once
// the trail goes cold. A guard only ever sees the player inside its cone
// with a clear line of sight; shelves, crates and walls block the view.

import {
  TILE,
  GUARD_PATROL_SPEED,
  GUARD_SUSPICIOUS_SPEED,
  GUARD_HUNT_SPEED,
  GUARD_SIGHT_RANGE,
  GUARD_HALF_FOV,
  SUSPICION_RISE_CLOSE,
  SUSPICION_RISE_FAR,
  SUSPICION_FALL,
  SUSPICION_SNEAK_FACTOR,
  SUSPICION_ALERT_AT,
  SUSPICION_HUNT_AT,
  HUNT_LOSE_SIGHT_SECONDS,
  CAUGHT_DISTANCE,
} from './config.js';
import { blocksSightTile, tileCenter } from './level.js';

function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

// Step along the ray in small hops; any sight-blocking tile ends the view.
export function hasLineOfSight(ax, ay, bx, by) {
  const dist = distance(ax, ay, bx, by);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    if (blocksSightTile(Math.floor(x / TILE), Math.floor(y / TILE))) return false;
  }
  return true;
}

export function playerInCone(guard, px, py) {
  const dist = distance(guard.x, guard.y, px, py);
  if (dist > GUARD_SIGHT_RANGE) return { seen: false, dist };
  const bearing = angleTo(guard.x, guard.y, px, py);
  if (Math.abs(angleDiff(bearing, guard.facing)) > GUARD_HALF_FOV) return { seen: false, dist };
  if (!hasLineOfSight(guard.x, guard.y, px, py)) return { seen: false, dist };
  return { seen: true, dist };
}

export class Guard {
  constructor(patrol) {
    this.name = patrol.name;
    this.waypoints = patrol.waypoints.map((w) => tileCenter(w.col, w.row));
    this.pauseSeconds = patrol.pauseSeconds;
    this.waypointIndex = 0;
    this.x = this.waypoints[0].x;
    this.y = this.waypoints[0].y;
    this.facing = 0;
    this.state = 'patrol'; // patrol | suspicious | hunt
    this.suspicion = 0;
    this.pauseTimer = 0;
    this.unseenTimer = 0;
    this.lastSeen = { x: this.x, y: this.y };
    this.stepPhase = Math.random() * Math.PI * 2;
    this.stepTimer = 0;
    this.alertedOnce = false; // the alarm sting plays once per sighting
    this.lookTimer = 0;
  }

  speed() {
    if (this.state === 'hunt') return GUARD_HUNT_SPEED;
    if (this.state === 'suspicious') return GUARD_SUSPICIOUS_SPEED;
    return GUARD_PATROL_SPEED;
  }

  moveToward(tx, ty, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return true;
    const step = Math.min(d, this.speed() * dt);
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
    this.facing = Math.atan2(dy, dx);
    return d - step < 2;
  }

  update(dt, player) {
    const seen = playerInCone(this, player.x, player.y);
    const sneaking = player.sneaking;

    if (seen.seen) {
      this.lastSeen = { x: player.x, y: player.y };
      this.unseenTimer = 0;
      // Closer is scarier; sneaking buys time.
      const closeness = 1 - seen.dist / GUARD_SIGHT_RANGE;
      let rise = SUSPICION_RISE_FAR + (SUSPICION_RISE_CLOSE - SUSPICION_RISE_FAR) * closeness;
      if (sneaking) rise *= SUSPICION_SNEAK_FACTOR;
      this.suspicion = Math.min(100, this.suspicion + rise * dt);
    } else {
      this.unseenTimer += dt;
      this.suspicion = Math.max(0, this.suspicion - SUSPICION_FALL * dt);
    }

    // State changes, with the alarm sting on the first crossing.
    if (this.suspicion >= SUSPICION_HUNT_AT && this.state !== 'hunt') {
      this.state = 'hunt';
      this.unseenTimer = 0;
      if (!this.alertedOnce) {
        this.alertedOnce = true;
        player.onFullAlert?.(this);
      }
    } else if (
      this.suspicion >= SUSPICION_ALERT_AT &&
      this.state === 'patrol'
    ) {
      this.state = 'suspicious';
      if (!this.alertedOnce) {
        this.alertedOnce = true;
        player.onSpotted?.(this);
      }
    }

    if (this.state === 'hunt') {
      if (seen.seen) {
        this.moveToward(player.x, player.y, dt);
      } else if (this.unseenTimer > HUNT_LOSE_SIGHT_SECONDS) {
        // Trail cold: give up, walk back to the route, suspicion drains.
        this.state = 'patrol';
        this.alertedOnce = false;
      } else {
        // Keep pushing to the last place the player was seen.
        this.moveToward(this.lastSeen.x, this.lastSeen.y, dt);
      }
    } else if (this.state === 'suspicious') {
      if (this.suspicion < SUSPICION_ALERT_AT - 10) {
        this.state = 'patrol';
        this.alertedOnce = false;
      } else {
        // Walk to the last seen spot, look around, then give up.
        const arrived = this.moveToward(this.lastSeen.x, this.lastSeen.y, dt);
        if (arrived) {
          this.lookTimer += dt;
          this.facing += dt * 1.6; // slow scan of the room
          if (this.lookTimer > 2.2) {
            this.lookTimer = 0;
            this.state = 'patrol';
            this.alertedOnce = false;
          }
        }
      }
    } else {
      // Patrol: walk the loop, pausing at each waypoint to look around.
      if (this.pauseTimer > 0) {
        this.pauseTimer -= dt;
        this.facing += dt * 0.7;
      } else {
        const target = this.waypoints[this.waypointIndex];
        const arrived = this.moveToward(target.x, target.y, dt);
        if (arrived) {
          this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
          this.pauseTimer = this.pauseSeconds;
        }
      }
    }

    // Footstep timing: faster when the guard moves faster.
    this.stepTimer += dt * (this.speed() / GUARD_PATROL_SPEED);
    if (this.stepTimer > 0.55) {
      this.stepTimer = 0;
      player.onGuardStep?.(this);
    }
  }

  catches(player) {
    return distance(this.x, this.y, player.x, player.y) < CAUGHT_DISTANCE;
  }

  coneColor() {
    if (this.state === 'hunt') return 'hunt';
    if (this.state === 'suspicious') return 'suspicious';
    return 'calm';
  }
}
