import type { PoiControls, PoiTrack } from './pixelPoi';

type GhostStamp = {
  image: HTMLCanvasElement;
  centerX: number;
  centerY: number;
  angle: number;
  scale: number;
  born: number;
};

type TrailState = {
  stamps: GhostStamp[];
  lastCapturedAt: number;
  lastX: number;
  lastY: number;
};

type SizedPoiControls = PoiControls & { patternWidth?: number; patternHeight?: number };

const trailStates = new WeakMap<PoiTrack, TrailState>();
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function stateFor(track: PoiTrack): TrailState {
  let state = trailStates.get(track);
  if (!state) {
    state = { stamps: [], lastCapturedAt: -Infinity, lastX: track.center.x, lastY: track.center.y };
    trailStates.set(track, state);
  }
  return state;
}

function clubClipPath(length: number, thickness: number) {
  const half = length / 2;
  const path = new Path2D();

  path.moveTo(-half, -thickness * 0.22);
  path.lineTo(-half * 0.12, -thickness * 0.25);
  path.bezierCurveTo(half * 0.2, -thickness * 0.55, half * 0.76, -thickness * 0.62, half, -thickness * 0.28);
  path.bezierCurveTo(half + thickness * 0.08, -thickness * 0.08, half + thickness * 0.08, thickness * 0.08, half, thickness * 0.28);
  path.bezierCurveTo(half * 0.76, thickness * 0.62, half * 0.2, thickness * 0.55, -half * 0.12, thickness * 0.25);
  path.lineTo(-half, thickness * 0.22);
  path.closePath();

  path.moveTo(-half - thickness * 0.08, 0);
  path.arc(-half, 0, thickness * 0.28, 0, Math.PI * 2);
  return path;
}

function captureActualClub(source: HTMLCanvasElement, centerX: number, centerY: number, angle: number, length: number) {
  const thickness = clamp(length * 0.2, 16, 42);
  const padding = Math.max(8, thickness * 0.45);
  const width = Math.ceil(length + thickness * 0.65 + padding * 2);
  const height = Math.ceil(thickness * 1.45 + padding * 2);
  const stamp = document.createElement('canvas');
  stamp.width = width;
  stamp.height = height;

  const stampCtx = stamp.getContext('2d');
  if (!stampCtx) return null;

  stampCtx.save();
  stampCtx.translate(width / 2, height / 2);
  stampCtx.clip(clubClipPath(length, thickness));
  stampCtx.rotate(-angle);
  stampCtx.drawImage(source, -centerX, -centerY);
  stampCtx.restore();

  return stamp;
}

function updateSnapshots(ctx: CanvasRenderingContext2D, tracks: PoiTrack[], now: number, controls: PoiControls) {
  const source = document.querySelector<HTMLCanvasElement>('.stage > canvas.is-ready');
  if (!source || source.width === 0 || source.height === 0) return;

  const transform = ctx.getTransform();
  const scaleX = Math.hypot(transform.a, transform.b);
  const scaleY = Math.hypot(transform.c, transform.d);
  const displayScale = Math.max(0.001, (scaleX + scaleY) / 2);
  const snapshotSpacing = clamp(controls.crossbarFrequency, 6, 100);
  const captureDelay = clamp(42 + snapshotSpacing * 0.8, 48, 120);

  for (const track of tracks) {
    const state = stateFor(track);
    state.stamps = state.stamps.filter((stamp) => now - stamp.born < controls.lifetime);
    if (track.state === 'lost' || track.confidence < 0.18) continue;

    const movement = Math.hypot(track.center.x - state.lastX, track.center.y - state.lastY);
    if (now - state.lastCapturedAt < captureDelay || movement < snapshotSpacing * 0.32) continue;

    const centerX = track.center.x * transform.a + track.center.y * transform.c + transform.e;
    const centerY = track.center.x * transform.b + track.center.y * transform.d + transform.f;
    const length = clamp(track.length * displayScale, 24, 190);
    const image = captureActualClub(source, centerX, centerY, track.angle, length);
    if (!image) continue;

    state.stamps.push({ image, centerX: track.center.x, centerY: track.center.y, angle: track.angle, scale: displayScale, born: now });
    state.stamps = state.stamps.slice(-48);
    state.lastCapturedAt = now;
    state.lastX = track.center.x;
    state.lastY = track.center.y;
  }
}

export function drawGhostPulseLayer(ctx: CanvasRenderingContext2D, tracks: PoiTrack[], now: number, controls: PoiControls) {
  updateSnapshots(ctx, tracks, now, controls);

  const sized = controls as SizedPoiControls;
  const widthScale = clamp((sized.patternWidth ?? 100) / 100, 0.25, 2);
  const heightScale = clamp((sized.patternHeight ?? 100) / 100, 0.25, 2);
  const pulseAmount = 0.025 + clamp(controls.railSeparation, 0, 250) / 250 * 0.12;
  const brightness = controls.brightness / 100;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  for (const track of tracks) {
    const state = stateFor(track);
    const lostFade = track.state === 'lost' ? clamp(1 - (now - track.lastSeen) / Math.min(520, controls.lostReset), 0, 1) : 1;

    for (const stamp of state.stamps) {
      const age = now - stamp.born;
      if (age < 105) continue;

      const life = clamp(1 - age / controls.lifetime, 0, 1);
      const slowFade = life * life * (3 - 2 * life);
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.006 - stamp.born * 0.0018 + track.id * 1.21);
      const pulseScale = 1 + pulseAmount * pulse;
      const alpha = slowFade * lostFade * brightness * (0.42 + pulse * 0.28);
      const renderScale = pulseScale / stamp.scale;

      ctx.save();
      ctx.translate(stamp.centerX, stamp.centerY);
      ctx.rotate(stamp.angle);
      ctx.scale(renderScale * widthScale, renderScale * heightScale);
      ctx.globalAlpha = alpha;
      ctx.drawImage(stamp.image, -stamp.image.width / 2, -stamp.image.height / 2);
      ctx.restore();
    }
  }

  ctx.restore();
}
