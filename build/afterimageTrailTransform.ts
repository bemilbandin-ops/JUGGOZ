import type { Plugin } from 'vite';

const oldDefaults = "  'psychedelic-serpent': tuned({ lifetime: 1450, brightness: 78, glow: 30, smoothing: 78, strandCount: 4, waveAmplitude: 13 }),";
const newDefaults = "  'psychedelic-serpent': tuned({ lifetime: 900, brightness: 82, glow: 18, smoothing: 74, echoCount: 6, echoSpacing: 17, strandCount: 3, waveAmplitude: 9 }),";

const rendererStart = 'function renderSerpent(';
const rendererEnd = '\nfunction emitApex(';

const renderer = `function renderSerpent(
  ctx: CanvasRenderingContext2D,
  track: PoiTrack,
  now: number,
  controls: PoiControls,
  _image: ImageData | null,
  displayScale: number,
) {
  const echoes = spacedPoses(
    track,
    now,
    controls,
    Math.max(12, controls.echoSpacing),
    clamp(Math.round(controls.echoCount), 4, 7),
  );
  if (echoes.length === 0) return;

  const latest = echoes[0];
  const trackAlpha = trackFade(track, now, controls);
  const pulse = 0.5 + 0.5 * Math.sin(now * 0.009 + track.id * 1.7);
  const pulseRadius = clamp(latest.length * 0.16, 8, 18) / displayScale;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Classic multi-exposure club trail: oldest first, strongest live pose last.
  for (let index = echoes.length - 1; index >= 0; index--) {
    const item = echoes[index];
    const ageFade = poseFade(item, track, now, controls);
    const rank = 1 - index / Math.max(1, echoes.length);
    const alpha = ageFade * (0.16 + rank * 0.5);
    if (alpha <= 0.025) continue;

    const speed = Math.hypot(item.velocity.x, item.velocity.y);
    const offsetAmount = Math.min(2.4, speed * 7) / displayScale;
    const direction = speed > 0.001
      ? { x: item.velocity.x / speed, y: item.velocity.y / speed }
      : { x: Math.cos(item.angle), y: Math.sin(item.angle) };
    const width = (0.7 + rank * 0.75) / displayScale;
    const lengthScale = 0.94 + rank * 0.06;

    // Restrained RGB split gives a proven music-video afterimage look.
    drawClubSilhouette(
      ctx,
      { x: item.center.x - direction.x * offsetAmount, y: item.center.y - direction.y * offsetAmount },
      item.angle,
      item.length * lengthScale,
      'rgba(255, 44, 160, ' + (alpha * 0.42) + ')',
      width,
    );
    drawClubSilhouette(
      ctx,
      { x: item.center.x + direction.x * offsetAmount, y: item.center.y + direction.y * offsetAmount },
      item.angle,
      item.length * lengthScale,
      'rgba(38, 224, 255, ' + (alpha * 0.46) + ')',
      width,
    );
    drawClubSilhouette(
      ctx,
      item.center,
      item.angle,
      item.length * lengthScale,
      'rgba(255, 255, 255, ' + (alpha * 0.72) + ')',
      Math.max(0.45 / displayScale, width * 0.58),
    );
  }

  // One soft breathing halo, anchored to the current club only.
  ctx.globalAlpha = trackAlpha * (0.16 + pulse * 0.16);
  ctx.strokeStyle = 'rgba(132, 255, 206, 0.78)';
  ctx.lineWidth = 1 / displayScale;
  ctx.beginPath();
  ctx.arc(latest.center.x, latest.center.y, pulseRadius * (0.82 + pulse * 0.24), 0, TAU);
  ctx.stroke();

  // Deterministic endpoint shimmer: stable sparkle positions, no random flicker or allocations.
  const shimmerTime = Math.floor(now / 90);
  const endpointsNow = [latest.first, latest.second];
  ctx.globalAlpha = trackAlpha;
  for (let endpointIndex = 0; endpointIndex < endpointsNow.length; endpointIndex++) {
    const endpoint = endpointsNow[endpointIndex];
    for (let spark = 0; spark < 3; spark++) {
      const seed = track.id * 131 + endpointIndex * 37 + spark * 19 + shimmerTime;
      const phase = seeded(seed);
      if (phase < 0.34) continue;
      const angle = seeded(seed + 11) * TAU;
      const distanceFromClub = (2.5 + seeded(seed + 23) * 6.5) / displayScale;
      const x = endpoint.x + Math.cos(angle) * distanceFromClub;
      const y = endpoint.y + Math.sin(angle) * distanceFromClub;
      const size = (0.45 + seeded(seed + 41) * 0.75) / displayScale;
      const sparkleAlpha = (phase - 0.34) / 0.66 * 0.7;

      ctx.fillStyle = spark % 2 === 0
        ? 'rgba(255, 245, 188, ' + sparkleAlpha + ')'
        : 'rgba(158, 255, 230, ' + sparkleAlpha + ')';
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
      } else if (next.includes(newDefaults)) {
        defaultsChanged = true;
      }

      const start = next.indexOf(rendererStart);
      const end = next.indexOf(rendererEnd, start);
      if (start >= 0 && end > start) {
        next = next.slice(0, start) + renderer + next.slice(end);
        rendererChanged = true;
      }

      if (!defaultsChanged || !rendererChanged) {
        throw new Error(
          'Pulse Afterimage transform failed: defaults=' + defaultsChanged + ', renderer=' + rendererChanged,
        );
      }

      return { code: next, map: null };
    },
  };
}
