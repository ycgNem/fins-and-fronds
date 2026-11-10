// Pointer and keyboard state in UI pixels. The UI reads per-frame edges (pressed / released /
// clicked) and the app clears them at the end of every frame.

/** a wheel click scrolls a list this many UI pixels (touchpads scroll by their own pixels) */
const NOTCH_PX = 60;
/** wheel events closer than this (ms) are one touchpad stream */
const WHEEL_GAP = 250;
/** a finger held this long (ms) shows the tooltip under it; letting go is then not a tap */
const LONG_PRESS = 450;
/** a finger may wander this far (CSS pixels) and still tap; the mouse gets 2 UI pixels */
const TOUCH_SLOP = 10;

/** Letters by their lowercase name, so Shift and Caps Lock do not change the shortcut (Shift+R is
 *  read from the Shift key); digits by position, since AZERTY's number row types symbols. */
function keyName(e: KeyboardEvent): string {
  const d = /^Digit(\d)$/.exec(e.code);
  if (d) return d[1];
  return e.key.length === 1 ? e.key.toLowerCase() : e.key;
}

export class Input {
  /** pointer position in UI pixels (-1 when there is none: the mouse left, or a finger lifted) */
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
  /** the wheel this frame in notches (a mouse wheel click is 1, a touchpad sends fractions, a pinch
   *  one per 12% of spread), and in UI pixels for scrolling lists (pinches do not scroll) */
  wheel = 0;
  wheelPx = 0;
  /** two fingers are down: a pan and pinch, never a tap or a drag of what is under them */
  gesture = false;
  /** the last pointer was a finger or a pen: it has no hover, and lifting it is not leaving */
  touch = false;
  /** set by the UI when the pointer is over a panel, so the world ignores it */
  captured = false;
  keys = new Set<string>();
  keysPressed = new Set<string>();
  /** CSS pixels per UI pixel */
  private scale = 1;
  /** touch: every finger down (client pixels), the two-finger gesture, and when the press began */
  private touches = new Map<number, { x: number; y: number }>();
  private pinch: { dist: number } | null = null;
  private pressAt = 0;
  private wheelAt = -1e9;
  /** the pointer went away (left the canvas, or a finger lifted): forgotten at the end of the frame,
   *  so the frame that reads the release still knows where it happened */
  private leavePending = false;

  constructor(private canvas: HTMLCanvasElement) {
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      this.touch = e.pointerType !== 'mouse';
      this.leavePending = false;
      if (e.pointerType === 'touch') {
        this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.touches.size === 2) {
          // a second finger turns the press into a pan (like the right button) and a pinch
          this.down = false;
          this.pressed = false;
          this.dragging = true;
          this.rightDown = true;
          this.gesture = true;
          this.pinch = { dist: this.spread() };
          this.moveTo(this.mid());
          return;
        }
        if (this.touches.size > 2 || this.gesture) return;
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
      if (e.pointerType === 'mouse') this.touch = false;
      if (e.pointerType === 'touch' && this.touches.has(e.pointerId)) {
        this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.gesture) {
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
          }
          return;
        }
      }
      this.move(e);
      const slop = this.touch ? TOUCH_SLOP / this.scale : 2;
      if (this.down && (Math.abs(this.x - this.dragX) > slop || Math.abs(this.y - this.dragY) > slop)) this.dragging = true;
    });
    canvas.addEventListener('pointerup', (e) => this.up(e, true));
    // the browser took the pointer away (a system gesture): let go without a click
    canvas.addEventListener('pointercancel', (e) => this.up(e, false));
    canvas.addEventListener('pointerleave', () => {
      if (!this.down) this.leavePending = true;
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      // a mouse wheel click comes as lines (Firefox) or as 100 px or more; a touchpad streams small
      // pixel steps (ctrl+wheel when pinching on it). The first event of a stream counts as a click,
      // so a light swipe still zooms one step; the rest add up by distance.
      const now = performance.now();
      const fresh = now - this.wheelAt > WHEEL_GAP;
      this.wheelAt = now;
      if (e.deltaMode !== 0 || Math.abs(e.deltaY) >= 50) {
        this.wheel += Math.sign(e.deltaY);
        this.wheelPx += Math.sign(e.deltaY) * NOTCH_PX;
      } else {
        this.wheel += fresh ? Math.sign(e.deltaY) : e.deltaY / (e.ctrlKey ? 50 : 100);
        if (!e.ctrlKey) this.wheelPx += e.deltaY / this.scale;
      }
    }, { passive: false });
    window.addEventListener('keydown', (e) => {
      // Ctrl, Cmd and Alt shortcuts belong to the browser (find, reload, paste); AltGr types characters
      if ((e.ctrlKey || e.metaKey || e.altKey) && !e.getModifierState('AltGraph')) return;
      const k = keyName(e);
      if (!this.keys.has(k)) this.keysPressed.add(k);
      this.keys.add(k);
      // Tab switches tanks: it must not move the focus off the page
      if (k === ' ' || k === 'Tab' || k.startsWith('Arrow')) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(keyName(e)));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.down = false;
      this.rightDown = false;
      this.touches.clear();
      this.pinch = null;
      this.gesture = false;
    });
  }

  /** CSS pixels per UI pixel (the canvas may be sized in device pixels) */
  setScale(s: number) {
    this.scale = s;
  }

  private up(e: PointerEvent, click: boolean) {
    if (e.pointerType === 'touch') {
      this.touches.delete(e.pointerId);
      if (this.gesture) {
        // the pan and pinch ends with its fingers; the last one up is not a tap
        if (this.touches.size < 2) {
          this.pinch = null;
          this.rightDown = false;
        }
        if (!this.touches.size) {
          this.gesture = false;
          this.leavePending = true;
        }
        return;
      }
      // a long press shows the tooltip under the finger; letting go of it is not a click
      if (this.down && !this.dragging && performance.now() - this.pressAt > LONG_PRESS) this.dragging = true;
    }
    this.move(e);
    if (e.button === 2) this.rightDown = false;
    else if (this.down) {
      this.down = false;
      this.released = click;
    }
    // a finger or pen that lifts leaves nothing hovering, once this frame has seen the release
    if (e.pointerType !== 'mouse') this.leavePending = true;
  }

  private move(e: PointerEvent) {
    this.leavePending = false;
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
    this.wheelPx = 0;
    this.keysPressed.clear();
    this.captured = false;
    if (!this.down) this.dragging = false;
    if (this.leavePending && !this.down && !this.gesture) {
      this.x = -1;
      this.y = -1;
    }
    this.leavePending = false;
  }
}
