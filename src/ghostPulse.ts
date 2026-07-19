import type { PoiControls, PoiPose, PoiTrack, Point } from './pixelPoi';

const TAU = Math.PI * 2;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function drawGhostClub(
  ctx: CanvasRenderingContext2D,
  center: Point,
  angle: number,
  length: number,
  stroke: string,
  width: number,
) {
  const half = length / 2;
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(angle);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(-half + 4, 0, 4.5, 0, TAU);
  ctx.moveTo(-half + 8.5, -1.2);
  ctx.lineTo(-half * 0.1, -1.8);
  ctx.bezierCurveTo(half * 0.2, -6.5, half * 0.75, -8, half * 0.9, -3.8);
  ctx.bezierCurveTo(half, -1.2, half, 1.2, half * 0.9, 3.8);
  ctx.bezierCurveTo(half * 0.75, 8, half * 0.2, 6.5, -half * 0.1, 1.8);
  ctx.lineTo(-half + 8.5, 1.2);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function ghostPoses(track: PoiTrack, now: number, controls: PoiControls) {
  const spacing = clamp(controls.crossbarFrequency, 8, 80);
  const visible = track.history.filter((pose) => {
    const age = now - pose.timestamp;
    return age > 90 && age < controls.lifetime;
  });
  const result: PoiPose[] = [];
  let lastTravel = Number.POSITIVE_INFINITY;
  let segment = -1;

  for (let index = visible.length - 1; index >= 0; index--) {
    const pose = visible[index];
    if (pose.segment !== segment) {
      segment = pose.segment;
      lastTravel = Number.POSITIVE_INFINITY;
    }
    if (lastTravel === Number.POSITIVE_INFINITY || lastTravel - pose.travel >= spacing) {
      result.push(pose);
      lastTravel = pose.travel;
    }
  }
  return result;
}

export function drawGhostPulseLayer(
  ctx: CanvasRenderingContext2D,
  tracks: PoiTrack[],
  now: number,
  controls: PoiControls,
) {
  const pulseDepth = 0.06 + clamp(controls.railSeparation, 0, 250) / 250 * 0.24;
  const brightness = controls.brightness / 100;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  for (const track of tracks) {
    const lostFade = track.state === 'lost'
      ? clamp(1 - (now - track.lastSeen) / Math.min(520, controls.lostReset), 0, 1)
      : 1;

    for (const pose of ghostPoses(track, now, controls)) {
      const age = now - pose.timestamp;
      const life = clamp(1 - age / controls.lifetime, 0, 1);
      const slowFade = life * life * (3 - 2 * life);
      const phase = now * 0.0065 - pose.timestamp * 0.0021 + track.id * 1.37;
      const pulse = 0.5 + 0.5 * Math.sin(phase);
      const scale = 1 + pulseDepth * pulse;
      const alpha = slowFade * lostFade * brightness * (0.2 + pulse * 0.42);
      const hue = (188 + track.id * 31 + age * 0.012) % 360;
      const length = pose.length * scale;

      ctx.save();
      ctx.shadowColor = `hsl(${hue} 95% 72% / ${alpha * 0.7})`;
      ctx.shadowBlur = 5 + controls.glow * 0.16 + pulse * 8;
      drawGhostClub(ctx, pose.center, pose.angle, length, `hsl(${hue} 92% 68% / ${alpha * 0.34})`, 5.5 + pulse * 2.2);
      ctx.shadowBlur = 0;
      drawGhostClub(ctx, pose.center, pose.angle, length, `hsl(${hue} 72% 88% / ${alpha})`, 1.15 + pulse * 0.55);
      ctx.restore();
    }
  }

  ctx.restore();
}
