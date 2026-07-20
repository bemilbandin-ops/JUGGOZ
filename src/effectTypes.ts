import type { EffectRenderer, EffectTypeId } from './effectModel';
import { createMotionTrailsRenderer } from './renderers/motionTrails';

export type EffectType = {
  id: EffectTypeId;
  name: string;
  description: string;
  createRenderer: () => EffectRenderer;
};

export const EFFECT_TYPES: EffectType[] = [
  {
    id: 'motion-trails',
    name: 'Motion trails',
    description: 'One reusable drawing system for Neon, Ghost, Smoke, Vortex, and future trail-based looks.',
    createRenderer: createMotionTrailsRenderer,
  },
];

export function getEffectType(id: EffectTypeId): EffectType {
  const effectType = EFFECT_TYPES.find((item) => item.id === id);
  if (!effectType) throw new Error(`Unknown effect type: ${id}`);
  return effectType;
}

export function createEffectRenderer(id: EffectTypeId): EffectRenderer {
  return getEffectType(id).createRenderer();
}
