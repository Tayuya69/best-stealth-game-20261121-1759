[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/?ref=fmy43x6e&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/Tayuya69/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/competitions/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/Tayuya69/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/competitions/best-stealth-game-20261121-1759)

# NIGHT SHIFT — The Archive

A top-down stealth game, built for the [make.fun "Make the best stealth game" competition](https://make.fun/competitions/best-stealth-game-20261121-1759). You are a courier slipping through a corporate archive at night: lift the file from its pedestal and reach the green EXIT unseen.

## How it plays

- **One polished level, seen from above** — four rooms joined by two corridors, shelves and crates as cover, a marked exit.
- **Guards with visible vision cones** patrol fixed routes you can learn (Rook, Bishop, Knight, Queen). A cone reacts as you expect: suspicion rises while you stand inside a lit cone, falls when you break line of sight.
- **A detection system with a chance to recover** — suspicion meter, three alert states (calm / suspicious / hunting), and a hunt that ends if you stay unseen for a few seconds.
- **Depth** — patrols to learn, routes that reward patience, and three optional intel pages worth 150 points each.
- **Feel and polish** — smooth movement with wall sliding, a sneak walk (Shift), click-to-move, WebAudio synth footsteps that tell you where a guard is, an alarm sting on a near miss, title / caught / win screens, timer and score.

## Controls

| Input | Action |
|---|---|
| WASD / arrow keys | Move |
| Shift (hold) | Sneak — slower, harder to spot |
| Click | Walk to that point |
| M | Mute |
| R | Retry after being caught or winning |
| Enter | Start |

## Play it

Serve `game/` with any static server and open `index.html` in a desktop browser — no build step, no network requests, everything is a file under `game/`:

```sh
cd game && python3 -m http.server 8123
# open http://localhost:8123
```

Screenshot scenes (`?scene=cover`, `?scene=spotted`, `?scene=win`, `?scene=title`) set up real game states for renders.

## Layout

- `game/index.html` — the page: canvas, HUD bar, screens.
- `game/src/config.js` — every tuned number in one place.
- `game/src/level.js` — the archive floor, patrol routes, spawn points.
- `game/src/guards.js` — patrols, vision cones, suspicion, hunting.
- `game/src/player.js` — movement, wall sliding, sneak, click-to-move.
- `game/src/audio.js` — synthesised footsteps, alarm, pickups (WebAudio, no files).
- `game/src/input.js` — keyboard + mouse state.
- `game/src/render.js` — canvas drawing: floor, cover, cones, lighting.
- `game/src/hud.js` — HUD bar, alert banner, title / caught / win screens.
- `game/src/main.js` — game loop and state machine.
- `main.ts` — the make.fun entrypoint: copies `game/` + `screenshots/` to `/output` and writes `dossier.json`.
- `screenshots/` — four real renders of the game's own code (cover first).

## License

MIT — see [LICENSE](LICENSE).
