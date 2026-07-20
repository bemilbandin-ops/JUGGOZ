import { PATTERN_PRESETS, type PatternId } from './pixelPoiPatterns';

export type PresetId = PatternId | 'neon' | 'ghost' | 'smoke' | 'vortex' | 'mirror-split' | 'scanline-slice' | 'light-tunnel' | 'prism-burst' | 'orbit-echo';

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
    id: 'mirror-split', name: 'Mirror Split', description: 'Motion is reflected into four independently tinted quadrants instead of leaving a conventional trail.',
    defaults: { trail: 45, intensity: 92, glow: 22, sensitivity: 72, isolation: 76, blur: 0, expansion: 0, spin: 0, driftX: 0, driftY: 0, hue: 20, cycle: 0, saturation: 95, echo: 0 },
  },
  {
    id: 'scanline-slice', name: 'Scanline Slice', description: 'The moving clubs are cut into animated horizontal bands that slide independently across the frame.',
    defaults: { trail: 40, intensity: 100, glow: 12, sensitivity: 72, isolation: 77, blur: 0, expansion: 0, spin: 0, driftX: 45, driftY: 0, hue: 190, cycle: 0, saturation: 100, echo: 0 },
  },
  {
    id: 'light-tunnel', name: 'Light Tunnel', description: 'Repeated motion layers travel through depth toward the viewer, creating a luminous perspective tunnel.',
    defaults: { trail: 60, intensity: 92, glow: 32, sensitivity: 71, isolation: 75, blur: 0.5, expansion: 0, spin: 22, driftX: 0, driftY: 0, hue: 260, cycle: 0, saturation: 95, echo: 0 },
  },
  {
    id: 'prism-burst', name: 'Prism Burst', description: 'Three angular color-separated copies split moving club light into sharp red, green, and blue shards.',
    defaults: { trail: 38, intensity: 100, glow: 28, sensitivity: 74, isolation: 78, blur: 0, expansion: 0, spin: 0, driftX: 0, driftY: 0, hue: 0, cycle: 0, saturation: 100, echo: 0 },
  },
  {
    id: 'orbit-echo', name: 'Orbit Echo', description: 'Multiple color-shifted copies of the isolated club motion circle the performer in a rotating ring.',
    defaults: { trail: 72, intensity: 96, glow: 34, sensitivity: 72, isolation: 77, blur: 0.5, expansion: 24, spin: 58, driftX: 0, driftY: 0, hue: 195, cycle: 34, saturation: 100, echo: 120 },
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
