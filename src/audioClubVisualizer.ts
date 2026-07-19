import type { PoiTrack } from './pixelPoi';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function sampleBand(spectrum: Uint8Array, index: number, count: number) {
  if (!spectrum.length) return 0;
  const start = Math.floor(index / count * spectrum.length * 0.7);
  const end = Math.max(start + 1, Math.floor((index + 1) / count * spectrum.length * 0.7));
  let total = 0;
  for (let bin = start; bin < end; bin++) total += spectrum[bin] ?? 0;
  return total / Math.max(1, end - start) / 255;
}

export function drawAudioClubVisualizer(
  ctx: CanvasRenderingContext2D,
  tracks: PoiTrack[],
  spectrum: Uint8Array,
  now: number,
) {
  if (!spectrum.length) return;

  const bassBins = Math.max(1, Math.floor(spectrum.length * 0.08));
  let bass = 0;
  for (let index = 0; index < bassBins; index++) bass += spectrum[index] ?? 0;
  bass = bass / bassBins / 255;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const track of tracks) {
    if (track.state === 'lost' || track.confidence < 0.16) continue;

    const barCount = clamp(Math.round(track.length / 5), 10, 28);
    const half = track.length / 2;
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.004 + track.id * 1.3);
    const bodyWidth = 2.2 + bass * 5.5;

    ctx.save();
    ctx.translate(track.center.x, track.center.y);
    ctx.rotate(track.angle);

    ctx.shadowColor = `hsl(${185 + track.id * 34} 100% 70% / ${0.45 + bass * 0.35})`;
    ctx.shadowBlur = 7 + bass * 18;
    ctx.strokeStyle = `hsl(${185 + track.id * 34} 100% 82% / ${0.72 + bass * 0.2})`;
    ctx.lineWidth = bodyWidth;
    ctx.beginPath();
    ctx.moveTo(-half, 0);
    ctx.lineTo(half, 0);
    ctx.stroke();

    ctx.shadowBlur = 0;
    for (let index = 0; index < barCount; index++) {
      const x = -half + (index + 0.5) / barCount * track.length;
      const mirrored = index < barCount / 2 ? index : barCount - 1 - index;
      const energy = sampleBand(spectrum, mirrored, Math.ceil(barCount / 2));
      const envelope = Math.sin(Math.PI * (index + 0.5) / barCount);
      const height = (2 + energy * 23 + bass * 8) * envelope;
      const hue = (190 + index * 7 + track.id * 43 + pulse * 18) % 360;
      ctx.strokeStyle = `hsl(${hue} 100% 72% / ${0.35 + energy * 0.62})`;
      ctx.lineWidth = 1.2 + energy * 2.4;
      ctx.beginPath();
      ctx.moveTo(x, -height);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    ctx.restore();
  }

  ctx.restore();
}
