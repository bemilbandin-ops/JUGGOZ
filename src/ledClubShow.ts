import { CLUB_EFFECTS, DEFAULT_POI_CONTROLS, PATTERN_CONTROL_DEFAULTS, type PoiControls, type PoiTrack } from './pixelPoi';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

// Register this standalone renderer with the shared tracking system. The preset is
// drawn separately in VideoStage, but updateTracks still needs defaults and a safe
// transient-effect entry for switching between patterns.
PATTERN_CONTROL_DEFAULTS['led-club-show'] = {
  ...DEFAULT_POI_CONTROLS,
  lifetime: 900,
  brightness: 92,
  glow: 48,
  smoothing: 72,
};
CLUB_EFFECTS['led-club-show'] = CLUB_EFFECTS['neon-rails'];

function roundedClubPath(length: number, width: number) {
  const half = length / 2;
  const path = new Path2D();
  path.moveTo(-half, -width * 0.22);
  path.lineTo(half * 0.18, -width * 0.28);
  path.bezierCurveTo(half * 0.58, -width * 0.45, half * 0.9, -width * 0.52, half, -width * 0.2);
  path.bezierCurveTo(half + width * 0.05, 0, half + width * 0.05, 0, half, width * 0.2);
  path.bezierCurveTo(half * 0.9, width * 0.52, half * 0.58, width * 0.45, half * 0.18, width * 0.28);
  path.lineTo(-half, width * 0.22);
  path.closePath();
  return path;
}

export function drawLedClubShow(
  ctx: CanvasRenderingContext2D,
  tracks: PoiTrack[],
  now: number,
  controls: PoiControls,
) {
  const cycle = now * 0.0018;
  const beat = 0.5 + 0.5 * Math.sin(now * 0.008);
  const flash = Math.pow(Math.max(0, Math.sin(now * 0.018)), 10);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (const track of tracks) {
    if (track.state === 'lost' || track.confidence < 0.16) continue;

    const length = clamp(track.length, 28, 190);
    const width = clamp(length * 0.18, 8, 32);
    const half = length / 2;
    const phase = cycle + track.id * 0.9;
    const hueA = (phase * 85 + track.id * 72) % 360;
    const hueB = (hueA + 110 + Math.sin(phase) * 35) % 360;
    const wipe = ((phase * 0.7) % 1 + 1) % 1;
    const bandX = -half + wipe * length;
    const pulse = 0.78 + beat * 0.18 + flash * 0.5;

    ctx.save();
    ctx.translate(track.center.x, track.center.y);
    ctx.rotate(track.angle);

    const shape = roundedClubPath(length, width);
    ctx.clip(shape);

    const gradient = ctx.createLinearGradient(-half, 0, half, 0);
    gradient.addColorStop(0, `hsl(${hueA} 100% 55%)`);
    gradient.addColorStop(0.45, `hsl(${(hueA + 35) % 360} 100% 62%)`);
    gradient.addColorStop(1, `hsl(${hueB} 100% 58%)`);
    ctx.fillStyle = gradient;
    ctx.globalAlpha = pulse * controls.brightness / 100;
    ctx.fillRect(-half - width, -width, length + width * 2, width * 2);

    ctx.globalAlpha = 0.35 + beat * 0.2;
    ctx.fillStyle = `hsl(${(hueB + 40) % 360} 100% 70%)`;
    ctx.fillRect(-half, -width, length * (0.25 + 0.18 * Math.sin(phase * 1.7)), width * 2);

    ctx.globalAlpha = 0.85;
    ctx.shadowColor = 'white';
    ctx.shadowBlur = 8 + controls.glow * 0.12;
    const bandWidth = width * (0.32 + flash * 0.45);
    const whiteBand = ctx.createLinearGradient(bandX - bandWidth, 0, bandX + bandWidth, 0);
    whiteBand.addColorStop(0, 'rgba(255,255,255,0)');
    whiteBand.addColorStop(0.5, 'rgba(255,255,255,1)');
    whiteBand.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = whiteBand;
    ctx.fillRect(bandX - bandWidth, -width, bandWidth * 2, width * 2);

    ctx.restore();

    ctx.save();
    ctx.translate(track.center.x, track.center.y);
    ctx.rotate(track.angle);
    ctx.strokeStyle = `hsla(${hueA},100%,75%,${0.45 + beat * 0.3})`;
    ctx.lineWidth = 1.2;
    ctx.shadowColor = `hsl(${hueA} 100% 60%)`;
    ctx.shadowBlur = 10 + controls.glow * 0.1;
    ctx.stroke(roundedClubPath(length, width));
    ctx.restore();
  }

  ctx.restore();
}
