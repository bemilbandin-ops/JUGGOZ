import { CLUB_EFFECTS, DEFAULT_POI_CONTROLS, PATTERN_CONTROL_DEFAULTS, type PoiControls, type PoiTrack } from './pixelPoi';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

PATTERN_CONTROL_DEFAULTS['led-club-show'] = {
  ...DEFAULT_POI_CONTROLS,
  lifetime: 900,
  brightness: 92,
  glow: 40,
  smoothing: 72,
};
CLUB_EFFECTS['led-club-show'] = CLUB_EFFECTS['neon-rails'];

export function drawLedClubShow(
  ctx: CanvasRenderingContext2D,
  tracks: PoiTrack[],
  now: number,
  controls: PoiControls,
) {
  const speed = now * 0.0022;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';

  for (const track of tracks) {
    if (track.state === 'lost' || track.confidence < 0.16) continue;

    const length = clamp(track.length, 28, 190);
    const half = length / 2;
    const segmentCount = clamp(Math.round(length / 8), 8, 24);
    const segmentLength = length / segmentCount;
    const phase = speed + track.id * 0.75;
    const chase = ((phase * 0.55) % 1 + 1) % 1;

    ctx.save();
    ctx.translate(track.center.x, track.center.y);
    ctx.rotate(track.angle);

    for (let index = 0; index < segmentCount; index++) {
      const t = (index + 0.5) / segmentCount;
      const x = -half + t * length;
      const distanceToChase = Math.min(Math.abs(t - chase), 1 - Math.abs(t - chase));
      const chaseBoost = Math.max(0, 1 - distanceToChase / 0.16);
      const snake = 0.5 + 0.5 * Math.sin(t * Math.PI * 5.5 - phase * 4.2);
      const hue = (phase * 70 + track.id * 58 + t * 210 + snake * 35) % 360;
      const alpha = (0.18 + snake * 0.32 + chaseBoost * 0.45) * controls.brightness / 100;
      const width = 2 + chaseBoost * 2.4;

      ctx.strokeStyle = `hsla(${hue},100%,68%,${alpha})`;
      ctx.lineWidth = width;
      ctx.shadowColor = `hsl(${hue} 100% 60%)`;
      ctx.shadowBlur = 2 + controls.glow * 0.055 + chaseBoost * 7;
      ctx.beginPath();
      ctx.moveTo(x - segmentLength * 0.34, 0);
      ctx.lineTo(x + segmentLength * 0.34, 0);
      ctx.stroke();
    }

    ctx.restore();
  }

  ctx.restore();
}
