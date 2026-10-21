// Pointer and keyboard state in low-resolution game pixels. The UI reads per-frame edges
// (pressed / released / clicked) and the app clears them at the end of every frame.

export class Input {
  /** pointer position in game pixels */
  x = -1;
  y = -1;
  down = false;
  rightDown = false;
  pressed = false;
  released = false;
  rightPressed = false;
  /** pointer moved while held, from where it was pressed */
  dragging = false;
  dragX = 0;
  dragY = 0;
  wheel = 0;
  /** set by the UI when the pointer is over a panel, so the world ignores it */
  captured = false;
  keys = new Set<string>();
  keysPressed = new Set<string>();
  private scale = 1;

  constructor(private canvas: HTMLCanvasElement) {
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      this.move(e);
      canvas.setPointerCapture(e.pointerId);
      if (e.button === 2) {
        this.rightDown = true;
        this.rightPressed = true;
      } else {
        this.down = true;
        this.pressed = true;
        this.dragging = false;
        this.dragX = this.x;
        this.dragY = this.y;
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      this.move(e);
      if (this.down && (Math.abs(this.x - this.dragX) > 2 || Math.abs(this.y - this.dragY) > 2)) this.dragging = true;
    });
    canvas.addEventListener('pointerup', (e) => {
      this.move(e);
      if (e.button === 2) this.rightDown = false;
      else {
        this.down = false;
        this.released = true;
      }
    });
    canvas.addEventListener('pointerleave', () => {
      if (!this.down) {
        this.x = -1;
        this.y = -1;
      }
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.wheel += Math.sign(e.deltaY);
    }, { passive: false });
    window.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.key)) this.keysPressed.add(e.key);
      this.keys.add(e.key);
      if (e.key === ' ' || e.key.startsWith('Arrow')) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.down = false;
      this.rightDown = false;
    });
  }

  setScale(s: number) {
    this.scale = s;
  }

  private move(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    this.x = Math.floor((e.clientX - r.left) / this.scale);
    this.y = Math.floor((e.clientY - r.top) / this.scale);
  }

  /** a full click: pressed and released without dragging */
  get clicked(): boolean {
    return this.released && !this.dragging;
  }

  key(k: string): boolean {
    return this.keysPressed.has(k);
  }

  endFrame() {
    this.pressed = false;
    this.released = false;
    this.rightPressed = false;
    this.wheel = 0;
    this.keysPressed.clear();
    this.captured = false;
    if (!this.down) this.dragging = false;
  }
}
