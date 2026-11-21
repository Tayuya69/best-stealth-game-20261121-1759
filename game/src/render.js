// Everything drawn on the canvas: the archive floor, the cover that hides
// the player, the guards' vision cones, the player, and the night lighting
// that shows what is safe. The HUD and the title/caught/win screens are
// DOM, handled by hud.js; this file only paints the game world.

import { TILE, COLS, ROWS, VIEW_W, VIEW_H, COLORS, GUARD_SIGHT_RANGE, GUARD_HALF_FOV } from './config.js';
import { MAP } from './level.js';

function conePolygon(ctx, guard) {
  const steps = 26;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  for (let i = 0; i <= steps; i++) {
    const a = guard.facing - GUARD_HALF_FOV + (2 * GUARD_HALF_FOV * i) / steps;
    ctx.lineTo(guard.x + Math.cos(a) * GUARD_SIGHT_RANGE, guard.y + Math.sin(a) * GUARD_SIGHT_RANGE);
  }
  ctx.closePath();
}

function drawFloor(ctx) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const t = MAP[row][col];
      const x = col * TILE;
      const y = row * TILE;
      ctx.fillStyle = (col + row) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(x, y, TILE, TILE);
      if (t === 'E') {
        // The exit: a lit green doorway the courier must reach unseen.
        ctx.fillStyle = COLORS.exitFloor;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = COLORS.exitGlow;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
      }
    }
  }
  // Faint tile seams, so the floor reads as boards, not a flat void.
  ctx.strokeStyle = COLORS.floorLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 0; c <= COLS; c++) {
    ctx.moveTo(c * TILE + 0.5, 0);
    ctx.lineTo(c * TILE + 0.5, VIEW_H);
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.moveTo(0, r * TILE + 0.5);
    ctx.lineTo(VIEW_W, r * TILE + 0.5);
  }
  ctx.stroke();
}

function drawCover(ctx) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const t = MAP[row][col];
      const x = col * TILE;
      const y = row * TILE;
      if (t === '#') {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(x, y, TILE, 5);
      } else if (t === 'S') {
        // Shelf: a tall archive rack, book spines in three colours.
        ctx.fillStyle = COLORS.shelf;
        ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = COLORS.shelfEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
        const spineColors = [COLORS.shelfBookA, COLORS.shelfBookB, COLORS.shelfBookC];
        for (let s = 0; s < 3; s++) {
          ctx.fillStyle = spineColors[(col + row + s) % 3];
          ctx.fillRect(x + 5 + s * 8, y + 6, 5, TILE - 12);
        }
      } else if (t === 'C') {
        // Crate: low cover, still tall enough to break a guard's sight.
        ctx.fillStyle = COLORS.crate;
        ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
        ctx.strokeStyle = COLORS.crateEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 4);
        ctx.lineTo(x + TILE - 4, y + TILE - 4);
        ctx.moveTo(x + TILE - 4, y + 4);
        ctx.lineTo(x + 4, y + TILE - 4);
        ctx.stroke();
      }
    }
  }
}

function drawPickups(ctx, game, time) {
  // The file: the objective, glowing on its pedestal until taken.
  if (!game.hasFile) {
    const f = game.fileSpot;
    const pulse = 0.65 + 0.35 * Math.sin(time * 3);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = COLORS.fileGlow;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff6d8';
    ctx.fillRect(f.x - 7, f.y - 9, 14, 18);
    ctx.strokeStyle = '#8a7a3a';
    ctx.lineWidth = 1;
    ctx.strokeRect(f.x - 7, f.y - 9, 14, 18);
    ctx.beginPath();
    ctx.moveTo(f.x - 4, f.y - 3);
    ctx.lineTo(f.x + 4, f.y - 3);
    ctx.moveTo(f.x - 4, f.y + 1);
    ctx.lineTo(f.x + 4, f.y + 1);
    ctx.moveTo(f.x - 4, f.y + 5);
    ctx.lineTo(f.x + 1, f.y + 5);
    ctx.stroke();
  }
  // Intel pages: small white sheets, optional, worth points.
  game.intel.forEach((page) => {
    if (page.taken) return;
    const bob = Math.sin(time * 2 + page.x) * 1.5;
    ctx.fillStyle = COLORS.intelPaper;
    ctx.fillRect(page.x - 6, page.y - 8 + bob, 12, 16);
    ctx.strokeStyle = '#7a7462';
    ctx.lineWidth = 1;
    ctx.strokeRect(page.x - 6, page.y - 8 + bob, 12, 16);
    ctx.beginPath();
    ctx.moveTo(page.x - 3, page.y - 3 + bob);
    ctx.lineTo(page.x + 3, page.y - 3 + bob);
    ctx.moveTo(page.x - 3, page.y + 1 + bob);
    ctx.lineTo(page.x + 3, page.y + 1 + bob);
    ctx.stroke();
  });
  // The exit sign over the green doorway.
  ctx.fillStyle = COLORS.exitGlow;
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  game.exitTiles.forEach((t) => {
    ctx.fillText('EXIT', t.col * TILE + TILE / 2, t.row * TILE - 8);
  });
}

