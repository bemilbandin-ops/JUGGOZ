import { PATTERN_PRESETS, type PatternId } from './pixelPoiPatterns';

export type PresetId = PatternId | 'neon' | 'ghost' | 'smoke' | 'vortex' | 'solar-flare' | 'orbit-echo' | 'aurora-drift' | 'meteor-rain';

export type EffectControls = {
  trail: number;
  intensity: number;
  glow: number;
  sensitivity: number;
  isolation: number;
  blur: number;
  expansion: number;
  spin: number;
  driftX: number;
  driftY: number;
  hue: number;
  cycle: number;
  saturation: number;
  echo: number;
};

export type EffectPreset = {
  id: PresetId;
  name: string;
  description: string;
  defaults: EffectControls;
};

export const BLEND_MODES = [
  { value: 'source-over', label: 'Normal (Solid)' },
  { value: 'screen', label: 'Screen (Glow)' },
  { value: 'lighter', label: 'Additive (Intense)' },
  { value: 'color-dodge', label: 'Color Dodge' },
] as const;

export type BlendMode = typeof BLEND_MODES[number]['value'];
export type CompositeControls = { invert: boolean; blendMode: BlendMode };
export const DEFAULT_COMPOSITE_CONTROLS: CompositeControls = { invert: false, blendMode: 'screen' };

export function effectLayerFilter(invert: boolean, filter = ''): string {
  return `${invert ? 'invert(1)' : ''} ${filter}`.trim() || 'none';
}

const CLUB_DEFAULTS: EffectControls = { trail: 88, intensity: 100, glow: 35, sensitivity: 74, isolation: 78, blur: 0, expansion: 0, spin: 0, driftX: 0, driftY: 0, hue: 0, cycle: 0, saturation: 100, echo: 0 };

export const PRESETS: EffectPreset[] = [
  ...PATTERN_PRESETS.map(({ id, name, description }) => ({ id, name, description, defaults: { ...CLUB_DEFAULTS } })),
  {
    id: 'neon', name: 'Neon', description: 'A tight, bright trail with crisp edges and rapid color cycling.',
    defaults: { trail: 70, intensity: 100, glow: 20, sensitivity: 72, isolation: 78, blur: 0, expansion: 5, spin: 0, driftX: 0, driftY: 0, hue: 320, cycle: 70, saturation: 100, echo: 0 },
  },
  {
    id: 'ghost', name: 'Ghost', description: 'Freezes crisp, separated snapshots with restrained glow and no geometric movement.',
    defaults: { trail: 82, intensity: 100, glow: 15, sensitivity: 68, isolation: 74, blur: 0, expansion: 0, spin: 0, driftX: 0, driftY: 0, hue: 185, cycle: 0, saturation: 55, echo: 160 },
  },
  {
    id: 'smoke', name: 'Smoke', description: 'A wide, desaturated cloud that expands and rises quickly away from the props.',
    defaults: { trail: 96, intensity: 60, glow: 50, sensitivity: 70, isolation: 70, blur: 9, expansion: 35, spin: -4, driftX: 10, driftY: -70, hue: 265, cycle: 8, saturation: 35, echo: 0 },
  },
  {
    id: 'vortex', name: 'Vortex', description: 'A long, saturated trail pulled sharply inward while rotating around the frame center.',
    defaults: { trail: 96, intensity: 90, glow: 35, sensitivity: 70, isolation: 74, blur: 1, expansion: -28, spin: 65, driftX: 0, driftY: 0, hue: 215, cycle: 25, saturation: 90, echo: 0 },
  },
  {
    id: 'solar-flare', name: 'Solar Flare', description: 'A compact orange-hot burst that rapidly blooms outward from every bright club movement.',
    defaults: { trail: 58, intensity: 100, glow: 72, sensitivity: 74, isolation: 78, blur: 2.5, expansion: 82, spin: 5, driftX: 0, driftY: -8, hue: 18, cycle: 14, saturation: 100, echo: 0 },
  },
  {
    id: 'orbit-echo', name: 'Orbit Echo', description: 'Crisp snapshots step around shallow rotating arcs instead of forming a continuous trail.',
    defaults: { trail: 78, intensity: 92, glow: 18, sensitivity: 70, isolation: 76, blur: 0, expansion: 2, spin: 28, driftX: 18, driftY: -8, hue: 190, cycle: 38, saturation: 92, echo: 105 },
  },
  {
    id: 'aurora-drift', name: 'Aurora Drift', description: 'Soft luminous color curtains slide sideways across the frame with slow, calm hue movement.',
    defaults: { trail: 94, intensity: 72, glow: 46, sensitivity: 69, isolation: 70, blur: 5.5, expansion: 8, spin: 0, driftX: 82, driftY: -12, hue: 128, cycle: 11, saturation: 76, echo: 0 },
  },
  {
    id: 'meteor-rain', name: 'Meteor Rain', description: 'Bright club motion falls into long vertical streaks with a fast electric color cycle.',
    defaults: { trail: 92, intensity: 94, glow: 30, sensitivity: 73, isolation: 78, blur: 1, expansion: -4, spin: 0, driftX: 3, driftY: 96, hue: 208, cycle: 52, saturation: 100, echo: 0 },
  },
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function trailFade(trail: number): number {
  return 0.6 - clamp(trail, 0, 100) * 0.00585;
}

export function motionThreshold(sensitivity: number): number {
  return 175 - clamp(sensitivity, 0, 100) * 1.5;
}

export function lightThreshold(isolation: number): number {
  // ponytail: brightness isolates LED props; add color/ROI segmentation when non-lit props need tracking.
  return isolation <= 0 ? 0 : 80 + clamp(isolation, 0, 100) * 1.75;
}

export function trailTransform(controls: EffectControls) {
  return {
    rotation: clamp(controls.spin, -100, 100) * 0.0004,
    zoom: 1 + clamp(controls.expansion, -100, 100) * 0.0004,
    dx: clamp(controls.driftX, -100, 100) * 0.04,
    dy: clamp(controls.driftY, -100, 100) * 0.04,
  };
}

export function extractMotion(
  current: ImageData,
  background: Float32Array,
  output: ImageData,
  threshold: number,
  brightnessThreshold: number,
  learningRate = 0.045,
) {
  const pixels = current.data;
  const target = output.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const difference = Math.abs(pixels[i] - background[i]) + Math.abs(pixels[i + 1] - background[i + 1]) + Math.abs(pixels[i + 2] - background[i + 2]);
    const brightness = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
    const moving = difference > threshold && (brightnessThreshold === 0 || brightness > brightnessThreshold);
    const motionAlpha = Math.min(255, (difference - threshold) * 4);
    const isolationAlpha = brightnessThreshold === 0 ? 255 : Math.min(255, (brightness - brightnessThreshold) * 8);
    target[i] = pixels[i];
    target[i + 1] = pixels[i + 1];
    target[i + 2] = pixels[i + 2];
    target[i + 3] = moving ? Math.min(motionAlpha, isolationAlpha) : 0;
    const rate = moving ? learningRate * 0.08 : learningRate;
    background[i] += (pixels[i] - background[i]) * rate;
    background[i + 1] += (pixels[i + 1] - background[i + 1]) * rate;
    background[i + 2] += (pixels[i + 2] - background[i + 2]) * rate;
  }
}
