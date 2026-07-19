import type { Plugin } from 'vite';

const oldDefaults = "  'psychedelic-serpent': tuned({ lifetime: 1450, brightness: 78, glow: 30, smoothing: 78, strandCount: 4, waveAmplitude: 13 }),";
const previousDefaults = "  'psychedelic-serpent': tuned({ lifetime: 900, brightness: 82, glow: 18, smoothing: 74, echoCount: 6, echoSpacing: 17, strandCount: 3, waveAmplitude: 9 }),";
const newDefaults = "  'psychedelic-serpent': tuned({ lifetime: 1050, brightness: 80, glow: 16, smoothing: 76, echoCount: 9, echoSpacing: 10, strandCount: 3, waveAmplitude: 8 }),";

const rendererStart = 'function renderSerpent(';
const rendererEndCandidates = ['\nfunction emitApex(', '\nfunction polygonPath('];

const renderer = `function renderSerpent(
  ctx: CanvasRenderingContext2D,
  track: PoiTrack,
  now: number,
  controls: PoiControls,
  _image: ImageData | null,
  displayScale: number,
) {
  const samples = spacedPoses(
    track,
    now,
    controls,
    Math.max(7, controls.echoSpacing),
    clamp(Math.round(controls.echoCount), 6, 11),
  ).reverse();
  if (samples.length < 2) return;

  const latest = samples[samples.length - 1];
  const trackAlpha = trackFade(track, now, controls);
  const pulse = 0.5 + 0.5 * Math.sin(now * 0.0075 + track.id * 1.31);

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Proven long-exposure treatment: three tapered trails tied directly to club poses.
  for (let lane = 0; lane < 3; lane++) {
    ctx.beginPath();
    let started = false;
    for (let index = 0; index < samples.length; index++) {
      const item = samples[index];
      const point = lane === 0 ? item.center : lane === 1 ? item.first : item.second;
      if (!started) {
        ctx.moveTo(point.x, point.y);
        started = true;
      } else {
        ctx.lineTo(point.x, point.y);
      }
    }

    const laneHue = lane === 0 ? 292 : lane === 1 ? 184 : 42;
    const laneAlpha = lane === 0 ? 0.62 : 0.46;
    ctx.strokeStyle = 'hsla(' + laneHue + ', 100%, 70%, ' + (trackAlpha * laneAlpha) + ')';
    ctx.lineWidth = ((lane === 0 ? 2.2 : 1.35) + pulse * 0.35) / displayScale;
    ctx.setLineDash(lane === 0 ? [10 / displayScale, 5 / displayScale] : [5 / displayScale, 7 / displayScale]);
    ctx.lineDashOffset = -(now * (lane === 0 ? 0.018 : 0.012) + lane * 9) / displayScale;
    ctx.stroke();
  }

  ctx.setLineDash([]);

  // Dissolve the older path into small fragments rather than repeated club silhouettes.
  for (let index = 0; index < samples.length - 1; index++) {
    const item = samples[index];
    const ageFade = poseFade(item, track, now, controls);
    const rank = index / Math.max(1, samples.length - 1);
    const fragmentAlpha = ageFade * (1 - rank) * 0.62;
    if (fragmentAlpha <= 0.025) continue;

    const seedBase = track.id * 173 + item.segment * 31 + Math.floor(item.travel / 6) * 13;
    for (let fragment = 0; fragment < 3; fragment++) {
      const along = seeded(seedBase + fragment * 17) - 0.5;
      const normal = seeded(seedBase + fragment * 29 + 5) - 0.5;
      const tangentX = Math.cos(item.angle);
      const tangentY = Math.sin(item.angle);
      const normalX = -tangentY;
      const normalY = tangentX;
      const x = item.center.x + tangentX * along * item.length * 0.58 + normalX * normal * 8;
      const y = item.center.y + tangentY * along * item.length * 0.58 + normalY * normal * 8;
      const size = (0.55 + seeded(seedBase + fragment * 43 + 7) * 1.15) / displayScale;

      ctx.fillStyle = fragment % 2 === 0
        ? 'rgba(157, 255, 226, ' + fragmentAlpha + ')'
        : 'rgba(255, 128, 218, ' + (fragmentAlpha * 0.82) + ')';
      ctx.beginPath();
      ctx.arc(x, y, size, 0, TAU);
      ctx.fill();
    }
  }

  // Two restrained ripple rings pulse from the live club center.
  const baseRadius = clamp(latest.length * 0.11, 6, 14) / displayScale;
  for (let ring = 0; ring < 2; ring++) {
    const phase = (pulse + ring * 0.5) % 1;
    ctx.strokeStyle = ring === 0
      ? 'rgba(126, 255, 215, ' + (trackAlpha * (1 - phase) * 0.46) + ')'
      : 'rgba(255, 105, 213, ' + (trackAlpha * (1 - phase) * 0.32) + ')';
    ctx.lineWidth = 0.9 / displayScale;
    ctx.beginPath();
    ctx.arc(latest.center.x, latest.center.y, baseRadius * (0.75 + phase * 1.1), 0, TAU);
    ctx.stroke();
  }

  // Small endpoint shimmer stays locked to the clubs.
  const shimmerBucket = Math.floor(now / 120);
  const liveEndpoints = [latest.first, latest.second];
  for (let endpointIndex = 0; endpointIndex < liveEndpoints.length; endpointIndex++) {
    const endpoint = liveEndpoints[endpointIndex];
    for (let sparkle = 0; sparkle < 2; sparkle++) {
      const seed = track.id * 97 + endpointIndex * 41 + sparkle * 23 + shimmerBucket;
      const visibility = seeded(seed);
      if (visibility < 0.42) continue;
      const angle = seeded(seed + 9) * TAU;
      const radius = (2 + seeded(seed + 19) * 5) / displayScale;
      const x = endpoint.x + Math.cos(angle) * radius;
      const y = endpoint.y + Math.sin(angle) * radius;
      const size = (0.55 + seeded(seed + 37) * 0.75) / displayScale;
      ctx.fillStyle = 'rgba(255, 249, 198, ' + (trackAlpha * 0.7) + ')';
      ctx.beginPath();
      ctx.arc(x, y, size, 0, TAU);
      ctx.fill();
    }
  }

  ctx.restore();
}`;

export function afterimageTrailTransform(): Plugin {
  return {
    name: 'afterimage-trail-transform',
    enforce: 'pre',
    transform(code, id) {
      const cleanId = id.split('?')[0].replace(/\\/g, '/');
      if (!cleanId.endsWith('/src/pixelPoi.ts')) return null;

      let next = code;
      let defaultsChanged = false;
      let rendererChanged = false;

      if (next.includes(oldDefaults)) {
        next = next.replace(oldDefaults, newDefaults);
        defaultsChanged = true;
      } else if (next.includes(previousDefaults)) {
        next = next.replace(previousDefaults, newDefaults);
        defaultsChanged = true;
      } else if (next.includes(newDefaults)) {
        defaultsChanged = true;
      }

      const start = next.indexOf(rendererStart);
      let end = -1;
      for (const candidate of rendererEndCandidates) {
        const found = next.indexOf(candidate, start);
        if (found >= 0 && (end < 0 || found < end)) end = found;
      }
      if (start >= 0 && end > start) {
        next = next.slice(0, start) + renderer + next.slice(end);
        rendererChanged = true;
      }

      if (!defaultsChanged || !rendererChanged) {
        throw new Error(
          'Dissolve Streak transform failed: defaults=' + defaultsChanged + ', renderer=' + rendererChanged,
        );
      }

      return { code: next, map: null };
    },
  };
}
