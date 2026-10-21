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
  /** touch: every finger down (client pixels), the two-finger gesture, and when the press began */
  private touches = new Map<number, { x: number; y: number }>();
  private pinch: { dist: number } | null = null;
  private pressAt = 0;

  constructor(private canvas: HTMLCanvasElement) {
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') {
        this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.touches.size === 2) {
          // a second finger turns the press into a pan (like the right button) and a pinch
          this.down = false;
          this.pressed = false;
          this.dragging = true;
          this.rightDown = true;
          this.pinch = { dist: this.spread() };
          this.moveTo(this.mid());
          return;
        }
        if (this.touches.size > 2) return;
      }
      this.pressAt = performance.now();
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
      if (e.pointerType === 'touch' && this.touches.has(e.pointerId)) {
        this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.pinch && this.touches.size >= 2) {
          this.moveTo(this.mid());
          const d = this.spread();
          // every 12% of spread is one wheel notch
          if (d > this.pinch.dist * 1.12) {
            this.wheel -= 1;
            this.pinch.dist = d;
          } else if (d < this.pinch.dist / 1.12) {
            this.wheel += 1;
            this.pinch.dist = d;
          }
          return;
        }
      }
      this.move(e);
      if (this.down && (Math.abs(this.x - this.dragX) > 2 || Math.abs(this.y - this.dragY) > 2)) this.dragging = true;
    });
    canvas.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch') {
        this.touches.delete(e.pointerId);
        if (this.pinch) {
          if (this.touches.size < 2) {
            this.pinch = null;
            this.rightDown = false;
          }
          return;
        }
        // a long press shows the tooltip under the finger; letting go of it is not a click
        if (this.down && !this.dragging && performance.now() - this.pressAt > 450) this.dragging = true;
      }
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
    this.moveTo({ x: e.clientX, y: e.clientY });
  }

  private moveTo(p: { x: number; y: number }) {
    const r = this.canvas.getBoundingClientRect();
    this.x = Math.floor((p.x - r.left) / this.scale);
    this.y = Math.floor((p.y - r.top) / this.scale);
  }

  private mid(): { x: number; y: number } {
    const [a, b] = [...this.touches.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  private spread(): number {
    const [a, b] = [...this.touches.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
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