function drawCones(ctx, guards) {
  guards.forEach((g) => {
    const kind = g.coneColor();
    ctx.fillStyle =
      kind === 'hunt'
        ? COLORS.coneHunt
        : kind === 'suspicious'
          ? COLORS.coneSuspicious
          : COLORS.coneCalm;
    conePolygon(ctx, g);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 220, 120, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });
}

function drawGuards(ctx, guards, time) {
  guards.forEach((g) => {
    // A guard reads as a red figure with a pale visor in the direction
    // it faces, so its patrol direction is clear at a glance.
    ctx.fillStyle = g.state === 'hunt' ? '#ff5a3c' : COLORS.guard;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.guardDark;
    ctx.lineWidth = 2;
    ctx.stroke();
    const vx = g.x + Math.cos(g.facing) * 8;
    const vy = g.y + Math.sin(g.facing) * 8;
    ctx.fillStyle = '#ffe9c9';
    ctx.beginPath();
    ctx.arc(vx, vy, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // Suspicion shown as a small arc over the guard's head.
    if (g.suspicion > 1) {
      const frac = g.suspicion / 100;
      ctx.strokeStyle = frac >= 1 ? '#ff4a30' : frac >= 0.6 ? '#ff9a2e' : '#ffd65a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.x, g.y - 20, 8, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.stroke();
    }
    // A "!" when the guard is actively hunting.
    if (g.state === 'hunt') {
      const bounce = Math.sin(time * 8) * 2;
      ctx.fillStyle = '#ff3b28';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', g.x, g.y - 32 + bounce);
    } else if (g.state === 'suspicious') {
      ctx.fillStyle = '#ffb02e';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', g.x, g.y - 30);
    }
  });
}

function drawPlayer(ctx, player, time) {
  const bob = player.sneaking ? 0 : Math.sin(time * 10) * 0.6;
  // Soft shadow under the courier.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + 9, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hooded figure: pale face, blue hood, darker outline.
  ctx.fillStyle = COLORS.playerHood;
  ctx.beginPath();
  ctx.arc(player.x, player.y + bob, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1d4a7a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(player.x, player.y + bob, 6.5, 0, Math.PI * 2);
  ctx.fill();
  // A faint ring while sneaking, so the slow walk reads as deliberate.
  if (player.sneaking) {
    ctx.strokeStyle = 'rgba(180, 210, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 17, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawLighting(ctx, player) {
  // Night: the whole floor sits under a dark wash, cut by a pool of light
  // around the courier so the player can read what is safe nearby.
  const light = ctx.createRadialGradient(
    player.x, player.y, 60,
    player.x, player.y, 300,
  );
  light.addColorStop(0, 'rgba(4, 6, 12, 0)');
  light.addColorStop(1, COLORS.shadow);
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Vignette at the frame edges.
  const edge = ctx.createRadialGradient(
    VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45,
    VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.85,
  );
  edge.addColorStop(0, 'rgba(0, 0, 0, 0)');
  edge.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

export function drawWorld(ctx, game, time) {
  drawFloor(ctx);
  drawPickups(ctx, game, time);
  drawCones(ctx, game.guards);
  drawCover(ctx);
  drawGuards(ctx, game.guards, time);
  drawPlayer(ctx, game.player, time);
  if (game.player.moveTarget) {
    // Click-to-move marker: a small ring where the courier is headed.
    const t = game.player.moveTarget;
    ctx.strokeStyle = 'rgba(220, 230, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 7, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawLighting(ctx, game.player);
}
