import type { Plugin } from 'vite';

const oldDefaults = "  'apex-shatter': tuned({ lifetime: 1250, brightness: 90, glow: 25, smoothing: 62, shardCount: 12, shardSpread: 68 }),";
const transformedDefaults = "  'apex-shatter': tuned({ lifetime: 1050, brightness: 80, glow: 22, smoothing: 78, shardCount: 7, shardSpread: 36, radialSymmetry: 6, waveAmplitude: 12 }),";
const previousDefaults = [
  "  'apex-shatter': tuned({ lifetime: 1050, brightness: 82, glow: 30, smoothing: 74, shardCount: 8, shardSpread: 46, radialSymmetry: 6, waveAmplitude: 12 }),",
  "  'apex-shatter': tuned({ lifetime: 1400, brightness: 84, glow: 34, smoothing: 78, shardCount: 9, shardSpread: 42, radialSymmetry: 6, waveAmplitude: 14 }),",
];

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

function drawMainRosette(
  ctx: CanvasRenderingContext2D,
  center: Point,
  radius: number,
  petals: number,
  rotation: number,
  hue: number,
  alpha: number,
  displayScale: number,
) {
  if (radius <= 0.5 || alpha <= 0.01) return;

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(rotation);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.globalCompositeOperation = 'source-over';

  const line = 1 / displayScale;
  const secondaryHue = (hue + 66) % 360;
  const tertiaryHue = (hue + 205) % 360;

  // One restrained glow pass for the complete silhouette.
  ctx.lineWidth = 2.6 / displayScale;
  ctx.strokeStyle = \`hsla(\${hue}, 100%, 58%, \${alpha * 0.16})\`;
  ctx.shadowColor = \`hsla(\${hue}, 100%, 55%, \${alpha * 0.55})\`;
  ctx.shadowBlur = 4 / displayScale;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.stroke();

  // Disable shadows for all detailed geometry; this is the main performance win.
  ctx.shadowBlur = 0;
  ctx.lineWidth = line;
  ctx.strokeStyle = \`hsla(\${hue}, 94%, 72%, \${alpha * 0.76})\`;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.stroke();

  // Batch all flower-of-life circles into one path and one stroke.
  const petalRadius = radius * 0.5;
  ctx.strokeStyle = \`hsla(\${secondaryHue}, 94%, 70%, \${alpha * 0.62})\`;
  ctx.beginPath();
  for (let index = 0; index < petals; index++) {
    const angle = index / petals * TAU;
    const x = Math.cos(angle) * petalRadius;
    const y = Math.sin(angle) * petalRadius;
    ctx.moveTo(x + petalRadius, y);
    ctx.arc(x, y, petalRadius, 0, TAU);
  }
  ctx.stroke();

  ctx.strokeStyle = \`hsla(\${tertiaryHue}, 96%, 76%, \${alpha * 0.72})\`;
  polygonPath(ctx, radius * 0.82, petals, Math.PI / petals);
  ctx.stroke();

  ctx.rotate(-rotation * 1.65);
  ctx.strokeStyle = \`hsla(\${hue}, 90%, 80%, \${alpha * 0.48})\`;
  polygonPath(ctx, radius * 0.54, petals, 0);
  ctx.stroke();

  // Batch spokes into one path and one stroke.
  ctx.strokeStyle = \`hsla(\${secondaryHue}, 100%, 84%, \${alpha * 0.58})\`;
  ctx.lineWidth = 0.72 / displayScale;
  ctx.beginPath();
  for (let index = 0; index < petals; index++) {
    const angle = index / petals * TAU;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * radius * 0.8, Math.sin(angle) * radius * 0.8);
  }
  ctx.stroke();

  ctx.fillStyle = \`hsla(\${tertiaryHue}, 100%, 88%, \${alpha * 0.88})\`;
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(0.8, radius * 0.065), 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawEndpointSigil(
  ctx: CanvasRenderingContext2D,
  center: Point,
  radius: number,
  rotation: number,
  hue: number,
  alpha: number,
  displayScale: number,
) {
  if (radius <= 0.5 || alpha <= 0.01) return;
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(rotation);
  ctx.shadowBlur = 0;
  ctx.lineWidth = 0.85 / displayScale;
  ctx.strokeStyle = \`hsla(\${hue}, 96%, 74%, \${alpha})\`;
  polygonPath(ctx, radius, 6, 0);
  ctx.stroke();
  polygonPath(ctx, radius * 0.56, 3, Math.PI / 6);
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

  const petals = clamp(Math.round(controls.radialSymmetry || 6), 5, 8);
  const speed = Math.hypot(latest.velocity.x, latest.velocity.y);
  const pulse = 0.96 + Math.sin(now * 0.0028 + track.id * 1.37) * 0.06;
  const speedBoost = clamp(speed * 1.5, 0, 0.14);
  const radius = clamp(latest.length * (0.19 + speedBoost) * pulse, 11, 23) / displayScale;
  const rotation = latest.angle + now * 0.00034 + latest.angularVelocity * 90;
  const hue = (112 + track.id * 37 + now * 0.006) % 360;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  drawMainRosette(
    ctx,
    latest.center,
    radius,
    petals,
    rotation,
    hue,
    Math.min(0.76, alpha * 0.82),
    displayScale,
  );

  // Lightweight endpoint sigils replace two complete secondary rosettes.
  const endpointRadius = radius * 0.34;
  drawEndpointSigil(ctx, latest.first, endpointRadius, -rotation, (hue + 78) % 360, alpha * 0.44, displayScale);
  drawEndpointSigil(ctx, latest.second, endpointRadius, rotation, (hue + 210) % 360, alpha * 0.44, displayScale);

  // One coherent club-aligned lattice, no shadow.
  ctx.shadowBlur = 0;
  ctx.strokeStyle = \`hsla(\${(hue + 38) % 360}, 96%, 76%, \${Math.min(0.5, alpha * 0.52)})\`;
  ctx.lineWidth = 0.9 / displayScale;
  ctx.beginPath();
  ctx.moveTo(latest.first.x, latest.first.y);
  ctx.lineTo(latest.center.x, latest.center.y - radius * 0.38);
  ctx.lineTo(latest.second.x, latest.second.y);
  ctx.lineTo(latest.center.x, latest.center.y + radius * 0.38);
  ctx.closePath();
  ctx.stroke();

  // One cheap historical glyph rather than two full rosettes.
  const echo = spacedPoses(track, now, controls, 42, 2)[1];
  if (echo) {
    const echoAlpha = poseFade(echo, track, now, controls) * 0.16;
    if (echoAlpha > 0.02) {
      const echoRadius = clamp(echo.length * 0.1, 5, 10) / displayScale;
      drawEndpointSigil(
        ctx,
        echo.center,
        echoRadius,
        rotation - 0.42,
        (hue + 42) % 360,
        echoAlpha,
        displayScale,
      );
    }
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
      } else {
        for (const previous of previousDefaults) {
          if (next.includes(previous)) {
            next = next.replace(previous, transformedDefaults);
            defaultsReplaced = true;
            break;
          }
        }
      }
      if (next.includes(transformedDefaults)) defaultsReplaced = true;

      const rendererStart = next.indexOf(oldRendererStart);
      const rendererEnd = next.indexOf(oldRendererEnd, rendererStart);
      if (rendererStart >= 0 && rendererEnd > rendererStart) {
        next = next.slice(0, rendererStart) + renderer + next.slice(rendererEnd);
        rendererReplaced = true;
      } else if (next.includes('function renderForestMandala(')) {
        const starts = [
          next.indexOf('function polygonPath('),
          next.indexOf('function drawMainRosette('),
          next.indexOf('function drawSacredRosette('),
        ].filter((value) => value >= 0);
        const existingStart = starts.length ? Math.min(...starts) : -1;
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
