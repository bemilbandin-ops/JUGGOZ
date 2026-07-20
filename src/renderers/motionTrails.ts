import { trailFade, trailTransform } from '../effects';
import type { EffectRenderer } from '../effectModel';

export function createMotionTrailsRenderer(): EffectRenderer {
  const trailCanvas = document.createElement('canvas');
  const trailCtx = trailCanvas.getContext('2d')!;
  const transformedCanvas = document.createElement('canvas');
  const transformedCtx = transformedCanvas.getContext('2d')!;
  let lastSample = 0;

  const reset = () => {
    trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
    transformedCtx.clearRect(0, 0, transformedCanvas.width, transformedCanvas.height);
    lastSample = 0;
  };

  return {
    resize(width, height) {
      if (trailCanvas.width === width && trailCanvas.height === height) return;
      trailCanvas.width = transformedCanvas.width = width;
      trailCanvas.height = transformedCanvas.height = height;
      reset();
    },

    reset,

    render({ now, output, mask, displayWidth, displayHeight, controls }) {
      transformedCtx.clearRect(0, 0, transformedCanvas.width, transformedCanvas.height);
      transformedCtx.filter = controls.blur > 0 ? `blur(${controls.blur * 0.08}px)` : 'none';
      transformedCtx.drawImage(trailCanvas, 0, 0);
      transformedCtx.filter = 'none';

      trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
      trailCtx.save();
      const transform = trailTransform(controls);
      trailCtx.translate(trailCanvas.width / 2, trailCanvas.height / 2);
      trailCtx.rotate(transform.rotation);
      trailCtx.scale(transform.zoom, transform.zoom);
      trailCtx.translate(
        -trailCanvas.width / 2 + transform.dx,
        -trailCanvas.height / 2 + transform.dy,
      );
      trailCtx.drawImage(transformedCanvas, 0, 0);
      trailCtx.restore();

      trailCtx.globalCompositeOperation = 'destination-out';
      trailCtx.fillStyle = `rgba(0,0,0,${trailFade(controls.trail)})`;
      trailCtx.fillRect(0, 0, trailCanvas.width, trailCanvas.height);
      trailCtx.globalCompositeOperation = 'source-over';

      if (!controls.echo || now - lastSample >= controls.echo) {
        lastSample = now;
        const hue = (controls.hue + now * controls.cycle * 0.0006) % 360;
        const blur = Math.max(0.35, controls.blur);
        trailCtx.filter = `brightness(.7) contrast(1.45) sepia(1) saturate(${controls.saturation / 8}) hue-rotate(${hue}deg) blur(${blur}px)`;
        trailCtx.drawImage(mask, 0, 0);
        trailCtx.filter = 'none';
      }

      output.globalCompositeOperation = 'screen';
      if (controls.glow > 0) {
        output.save();
        output.globalAlpha = controls.glow / 100 * controls.intensity / 100;
        output.filter = `blur(${controls.glow / 10}px)`;
        output.drawImage(trailCanvas, 0, 0, displayWidth, displayHeight);
        output.restore();
      }
      output.globalAlpha = controls.intensity / 100;
      output.drawImage(trailCanvas, 0, 0, displayWidth, displayHeight);
      output.globalAlpha = 1;
      output.globalCompositeOperation = 'source-over';
    },
  };
}
