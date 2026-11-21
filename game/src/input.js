// Keyboard + mouse state, kept apart from the game so the loop only ever
// reads this one object. WASD and arrows move, Shift sneaks, M mutes,
// Enter starts, R retries, and a click sets a click-to-move target.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.sneak = false;
    this.moveTarget = null; // canvas pixels, or null
    this.pressed = new Set(); // one-shot keys, drained by the game each frame
    this.canvas = canvas;
    this.onFirstGesture = null;
    this._gestured = false;

    window.addEventListener('keydown', (e) => {
      this._gesture();
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        e.preventDefault();
      }
      if (k === 'shift') this.sneak = true;
      if (k === 'w' || k === 'arrowup') this.keys.add('up');
      if (k === 's' || k === 'arrowdown') this.keys.add('down');
      if (k === 'a' || k === 'arrowleft') this.keys.add('left');
      if (k === 'd' || k === 'arrowright') this.keys.add('right');
      if (k === 'enter' || k === ' ' || k === 'r' || k === 'm' || k === 'escape') {
        this.pressed.add(k === ' ' ? 'space' : k);
      }
    });
    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'shift') this.sneak = false;
      if (k === 'w' || k === 'arrowup') this.keys.delete('up');
      if (k === 's' || k === 'arrowdown') this.keys.delete('down');
      if (k === 'a' || k === 'arrowleft') this.keys.delete('left');
      if (k === 'd' || k === 'arrowright') this.keys.delete('right');
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.sneak = false;
    });

    canvas.addEventListener('pointerdown', (e) => {
      this._gesture();
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      this.moveTarget = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    });
  }

  _gesture() {
    if (this._gestured) return;
    this._gestured = true;
    this.onFirstGesture?.();
  }

  // Did the player press this key since the last frame? Drains on read.
  wasPressed(key) {
    if (this.pressed.has(key)) {
      this.pressed.delete(key);
      return true;
    }
    return false;
  }

  endFrame() {
    this.pressed.clear();
  }
}
