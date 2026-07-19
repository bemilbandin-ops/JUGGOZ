import { CLUB_EFFECTS, type PoiControls, type PoiTrack } from './pixelPoi';

type EchoStamp = {
  image: HTMLCanvasElement;
  x: number;
  y: number;
  angle: number;
  scale: number;
  born: number;
};

type EchoState = {
  stamps: EchoStamp[];
  lastCapture: number;
  lastX: number;
  lastY: number;
};

const states = new WeakMap<PoiTrack, EchoState>();
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function stateFor(track: PoiTrack): EchoState {
  let state = states.get(track);
  if (!state) {
    state = { stamps: [], lastCapture: -Infinity, lastX: track.center.x, lastY: track.center.y };
    states.set(track, state);
  }
  return state;
}

function clubPath(length: number, thickness: number) {
  const half = length / 2;
  const path = new Path2D();
  path.moveTo(-half, -thickness * 0.22);
  path.lineTo(-half * 0.1, -thickness * 0.26);
  path.bezierCurveTo(half * 0.24, -thickness * 0.56, half * 0.78, -thickness * 0.62, half, -thickness * 0.28);
  path.bezierCurveTo(half + thickness * 0.08, -thickness * 0.08, half + thickness * 0.08, thickness * 0.08, half, thickness * 0.28);
  path.bezierCurveTo(half * 0.78, thickness * 0.62, half * 0.24, thickness * 0.56, -half * 0.1, thickness * 0.26);
  path.lineTo(-half, thickness * 0.22);
  path.closePath();
  path.moveTo(-half - thickness * 0.06, 0);
  path.arc(-half, 0, thickness * 0.28, 0, Math.PI * 2);
  return path;
}

function captureClub(source: HTMLCanvasElement, centerX: number, centerY: number, angle: number, length: number) {
  const thickness = clamp(length * 0.2, 14, 40);
  const padding = Math.max(7, thickness * 0.4);
  const width = Math.ceil(length + thickness * 0.7 + padding * 2);
  const height = Math.ceil(thickness * 1.5 + padding * 2);
  const image = document.createElement('canvas');
  image.width = width;
  image.height = height;
  const imageCtx = image.getContext('2d');
  if (!imageCtx) return null;

  imageCtx.save();
  imageCtx.translate(width / 2, height / 2);
  imageCtx.clip(clubPath(length, thickness));
  imageCtx.rotate(-angle);
  imageCtx.drawImage(source, -centerX, -centerY);
  imageCtx.restore();
  return image;
}

function renderEchoTrail(
  ctx: CanvasRenderingContext2D,
  track: PoiTrack,
  now: number,
  controls: PoiControls,
  _image: ImageData | null,
  displayScale: number,
) {
  const source = document.querySelector<HTMLCanvasElement>('.stage > canvas.is-ready');
  if (!source || !source.width || !source.height) return;

  const state = stateFor(track);
  const lifetime = clamp(controls.lifetime, 450, 2600);
  state.stamps = state.stamps.filter((stamp) => now - stamp.born < lifetime);

  if (track.state !== 'lost' && track.confidence >= 0.18) {
    const movement = Math.hypot(track.center.x - state.lastX, track.center.y - state.lastY);
    const spacing = clamp(controls.tileSpacing * 0.24, 3.5, 16);
    const delay = clamp(controls.tileSpacing * 2.2, 48, 105);

    if (now - state.lastCapture >= delay && movement >= spacing) {
      const transform = ctx.getTransform();
      const centerX = track.center.x * transform.a + track.center.y * transform.c + transform.e;
      const centerY = track.center.x * transform.b + track.center.y * transform.d + transform.f;
      const scaleX = Math.hypot(transform.a, transform.b);
      const scaleY = Math.hypot(transform.c, transform.d);
      const captureScale = Math.max(0.001, (scaleX + scaleY) / 2);
      const length = clamp(track.length * captureScale, 24, 190);
      const image = captureClub(source, centerX, centerY, track.angle, length);
      if (image) {
        state.stamps.push({ image, x: track.center.x, y: track.center.y, angle: track.angle, scale: captureScale, born: now });
        state.stamps = state.stamps.slice(-18);
        state.lastCapture = now;
        state.lastX = track.center.x;
        state.lastY = track.center.y;
      }
    }
  }

  const brightness = controls.brightness / 100;
  const lostFade = track.state === 'lost'
    ? clamp(1 - (now - track.lastSeen) / Math.min(420, controls.lostReset), 0, 1)
    : 1;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  for (let index = 0; index < state.stamps.length; index++) {
    const stamp = state.stamps[index];
    const age = now - stamp.born;
    if (age < 90) continue;

    const life = clamp(1 - age / lifetime, 0, 1);
    const smoothFade = life * life * (3 - 2 * life);
    const depth = (index + 1) / Math.max(1, state.stamps.length);
    const alpha = smoothFade * lostFade * brightness * (0.28 + depth * 0.38);
    const settle = 1 + (1 - life) * 0.018;
    const renderScale = settle / Math.max(0.001, stamp.scale);

    ctx.save();
    ctx.translate(stamp.x, stamp.y);
    ctx.rotate(stamp.angle);
    ctx.scale(renderScale, renderScale);
    ctx.globalAlpha = alpha;
    ctx.drawImage(stamp.image, -stamp.image.width / 2, -stamp.image.height / 2);
    ctx.restore();
  }

  ctx.restore();
}

CLUB_EFFECTS['pixel-mosaic'] = {
  ...CLUB_EFFECTS['pixel-mosaic'],
  render: renderEchoTrail,
};
