import type { PresetId } from './effects';

export type EffectTypeId = 'tracked-club' | 'motion-trail' | 'frame-distortion';
export type EffectRendererKey = 'pixel-poi' | 'trail-buffer' | 'distinct-classic';

export type EffectType = {
  id: EffectTypeId;
  name: string;
  description: string;
  rendererKey: EffectRendererKey;
};

export const EFFECT_TYPES: readonly EffectType[] = [
  {
    id: 'tracked-club',
    name: 'Tracked clubs',
    description: 'Detects each club and draws local geometry, particles, snapshots, or light structures around its tracked pose.',
    rendererKey: 'pixel-poi',
  },
  {
    id: 'motion-trail',
    name: 'Motion trails',
    description: 'Feeds isolated motion into one reusable trail buffer. Neon, Ghost, Smoke, and Vortex are looks for this renderer.',
    rendererKey: 'trail-buffer',
  },
  {
    id: 'frame-distortion',
    name: 'Frame distortions',
    description: 'Slices, mirrors, separates, duplicates, or projects isolated motion with dedicated full-frame drawing code.',
    rendererKey: 'distinct-classic',
  },
];

export const PRESET_EFFECT_TYPES: Record<PresetId, EffectTypeId> = {
  'neon-rails': 'tracked-club',
  'led-club-show': 'tracked-club',
  'prism-ribbon': 'tracked-club',
  'chromatic-echoes': 'tracked-club',
  'electric-comets': 'tracked-club',
  'kinetic-lattice': 'tracked-club',
  'psychedelic-serpent': 'tracked-club',
  'apex-shatter': 'tracked-club',
  'pixel-mosaic': 'tracked-club',
  'radial-pov': 'tracked-club',
  'acid-blooms': 'tracked-club',
  'liquid-portal': 'tracked-club',
  'kaleido-tunnel': 'tracked-club',
  'melting-rainbow': 'tracked-club',
  'hypno-eyes': 'tracked-club',
  'cosmic-spores': 'tracked-club',
  neon: 'motion-trail',
  ghost: 'motion-trail',
  smoke: 'motion-trail',
  vortex: 'motion-trail',
  'mirror-split': 'frame-distortion',
  'scanline-slice': 'frame-distortion',
  'light-tunnel': 'frame-distortion',
  'prism-burst': 'frame-distortion',
  'orbit-echo': 'frame-distortion',
};

export function effectTypeForPreset(id: PresetId): EffectTypeId {
  return PRESET_EFFECT_TYPES[id];
}

export function getEffectType(id: EffectTypeId): EffectType {
  const effectType = EFFECT_TYPES.find((item) => item.id === id);
  if (!effectType) throw new Error(`Unknown effect type: ${id}`);
  return effectType;
}
