import type { Plugin } from 'vite';

const oldDefaults = "  'apex-shatter': tuned({ lifetime: 1250, brightness: 90, glow: 25, smoothing: 62, shardCount: 12, shardSpread: 68 }),";
const transformedDefaults = "  'apex-shatter': tuned({ lifetime: 1400, brightness: 84, glow: 34, smoothing: 78, shardCount: 9, shardSpread: 42, radialSymmetry: 6, waveAmplitude: 14 }),";
const alreadyTransformedDefaults = "  'apex-shatter': tuned({ lifetime: 1050, brightness: 82, glow: 30, smoothing: 74, shardCount: 8, shardSpread: 46, radialSymmetry: 6, waveAmplitude: 12 }),";

const oldRendererStart = 'function emitApex(';
const oldRendererEnd = '\nfunction renderMosaic(';
const oldMapping = "  'apex-shatter': { update: emitApex, render: renderShatter, reset: resetTransient },";
const transformedMapping = "  'apex-shatter': { update: noUpdate, render: renderForestMandala, reset: resetTransient },";

const renderer = `function polygonPath(ctx: CanvasRenderingContext2D, radius: number, sides: number, rotation: number) {
  ctx.beginPath();
  for (let index = 0; index <= sides; index++) {
    const angle = rotation + index / sides * TAU;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawSacredRosette(
  ctx: CanvasRenderingContext2D,
  center: Point,
  radius: number,
  petals: number,
  rotation: number,
  hue: number,
  alpha: number,
  displayScale: number,
  detail = 1,
) {
  if (radius <= 0.5 || alpha <= 0.01) return;

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(rotation);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const line = Math.max(0.55, 1.05 * detail) / displayScale;
  const glow = (4.5 + detail * 2) / displayScale;
  const secondaryHue = (hue + 64) % 360;
  const tertiaryHue = (hue + 204) % 360;

  ctx.globalCompositeOperation = 'lighter';
  ctx.lineWidth = line;
  ctx.shadowBlur = glow;

  // Outer ritual circle.
  ctx.strokeStyle = \`hsla(\${hue}, 95%, 70%, \${alpha * 0.72})\`;
  ctx.shadowColor = \`hsla(\${hue}, 100%, 56%, \${alpha})\`;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.stroke();

  // Flower-of-life petal layer.
  const petalRadius = radius * 0.5;
  ctx.strokeStyle = \`hsla(\${secondaryHue}, 92%, 68%, \${alpha * 0.62})\`;
  ctx.shadowColor = \`hsla(\${secondaryHue}, 100%, 54%, \${alpha * 0.9})\`;
  for (let index = 0; index < petals; index++) {
    const angle = index / petals * TAU;
    const x = Math.cos(angle) * petalRadius;
    const y = Math.sin(angle) * petalRadius;
    ctx.beginPath();
    ctx.arc(x, y, petalRadius, 0, TAU);
    ctx.stroke();
  }

  // Counter-rotating nested polygons produce an actual mandala silhouette.
  ctx.strokeStyle = \`hsla(\${tertiaryHue}, 96%, 74%, \${alpha * 0.78})\`;
  ctx.shadowColor = \`hsla(\${tertiaryHue}, 100%, 58%, \${alpha})\`;
  polygonPath(ctx, radius * 0.82, petals, Math.PI / petals);
  ctx.stroke();

  ctx.rotate(-rotation * 1.85);
  ctx.strokeStyle = \`hsla(\${hue}, 90%, 78%, \${alpha * 0.54})\`;
  polygonPath(ctx, radius * 0.56, petals, 0);
  ctx.stroke();

  // Seed-of-life core and radial spokes.
  ctx.strokeStyle = \`hsla(\${secondaryHue}, 100%, 82%, \${alpha * 0.72})\`;
  ctx.lineWidth = Math.max(0.45, 0.72 * detail) / displayScale;
  for (let index = 0; index < petals; index++) {
    const angle = index / petals * TAU;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * radius * 0.82, Math.sin(angle) * radius * 0.82);
    ctx.stroke();
  }

  ctx.fillStyle = \`hsla(\${tertiaryHue}, 100%, 88%, \${alpha * 0.9})\`;
  ctx.shadowBlur = 7 / displayScale;
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(0.9, radius * 0.07), 0, TAU);
  ctx.fill();
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
  if (alpha <= 0.035) return;

  const petals = clamp(Math.round(controls.radialSymmetry || 6), 5, 10);
  const speed = Math.hypot(latest.velocity.x, latest.velocity.y);
  const pulse = 0.94 + Math.sin(now * 0.0032 + track.id * 1.37) * 0.08;
  const speedBoost = clamp(speed * 2.4, 0, 0.22);
  const baseRadius = clamp(latest.length * (0.22 + speedBoost) * pulse, 13, 27) / displayScale;
  const rotation = latest.angle + now * 0.00042 + latest.angularVelocity * 120;
  const hue = (104 + track.id * 41 + now * 0.008) % 360;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  // Main persistent mandala locked to the club center.
  drawSacredRosette(
    ctx,
    latest.center,
    baseRadius,
    petals,
    rotation,
    hue,
    Math.min(0.82, alpha * 0.9),
    displayScale,
    1.15,
  );

  // Endpoint satellites orbit with the club instead of spawning in world space.
  const satelliteRadius = baseRadius * 0.44;
  drawSacredRosette(
    ctx,
    latest.first,
    satelliteRadius,
    petals,
    -rotation * 1.35,
    (hue + 82) % 360,
    Math.min(0.55, alpha * 0.58),
    displayScale,
    0.72,
  );
  drawSacredRosette(
    ctx,
    latest.second,
    satelliteRadius,
    petals,
    rotation * 1.35,
    (hue + 214) % 360,
    Math.min(0.55, alpha * 0.58),
    displayScale,
    0.72,
  );

  // Club-aligned diamond lattice makes the effect read as one coherent object.
  ctx.strokeStyle = \`hsla(\${(hue + 38) % 360}, 96%, 74%, \${Math.min(0.62, alpha * 0.68)})\`;
  ctx.shadowColor = \`hsla(\${(hue + 38) % 360}, 100%, 58%, \${alpha * 0.7})\`;
  ctx.shadowBlur = 5 / displayScale;
  ctx.lineWidth = 1.05 / displayScale;
  ctx.beginPath();
  ctx.moveTo(latest.first.x, latest.first.y);
  ctx.lineTo(latest.center.x, latest.center.y - baseRadius * 0.42);
  ctx.lineTo(latest.second.x, latest.second.y);
  ctx.lineTo(latest.center.x, latest.center.y + baseRadius * 0.42);
  ctx.closePath();
  ctx.stroke();

  // A short coherent echo: only two old rosettes, widely spaced and strongly faded.
  const echoes = spacedPoses(track, now, controls, 34, 3);
  for (let index = 1; index < echoes.length; index++) {
    const item = echoes[index];
    const echoAlpha = poseFade(item, track, now, controls) * (index === 1 ? 0.22 : 0.1);
    if (echoAlpha <= 0.02) continue;
    const echoRadius = clamp(item.length * 0.13, 7, 14) / displayScale;
    drawSacredRosette(
      ctx,
      item.center,
      echoRadius,
      petals,
      rotation - index * 0.44,
      (hue + index * 34) % 360,
      echoAlpha,
      displayScale,
      0.55,
    );
  }

  ctx.restore();
}`;

