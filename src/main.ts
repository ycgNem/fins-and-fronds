// Entry point: build the app, load any imported art, and run the frame loop. The sim advances
// inside App.frame (game minutes = real seconds x speed), so there is no separate tick here.
import { App } from './app/app';
import { loadImportedArt } from './render/art/sprites';

const canvas = document.getElementById('game') as HTMLCanvasElement;
loadImportedArt();
const app = new App(canvas);
(window as unknown as { app: App }).app = app;

let last = performance.now();
function loop(now: number) {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  app.frame(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
