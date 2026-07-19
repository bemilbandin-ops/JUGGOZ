import type { Plugin } from 'vite';

const oldDefaults = "  'apex-shatter': tuned({ lifetime: 1250, brightness: 90, glow: 25, smoothing: 62, shardCount: 12, shardSpread: 68 }),";
const newDefaults = "  'apex-shatter': tuned({ lifetime: 1050, brightness: 82, glow: 30, smoothing: 74, shardCount: 8, shardSpread: 46, radialSymmetry: 6, waveAmplitude: 12 }),";

const oldRenderer = `function emitApex(track: PoiTrack, _added: PoiPose[], now: number, controls: PoiControls) {
  if (track.state !== 'apex' || track.shards.some((item) => Math.abs(item.born - track.stateAt) < 2)) return;
  const count = Math.round(controls.shardCount * 2.0);
  for (let index = 0; index < count; index++) {
    track.shards.push({
      origin: { ...track.center },
      angle: (index / count) * TAU + seeded(track.id * 31 + index) * 0.6,
      speed: 0.03 + seeded(track.id * 53 + index) * 0.06,
      spin: (seeded(track.id * 79 + index) - 0.5) * 0.05,
      size: 6.0 + seeded(track.id * 101 + index) * 8.0,
      born: now,
    });
  }
}

function renderShatter(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls) {
  track.shards.forEach((shard, index) => {
    const age = now - shard.born;
    const alpha = clamp(1 - age / (controls.lifetime * 1.2), 0, 1) * controls.brightness / 100;
    
    const x = shard.origin.x + Math.cos(shard.angle) * shard.speed * age;
    const y = shard.origin.y + Math.sin(shard.angle) * shard.speed * age + age * age * 0.00003;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(shard.angle + age * shard.spin);
    
    ctx.fillStyle = color(track, index, alpha * 0.4, 70);
    ctx.beginPath();
    ctx.moveTo(0, -shard.size * 1.5);
    ctx.lineTo(shard.size, 0);
    ctx.lineTo(0, shard.size * 1.5);
    ctx.lineTo(-shard.size, 0);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = \`rgba(255, 255, 255, \${alpha * 0.95})\`;
    ctx.beginPath();
    ctx.moveTo(0, -shard.size * 0.6);
    ctx.lineTo(shard.size * 0.4, 0);
    ctx.lineTo(0, shard.size * 0.6);
    ctx.lineTo(-shard.size * 0.4, 0);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  });
}`;

