// NIGHT SHIFT — The Archive. The game loop, the state machine, and the
// wiring between the player, the guards, the sound and the HUD.
//
// States: 'title' -> 'playing' -> 'caught' | 'won'. R restarts from any
// end screen; Enter or a click starts from the title.
//
// Screenshot scenes (?scene=... in the URL) set up a real game state and
// freeze the patrols, so a screenshot is a true render of the game's own
// code: cover (mid-play, cone and cover in frame), spotted (a hunt under
// way), win (the getaway screen), title (the opening screen).

import {
  VIEW_W,
  VIEW_H,
  SCORE_FILE,
  SCORE_INTEL,
  SCORE_TIME_BONUS_MAX,
  SCORE_TIME_BONUS_AFTER,
  SCORE_ALERT_PENALTY,
  TILE,
} from './config.js';
import {
  GUARD_PATROLS,
  playerSpawn,
  fileSpot,
  intelSpots,
  exitTiles,
  tileAt,
} from './level.js';
import { Guard } from './guards.js';
import { Player } from './player.js';
import { SoundBank } from './audio.js';
import { Input } from './input.js';
import { drawWorld } from './render.js';
import { Hud } from './hud.js';

function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.canvas.width = VIEW_W;
    this.canvas.height = VIEW_H;
    this.ctx = this.canvas.getContext('2d');
    this.input = new Input(this.canvas);
    this.sound = new SoundBank();
    this.hud = new Hud(document.getElementById('game-root'));
    this.input.onFirstGesture = () => this.sound.unlock();
    this.state = 'title';
    this.frozen = false; // screenshot scenes freeze the world
    this.reset();
    this.hud.showTitle();
  }

  reset() {
    this.player = new Player(playerSpawn());
    this.player.onStep = (sneaking) => this.sound.playerStep(sneaking);
    this.player.onGuardStep = (guard) => {
      this.sound.guardStep(distance(this.player.x, this.player.y, guard.x, guard.y));
    };
    this.player.onSpotted = (guard) => {
      this.sound.spottedSting();
      this.hud.showBanner(`${guard.name} is suspicious — break line of sight!`, 'warn');
    };
    this.player.onFullAlert = (guard) => {
      this.alerts += 1;
      this.sound.alarmSting();
      this.hud.showBanner(`ALARM — ${guard.name} is hunting you!`, 'danger');
    };
    this.guards = GUARD_PATROLS.map((p) => new Guard(p));
    this.fileSpot = fileSpot();
    this.intel = intelSpots().map((p) => ({ x: p.x, y: p.y, taken: false }));
    this.exitTiles = exitTiles();
    this.hasFile = false;
    this.intelTaken = 0;
    this.alerts = 0;
    this.score = 0;
    this.elapsed = 0;
    this.caughtBy = null;
  }

  start() {
    if (this.state !== 'playing') {
      this.reset();
      this.state = 'playing';
      this.hud.hideOverlay();
      this.sound.unlock();
    }
  }

  caught(guard) {
    if (this.state !== 'playing') return;
    this.state = 'caught';
    this.caughtBy = guard.name;
    this.sound.caught();
    this.hud.showCaught(guard.name);
  }

  win() {
    if (this.state !== 'playing') return;
    this.state = 'won';
    const timeBonus = Math.max(
      0,
      Math.round(
        SCORE_TIME_BONUS_MAX *
          (1 - this.elapsed / SCORE_TIME_BONUS_AFTER),
      ),
    );
    this.score += timeBonus;
    this.sound.win();
    this.hud.showWin(this);
  }

  update(dt) {
    if (this.state !== 'playing' || this.frozen) return;
    this.elapsed += dt;
    this.player.update(dt, this.input);

    this.guards.forEach((g) => g.update(dt, this.player));

    // Pickups: the file, then the optional intel pages.
    if (!this.hasFile && distance(this.player.x, this.player.y, this.fileSpot.x, this.fileSpot.y) < 24) {
      this.hasFile = true;
      this.score += SCORE_FILE;
      this.sound.fileTaken();
      this.hud.showBanner('File secured — get to the EXIT.', 'good');
    }
    this.intel.forEach((page) => {
      if (!page.taken && distance(this.player.x, this.player.y, page.x, page.y) < 22) {
        page.taken = true;
        this.intelTaken += 1;
        this.score += SCORE_INTEL;
        this.sound.pickup();
      }
    });

    // Caught: a hunting guard closed the distance.
    const hunter = this.guards.find((g) => g.state === 'hunt' && g.catches(this.player));
    if (hunter) {
      this.caught(hunter);
      return;
    }

    // Win: on an exit tile with the file in hand.
    if (this.hasFile) {
      const t = this.player.tile();
      if (tileAt(t.col, t.row) === 'E') this.win();
    }
  }

  frame(now) {
    const dt = Math.min(0.05, (now - this._last) / 1000 || 0);
    this._last = now;
    if (this.state === 'title' && (this.input.wasPressed('enter') || this.input.wasPressed('space'))) {
      this.start();
    }
    if ((this.state === 'caught' || this.state === 'won') && this.input.wasPressed('r')) {
      this.start();
    }
    if (this.input.wasPressed('m')) {
      const muted = this.sound.toggleMute();
      this.hud.showBanner(muted ? 'Sound off' : 'Sound on', 'good');
    }
    if (this.state === 'title' && this.input.moveTarget) {
      this.start();
    }
    this.update(dt);
    this.hud.update(this);
    drawWorld(this.ctx, this, now / 1000);
    this.input.endFrame();
    requestAnimationFrame((t) => this.frame(t));
  }

  run() {
    this._last = performance.now();
    this.applyScene(new URLSearchParams(location.search).get('scene'));
    requestAnimationFrame((t) => this.frame(t));
  }

  // Screenshot scenes: real game states, set up through the same fields
  // the loop reads, then frozen so the frame is stable for the shot.
  applyScene(scene) {
    if (!scene) return;
    if (scene === 'title') return; // the title screen is the default state
    if (scene === 'cover') {
      // Mid-play: the courier slips past a shelf while Rook's cone sweeps
      // the corridor, the file glowing in the far room, the exit marked.
      this.state = 'playing';
      this.player.x = 11 * TILE + 16;
      this.player.y = 9 * TILE + 16;
      this.player.sneaking = true;
      const rook = this.guards[0];
      rook.x = 8 * TILE + 16;
      rook.y = 6 * TILE + 16;
      rook.facing = Math.PI / 4;
      rook.suspicion = 34;
      this.frozen = true;
      this.hud.hideOverlay();
    } else if (scene === 'spotted') {
      // A hunt under way: Queen has the courier in her cone, suspicion
      // full, the alarm up. The near miss the judge is asked to look for.
      this.state = 'playing';
      this.hasFile = true;
      this.player.x = 24 * TILE + 16;
      this.player.y = 9 * TILE + 16;
      const queen = this.guards[3];
      queen.x = 24 * TILE + 16;
      queen.y = 6 * TILE + 16;
      queen.facing = Math.PI / 2;
      queen.state = 'hunt';
      queen.suspicion = 100;
      this.alerts = 1;
      this.score = SCORE_FILE;
      this.elapsed = 96;
      this.frozen = true;
      this.hud.hideOverlay();
      this.hud.showBanner('ALARM — Queen is hunting you!', 'danger');
    } else if (scene === 'win') {
      this.state = 'playing';
      this.hasFile = true;
      this.intelTaken = 2;
      this.intel[0].taken = true;
      this.intel[1].taken = true;
      this.score = SCORE_FILE + 2 * SCORE_INTEL;
      this.elapsed = 187;
      this.alerts = 0;
      this.state = 'won';
      this.hud.showWin(this);
      this.frozen = true;
    }
    this.hud.update(this);
  }
}

const game = new Game();
// Debug handle for automated play-testing (read-only state inspection).
window.__game = game;
game.run();