export function sacredGeometryTransform(): Plugin {
  return {
    name: 'sacred-geometry-transform',
    enforce: 'pre',
    transform(code, id) {
      const cleanId = id.split('?')[0].replace(/\\/g, '/');
      if (!cleanId.endsWith('/src/pixelPoi.ts')) return null;

      let next = code;
      let defaultsReplaced = false;
      let rendererReplaced = false;
      let mappingReplaced = false;

      if (next.includes(oldDefaults)) {
        next = next.replace(oldDefaults, transformedDefaults);
        defaultsReplaced = true;
      } else if (next.includes(alreadyTransformedDefaults)) {
        next = next.replace(alreadyTransformedDefaults, transformedDefaults);
        defaultsReplaced = true;
      } else if (next.includes(transformedDefaults)) {
        defaultsReplaced = true;
      }

      const rendererStart = next.indexOf(oldRendererStart);
      const rendererEnd = next.indexOf(oldRendererEnd, rendererStart);
      if (rendererStart >= 0 && rendererEnd > rendererStart) {
        next = next.slice(0, rendererStart) + renderer + next.slice(rendererEnd);
        rendererReplaced = true;
      } else if (next.includes('function renderForestMandala(')) {
        const existingStart = next.indexOf('function polygonPath(');
        const existingEnd = next.indexOf(oldRendererEnd, existingStart);
        if (existingStart >= 0 && existingEnd > existingStart) {
          next = next.slice(0, existingStart) + renderer + next.slice(existingEnd);
          rendererReplaced = true;
        }
      }

      if (next.includes(oldMapping)) {
        next = next.replace(oldMapping, transformedMapping);
        mappingReplaced = true;
      } else if (next.includes(transformedMapping)) {
        mappingReplaced = true;
      }

      if (!defaultsReplaced || !rendererReplaced || !mappingReplaced) {
        throw new Error(
          `Forest Mandala transform failed: defaults=${defaultsReplaced}, renderer=${rendererReplaced}, mapping=${mappingReplaced}`,
        );
      }

      if (next.includes('function renderShatter(') || next.includes('update: emitApex')) {
        throw new Error('Forest Mandala transform left Apex Shatter code active.');
      }

      return { code: next, map: null };
    },
  };
}
