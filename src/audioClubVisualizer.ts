import './audioControls.css';
import type { PoiTrack } from './pixelPoi';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function averageRange(spectrum: Uint8Array, startRatio: number, endRatio: number) {
  if (!spectrum.length) return 0;
  const start = Math.floor(spectrum.length * startRatio);
  const end = Math.max(start + 1, Math.floor(spectrum.length * endRatio));
  let total = 0;
  for (let index = start; index < end; index++) total += spectrum[index] ?? 0;
  return total / Math.max(1, end - start) / 255;
}

function clubShape(length: number) {
  const half = length / 2;
  const handleHalf = Math.max(2.8, length * 0.038);
  const shoulderHalf = Math.max(handleHalf * 1.8, length * 0.085);
  const bodyHalf = Math.max(shoulderHalf * 1.35, length * 0.14);
  const knobRadius = Math.max(handleHalf * 1.18, length * 0.048);
  const handleEnd = half * 0.38;
  const shoulder = half * 0.12;
  const bodyEnd = -half * 0.82;

  const path = new Path2D();
  path.moveTo(half - knobRadius * 0.55, -handleHalf);
  path.lineTo(handleEnd, -handleHalf);
  path.bezierCurveTo(shoulder * 1.4, -handleHalf, shoulder, -shoulderHalf, shoulder, -shoulderHalf);
  path.bezierCurveTo(-half * 0.08, -bodyHalf * 0.78, bodyEnd * 0.72, -bodyHalf, bodyEnd, -bodyHalf * 0.72);
  path.bezierCurveTo(-half, -bodyHalf * 0.5, -half, bodyHalf * 0.5, bodyEnd, bodyHalf * 0.72);
  path.bezierCurveTo(bodyEnd * 0.72, bodyHalf, -half * 0.08, bodyHalf * 0.78, shoulder, shoulderHalf);
  path.bezierCurveTo(shoulder * 1.4, handleHalf, handleEnd, handleHalf, half - knobRadius * 0.55, handleHalf);
  path.closePath();
  path.moveTo(half - knobRadius, 0);
  path.arc(half - knobRadius * 0.15, 0, knobRadius, 0, Math.PI * 2);
  return path;
}

function addStop(gradient: CanvasGradient, offset: number, color: string) {
  gradient.addColorStop(clamp(offset, 0, 1), color);
}

export function drawAudioClubVisualizer(
  ctx: CanvasRenderingContext2D,
  tracks: PoiTrack[],
  spectrum: Uint8Array,
  now: number,
) {
  if (!spectrum.length) return;

  const bass = averageRange(spectrum, 0, 0.08);
  const lowMid = averageRange(spectrum, 0.08, 0.22);
  const highMid = averageRange(spectrum, 0.22, 0.48);
  const treble = averageRange(spectrum, 0.48, 0.82);
  const overall = clamp(bass * 0.42 + lowMid * 0.3 + highMid * 0.2 + treble * 0.08, 0, 1);
  const sharedPhase = (now * (0.00016 + lowMid * 0.00042)) % 1;
  const chase = (now * (0.00028 + treble * 0.0007)) % 1;
  const beatFlash = clamp((bass - 0.22) * 2.2, 0, 1);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const visibleTracks = tracks
    .filter((track) => track.state !== 'lost' && track.confidence >= 0.16)
    .sort((a, b) => a.center.x - b.center.x);

  visibleTracks.forEach((track, clubIndex) => {
    const length = clamp(track.length, 34, 210);
    const half = length / 2;
    const shape = clubShape(length);
    const groupOffset = visibleTracks.length > 1 ? clubIndex / visibleTracks.length : 0;
    const hueBase = (285 + sharedPhase * 90 + groupOffset * 75) % 360;
    const localChase = (chase + groupOffset * 0.18) % 1;
    const sweepX = -half + localChase * length;
    const sweepWidth = length * (0.12 + highMid * 0.14);
    const dimGate = 0.22 + overall * 0.78;

    ctx.save();
    ctx.translate(track.center.x, track.center.y);
    ctx.rotate(track.angle);
    ctx.clip(shape);

    ctx.globalAlpha = 0.78 + overall * 0.22;
    const base = ctx.createLinearGradient(-half, 0, half, 0);
    addStop(base, 0, `hsl(${(hueBase + 42) % 360} 100% ${34 + bass * 24}% / ${0.4 + dimGate * 0.55})`);
    addStop(base, 0.28, `hsl(${(hueBase + 18) % 360} 100% ${44 + lowMid * 28}% / ${0.5 + dimGate * 0.45})`);
    addStop(base, 0.58, `hsl(${hueBase} 100% ${52 + highMid * 26}% / ${0.55 + dimGate * 0.4})`);
    addStop(base, 1, `hsl(${(hueBase - 34 + 360) % 360} 100% ${36 + treble * 30}% / ${0.42 + dimGate * 0.5})`);
    ctx.fillStyle = base;
    ctx.fillRect(-half - 8, -length * 0.22, length + 16, length * 0.44);

    const wipe = ctx.createLinearGradient(sweepX - sweepWidth, 0, sweepX + sweepWidth, 0);
    addStop(wipe, 0, 'rgba(255,255,255,0)');
    addStop(wipe, 0.38, `rgba(255,255,255,${0.08 + highMid * 0.35})`);
    addStop(wipe, 0.5, `rgba(255,255,255,${0.46 + beatFlash * 0.48})`);
    addStop(wipe, 0.62, `rgba(255,245,220,${0.1 + treble * 0.32})`);
    addStop(wipe, 1, 'rgba(255,255,255,0)');
    ctx.fillStyle = wipe;
    ctx.fillRect(-half - 8, -length * 0.24, length + 16, length * 0.48);

    const bodyBloom = ctx.createRadialGradient(-half * 0.48, 0, 0, -half * 0.48, 0, length * 0.3);
    addStop(bodyBloom, 0, `rgba(255,255,255,${0.16 + bass * 0.35})`);
    addStop(bodyBloom, 1, 'rgba(255,255,255,0)');
    ctx.fillStyle = bodyBloom;
    ctx.fillRect(-half, -length * 0.22, length * 0.62, length * 0.44);

    ctx.restore();

    ctx.save();
    ctx.translate(track.center.x, track.center.y);
    ctx.rotate(track.angle);
    ctx.strokeStyle = `hsl(${hueBase} 100% 80% / ${0.42 + overall * 0.4})`;
    ctx.lineWidth = 1.1 + bass * 1.8;
    ctx.shadowColor = `hsl(${hueBase} 100% 70% / ${0.52 + overall * 0.32})`;
    ctx.shadowBlur = 8 + bass * 22 + beatFlash * 12;
    ctx.stroke(shape);
    ctx.restore();
  });

  ctx.restore();
}
