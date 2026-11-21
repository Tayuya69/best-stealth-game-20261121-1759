// The HUD and the screens, as DOM over the canvas: a top bar with the
// objective, the clock, the score and the suspicion meter, an alert banner
// for the moment a guard turns, and title / caught / win overlays.

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export class Hud {
  constructor(root) {
    this.root = root;

    this.bar = el('div', 'hud-bar');
    this.objective = el('div', 'hud-objective', 'Lift the file, then reach the EXIT unseen.');
    this.timer = el('div', 'hud-timer', '0:00');
    this.score = el('div', 'hud-score', 'Score 0');
    this.intel = el('div', 'hud-intel', 'Intel 0/3');
    this.suspicionWrap = el('div', 'hud-suspicion');
    this.suspicionLabel = el('span', 'hud-suspicion-label', 'SEEN');
    this.suspicionBar = el('div', 'hud-suspicion-bar');
    this.suspicionFill = el('div', 'hud-suspicion-fill');
    this.suspicionBar.appendChild(this.suspicionFill);
    this.suspicionWrap.append(this.suspicionLabel, this.suspicionBar);
    this.bar.append(this.objective, this.suspicionWrap, this.intel, this.score, this.timer);
    root.appendChild(this.bar);

    this.banner = el('div', 'hud-banner hidden', '');
    root.appendChild(this.banner);

    this.overlay = el('div', 'screen-overlay');
    root.appendChild(this.overlay);
    this.overlayTitle = el('h1', 'screen-title', '');
    this.overlayBody = el('div', 'screen-body', '');
    this.overlayHint = el('div', 'screen-hint', '');
    this.overlay.append(this.overlayTitle, this.overlayBody, this.overlayHint);
  }

  showBanner(text, kind) {
    this.banner.textContent = text;
    this.banner.className = `hud-banner ${kind}`;
    clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => {
      this.banner.className = 'hud-banner hidden';
    }, 2200);
  }

  update(game) {
    const maxSuspicion = game.guards.reduce((m, g) => Math.max(m, g.suspicion), 0);
    this.suspicionFill.style.width = `${maxSuspicion}%`;
    this.suspicionFill.className =
      'hud-suspicion-fill' +
      (maxSuspicion >= 100 ? ' danger' : maxSuspicion >= 60 ? ' warn' : '');
    this.timer.textContent = formatTime(game.elapsed);
    this.score.textContent = `Score ${game.score}`;
    this.intel.textContent = `Intel ${game.intelTaken}/3`;
    this.objective.textContent = game.hasFile
      ? 'File secured — reach the EXIT unseen.'
      : 'Lift the file, then reach the EXIT unseen.';
    if (game.hasFile) this.objective.classList.add('done');
  }

  showTitle() {
    this.overlay.className = 'screen-overlay';
    this.overlayTitle.textContent = 'NIGHT SHIFT';
    this.overlayBody.innerHTML =
      '<p class="screen-tag">The Archive — a stealth job in one night.</p>' +
      '<p>You are the courier. Slip through the archive, lift the file from its ' +
      'pedestal, and reach the green EXIT unseen. Shelves and crates break a ' +
      'guard&rsquo;s line of sight — learn their patrols, wait for the cone to ' +
      'turn, and move. Intel pages are optional, worth 150 each.</p>' +
      '<p class="screen-controls">Move: WASD / arrows &nbsp;·&nbsp; Sneak: hold Shift &nbsp;·&nbsp; ' +
      'Click: walk there &nbsp;·&nbsp; M: mute &nbsp;·&nbsp; R: retry</p>';
    this.overlayHint.textContent = 'Press Enter or click to begin';
  }

  showCaught(guardName) {
    this.overlay.className = 'screen-overlay caught';
    this.overlayTitle.textContent = 'CAUGHT';
    this.overlayBody.innerHTML =
      `<p>${guardName} caught you in the open. The archive keeps its file — this time.</p>` +
      '<p class="screen-controls">Watch the cones. Move when they turn away, sneak when they are near.</p>';
    this.overlayHint.textContent = 'Press R to try again';
  }

  showWin(game) {
    this.overlay.className = 'screen-overlay win';
    this.overlayTitle.textContent = 'CLEAN GETAWAY';
    const minutes = formatTime(game.elapsed);
    this.overlayBody.innerHTML =
      `<p>You lifted the file and slipped out unseen.</p>` +
      `<p class="screen-stats">Time ${minutes} &nbsp;·&nbsp; Intel ${game.intelTaken}/3 &nbsp;·&nbsp; ` +
      `Alerts ${game.alerts} &nbsp;·&nbsp; <strong>Score ${game.score}</strong></p>` +
      '<p class="screen-controls">A faster, quieter run scores higher — every alert costs 100.</p>';
    this.overlayHint.textContent = 'Press R to run it again';
  }

  hideOverlay() {
    this.overlay.className = 'screen-overlay hidden';
  }
}
