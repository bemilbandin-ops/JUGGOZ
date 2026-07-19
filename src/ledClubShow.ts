import './clubEchoTrail';
import { CLUB_EFFECTS, DEFAULT_POI_CONTROLS, PATTERN_CONTROL_DEFAULTS, type PoiControls, type PoiTrack } from './pixelPoi';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

PATTERN_CONTROL_DEFAULTS['led-club-show'] = {
  ...DEFAULT_POI_CONTROLS,
  lifetime: 900,
  brightness: 92,
  glow: 32,
  smoothing: 72,
};
CLUB_EFFECTS['led-club-show'] = CLUB_EFFECTS['neon-rails'];

function hslToRgb(hue: number, saturation: number, lightness: number) {
  const h = ((hue % 360) + 360) % 360 / 360;
  const s = clamp(saturation, 0, 1);
  const l = clamp(lightness, 0, 1);
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const section = h * 6;
  const x = chroma * (1 - Math.abs(section % 2 - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (section < 1) [red, green] = [chroma, x];
  else if (section < 2) [red, green] = [x, chroma];
  else if (section < 3) [green, blue] = [chroma, x];
  else if (section < 4) [green, blue] = [x, chroma];
  else if (section < 5) [red, blue] = [x, chroma];
  else [red, blue] = [chroma, x];

  const match = l - chroma / 2;
  return [
    Math.round((red + match) * 255),
    Math.round((green + match) * 255),
    Math.round((blue + match) * 255),
  ];
}

export function drawLedClubShow(
  ctx: CanvasRenderingContext2D,
  tracks: PoiTrack[],
  now: number,
  controls: PoiControls,
) {
  const source = document.querySelector<HTMLCanvasElement>('.stage > canvas.is-ready');
  const sourceCtx = source?.getContext('2d', { willReadFrequently: true });
  if (!source || !sourceCtx || source.width < 1 || source.height < 1) return;

  const sourcePixels = sourceCtx.getImageData(0, 0, source.width, source.height);
  const output = document.createElement('canvas');
  output.width = source.width;
  output.height = source.height;
  const outputCtx = output.getContext('2d');
  if (!outputCtx) return;
  const colored = outputCtx.createImageData(source.width, source.height);

  const transform = ctx.getTransform();
  const scaleX = Math.hypot(transform.a, transform.b);
  const scaleY = Math.hypot(transform.c, transform.d);
  const averageScale = Math.max(0.001, (scaleX + scaleY) / 2);
  const chasePosition = ((now * 0.00055) % 1 + 1) % 1;
  const brightness = controls.brightness / 100;

  for (const track of tracks) {
    if (track.state === 'lost' || track.confidence < 0.16) continue;

    const centerX = track.center.x * transform.a + track.center.y * transform.c + transform.e;
    const centerY = track.center.x * transform.b + track.center.y * transform.d + transform.f;
    const angle = track.angle + Math.atan2(transform.b, transform.a);
    const length = clamp(track.length * averageScale, 24, 420);
    const halfLength = length / 2;
    const radius = clamp(length * 0.12, 6, 34);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const padding = radius + 4;
    const minX = Math.max(0, Math.floor(centerX - Math.abs(cos) * halfLength - Math.abs(sin) * radius - padding));
    const maxX = Math.min(source.width - 1, Math.ceil(centerX + Math.abs(cos) * halfLength + Math.abs(sin) * radius + padding));
    const minY = Math.max(0, Math.floor(centerY - Math.abs(sin) * halfLength - Math.abs(cos) * radius - padding));
    const maxY = Math.min(source.height - 1, Math.ceil(centerY + Math.abs(sin) * halfLength + Math.abs(cos) * radius + padding));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const along = dx * cos + dy * sin;
        const across = -dx * sin + dy * cos;
        if (Math.abs(along) > halfLength || Math.abs(across) > radius) continue;

        const pixelIndex = (y * source.width + x) * 4;
        const red = sourcePixels.data[pixelIndex];
        const green = sourcePixels.data[pixelIndex + 1];
        const blue = sourcePixels.data[pixelIndex + 2];
        const luminance = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;
        const maximum = Math.max(red, green, blue);
        const minimum = Math.min(red, green, blue);
        const saturation = maximum === 0 ? 0 : (maximum - minimum) / maximum;

        const texture = clamp((luminance - 0.075) * 2.8 + saturation * 0.45, 0, 1);
        if (texture < 0.12) continue;

        const t = along / length + 0.5;
        const wrappedDistance = Math.min(Math.abs(t - chasePosition), 1 - Math.abs(t - chasePosition));
        const chase = Math.max(0, 1 - wrappedDistance / 0.13);
        const snake = 0.5 + 0.5 * Math.sin(t * Math.PI * 7 - now * 0.007 + track.id * 1.3);
        const hue = (now * 0.045 + track.id * 67 + t * 230 + snake * 42) % 360;
        const lightness = clamp(0.42 + luminance * 0.28 + chase * 0.22, 0, 0.82);
        const [tintRed, tintGreen, tintBlue] = hslToRgb(hue, 0.96, lightness);
        const alpha = clamp(texture * (0.38 + snake * 0.22 + chase * 0.38) * brightness, 0, 0.96);

        colored.data[pixelIndex] = tintRed;
        colored.data[pixelIndex + 1] = tintGreen;
        colored.data[pixelIndex + 2] = tintBlue;
        colored.data[pixelIndex + 3] = Math.round(alpha * 255);
      }
    }
  }

  outputCtx.putImageData(colored, 0, 0);

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'screen';
  if (controls.glow > 0) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.filter = `blur(${Math.max(1, controls.glow * 0.045)}px)`;
    ctx.drawImage(output, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.filter = 'none';
  ctx.drawImage(output, 0, 0);
  ctx.restore();
}
