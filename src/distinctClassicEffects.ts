import type { CompositeControls, EffectControls, PresetId } from './effects';

const DISTINCT_CLASSIC_IDS = new Set<PresetId>(['mirror-split', 'scanline-slice', 'light-tunnel', 'prism-burst', 'orbit-echo']);

export function isDistinctClassicEffect(id: PresetId) {
  return DISTINCT_CLASSIC_IDS.has(id);
}

export function drawDistinctClassicEffect(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  id: PresetId,
  now: number,
  controls: EffectControls,
  composite: CompositeControls,
  widthScale: number,
  heightScale: number,
) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const drawWidth = width * widthScale;
  const drawHeight = height * heightScale;
  const drawX = (width - drawWidth) / 2;
  const drawY = (height - drawHeight) / 2;
  const alpha = controls.intensity / 100;

  ctx.save();
  ctx.globalCompositeOperation = composite.blendMode;
  ctx.globalAlpha = alpha;

  if (id === 'mirror-split') {
    ctx.translate(width / 2, height / 2);
    const quadrantWidth = drawWidth / 2;
    const quadrantHeight = drawHeight / 2;
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        ctx.save();
        ctx.scale(sx, sy);
        ctx.filter = `hue-rotate(${controls.hue + (sx < 0 ? 65 : 0) + (sy < 0 ? 125 : 0)}deg) saturate(${controls.saturation / 45})`;
        ctx.drawImage(source, 0, 0, source.width, source.height, 0, 0, quadrantWidth, quadrantHeight);
        ctx.restore();
      }
    }
  } else if (id === 'scanline-slice') {
    const bands = 18;
    const bandHeight = drawHeight / bands;
    for (let index = 0; index < bands; index++) {
      const sourceY = source.height * index / bands;
      const offset = Math.sin(now * 0.006 + index * 0.9) * (12 + controls.driftX * 0.35);
      ctx.filter = `hue-rotate(${controls.hue + index * 11}deg) saturate(${controls.saturation / 55})`;
      ctx.drawImage(source, 0, sourceY, source.width, source.height / bands, drawX + offset, drawY + index * bandHeight, drawWidth, bandHeight + 1);
    }
  } else if (id === 'light-tunnel') {
    ctx.translate(width / 2, height / 2);
    const layers = 9;
    for (let index = layers - 1; index >= 0; index--) {
      const phase = ((now * 0.00045 + index / layers) % 1 + 1) % 1;
      const scale = 0.18 + phase * 0.95;
      ctx.save();
      ctx.globalAlpha = alpha * (1 - phase) * 0.9;
      ctx.rotate((controls.spin / 100) * phase * 0.8);
      ctx.filter = `hue-rotate(${controls.hue + phase * 220}deg) saturate(${controls.saturation / 50})`;
      ctx.drawImage(source, -drawWidth * scale / 2, -drawHeight * scale / 2, drawWidth * scale, drawHeight * scale);
      ctx.restore();
    }
  } else if (id === 'prism-burst') {
    ctx.translate(width / 2, height / 2);
    const copies = [
      { angle: -0.055, hue: 0, x: -14 },
      { angle: 0, hue: 120, x: 0 },
      { angle: 0.055, hue: 240, x: 14 },
    ];
    for (const copy of copies) {
      ctx.save();
      ctx.rotate(copy.angle + Math.sin(now * 0.003) * 0.015);
      ctx.globalAlpha = alpha * 0.68;
      ctx.filter = `hue-rotate(${controls.hue + copy.hue}deg) saturate(${Math.max(1.4, controls.saturation / 45)}) contrast(1.35)`;
      ctx.drawImage(source, -drawWidth / 2 + copy.x, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();
    }
  } else if (id === 'orbit-echo') {
    ctx.translate(width / 2 + controls.driftX * 0.7, height / 2 + controls.driftY * 0.7);
    const copies = Math.max(5, Math.min(14, Math.round(5 + controls.trail * 0.09)));
    const direction = controls.spin < 0 ? -1 : 1;
    const speed = direction * (0.00012 + Math.abs(controls.spin) * 0.000012);
    const orbitRadius = Math.min(width, height) * (0.09 + Math.max(-100, Math.min(100, controls.expansion)) * 0.0014);
    const pulse = 0.92 + Math.sin(now * (0.001 + controls.cycle * 0.00003)) * 0.08;
    const copyWidth = drawWidth * 0.42 * pulse;
    const copyHeight = drawHeight * 0.42 * pulse;
    const baseRotation = now * speed;

    for (let index = 0; index < copies; index++) {
      const phase = index / copies;
      const angle = baseRotation + phase * Math.PI * 2 + controls.echo * 0.0008;
      const radius = orbitRadius * (0.88 + Math.sin(now * 0.0018 + index * 1.7) * 0.12);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);
      ctx.globalAlpha = alpha * (0.28 + (1 - phase) * 0.34);
      ctx.filter = `hue-rotate(${controls.hue + phase * 300 + now * controls.cycle * 0.002}deg) saturate(${Math.max(1.2, controls.saturation / 48)}) blur(${Math.max(0, controls.blur * 0.22)}px)`;
      ctx.drawImage(source, -copyWidth / 2, -copyHeight / 2, copyWidth, copyHeight);
      ctx.restore();
    }

    if (controls.glow > 0) {
      ctx.save();
      ctx.globalAlpha = alpha * controls.glow / 240;
      ctx.filter = `blur(${Math.max(2, controls.glow * 0.12)}px) saturate(${Math.max(1.5, controls.saturation / 40)})`;
      ctx.drawImage(source, -drawWidth * 0.22, -drawHeight * 0.22, drawWidth * 0.44, drawHeight * 0.44);
      ctx.restore();
    }
  }

  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}