const newRenderer = `function drawMandalaRing(
  ctx: CanvasRenderingContext2D,
  center: Point,
  radius: number,
  petals: number,
  rotation: number,
  hue: number,
  alpha: number,
  displayScale: number,
) {
  const line = 1.15 / displayScale;
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(rotation);
  ctx.lineWidth = line;
  ctx.strokeStyle = \`hsla(\${hue}, 92%, 68%, \${alpha})\`;
  ctx.shadowColor = \`hsla(\${hue}, 100%, 58%, \${alpha})\`;
  ctx.shadowBlur = 5 / displayScale;

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.stroke();

  for (let index = 0; index < petals; index++) {
    const angle = index / petals * TAU;
    const x = Math.cos(angle) * radius * 0.52;
    const y = Math.sin(angle) * radius * 0.52;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.52, 0, TAU);
    ctx.stroke();
  }

  ctx.rotate(Math.PI / petals);
  ctx.globalAlpha *= 0.62;
  ctx.beginPath();
  for (let index = 0; index <= petals; index++) {
    const angle = index / petals * TAU;
    const x = Math.cos(angle) * radius * 0.88;
    const y = Math.sin(angle) * radius * 0.88;
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

function renderForestMandala(
  ctx: CanvasRenderingContext2D,
  track: PoiTrack,
  now: number,
  controls: PoiControls,
  _image: ImageData | null,
  displayScale: number,
) {
  const latest = track.history.at(-1);
  if (!latest) return;

  const alpha = poseFade(latest, track, now, controls);
  if (alpha <= 0.04) return;

  const petals = clamp(Math.round(controls.radialSymmetry || controls.shardCount), 5, 10);
  const pulse = 0.9 + Math.sin(now * 0.004 + track.id * 1.7) * 0.1;
  const radius = clamp(latest.length * 0.13 * pulse, 7, 15) / displayScale;
  const endpointRadius = radius * 0.62;
  const spin = now * 0.00065 + latest.angle + latest.angularVelocity * 160;
  const baseHue = (112 + track.id * 29 + now * 0.012) % 360;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const coreAlpha = Math.min(0.74, alpha * 0.78);
  const ghostAlpha = Math.min(0.42, alpha * 0.48);

  drawMandalaRing(ctx, latest.center, radius, petals, spin, baseHue, coreAlpha, displayScale);
  drawMandalaRing(ctx, latest.first, endpointRadius, petals, -spin * 1.2, (baseHue + 72) % 360, ghostAlpha, displayScale);
  drawMandalaRing(ctx, latest.second, endpointRadius, petals, spin * 1.2, (baseHue + 214) % 360, ghostAlpha, displayScale);

  const spineHue = (baseHue + 38) % 360;
  ctx.strokeStyle = \`hsla(\${spineHue}, 96%, 72%, \${Math.min(0.58, alpha * 0.62)})\`;
  ctx.lineWidth = 1.1 / displayScale;
  ctx.shadowColor = \`hsla(\${spineHue}, 100%, 55%, \${alpha * 0.65})\`;
  ctx.shadowBlur = 4 / displayScale;
  ctx.beginPath();
  ctx.moveTo(latest.first.x, latest.first.y);
  ctx.lineTo(latest.center.x, latest.center.y);
  ctx.lineTo(latest.second.x, latest.second.y);
  ctx.stroke();

  const trail = spacedPoses(track, now, controls, 20, 5);
  for (let index = 1; index < trail.length; index++) {
    const item = trail[index];
    const trailAlpha = poseFade(item, track, now, controls) * (1 - index / 6) * 0.32;
    if (trailAlpha <= 0.025) continue;
    const smallRadius = clamp(item.length * 0.055, 3.5, 7) / displayScale;
    drawMandalaRing(
      ctx,
      item.center,
      smallRadius,
      petals,
      -spin * 0.55 - index * 0.28,
      (baseHue + index * 26) % 360,
      trailAlpha,
      displayScale,
    );
  }

  ctx.restore();
}`;

const oldMapping = "  'apex-shatter': { update: emitApex, render: renderShatter, reset: resetTransient },";
const newMapping = "  'apex-shatter': { update: noUpdate, render: renderForestMandala, reset: resetTransient },";

export function sacredGeometryTransform(): Plugin {
  return {
    name: 'sacred-geometry-transform',
    enforce: 'pre',
    transform(code, id) {
      const cleanId = id.split('?', 1)[0].replace(/\\/g, '/');
      if (!cleanId.endsWith('/src/pixelPoi.ts')) return null;

      const hasDefaults = code.includes(oldDefaults);
      const hasRenderer = code.includes(oldRenderer);
      const hasMapping = code.includes(oldMapping);

      if (!hasDefaults || !hasRenderer || !hasMapping) {
        throw new Error(
          `Sacred geometry transform source mismatch: defaults=${hasDefaults}, renderer=${hasRenderer}, mapping=${hasMapping}`,
        );
      }

      const next = code
        .replace(oldDefaults, newDefaults)
        .replace(oldRenderer, newRenderer)
        .replace(oldMapping, newMapping);

      if (next.includes('function renderShatter(') || next.includes('update: emitApex')) {
        throw new Error('Sacred geometry transform left Apex Shatter code active.');
      }

      return { code: next, map: null };
    },
  };
}
