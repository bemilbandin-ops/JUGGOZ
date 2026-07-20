import { extractMotion, lightThreshold, motionThreshold, PRESETS, presetsForEffectType, trailFade, trailTransform } from './effects';
import { EFFECT_TYPES, getEffectType } from './effectTypes';

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

assert(trailFade(100) < trailFade(0), 'longer trails must fade more slowly');
assert(motionThreshold(100) < motionThreshold(0), 'higher sensitivity must detect subtler motion');
assert(lightThreshold(100) > lightThreshold(20), 'higher isolation must reject dimmer pixels');
assert(lightThreshold(0) === 0, 'zero isolation must disable the brightness gate');

const preset = (id: string) => PRESETS.find((item) => item.id === id)!;
const extreme = trailTransform({ ...preset('neon').defaults, expansion: 100, spin: 100, driftX: 100, driftY: -100 });
assert(extreme.zoom >= 1.035, 'maximum expansion must be visually strong');
assert(extreme.rotation >= 0.03, 'maximum spin must be visually strong');
assert(extreme.dx >= 3 && extreme.dy <= -3, 'maximum drift must move several pixels per frame');
assert(preset('neon').defaults.expansion > 0 && preset('neon').defaults.cycle > 40, 'neon must expand and cycle color');
assert(preset('ghost').defaults.echo >= 100, 'ghost must use separated snapshots');
assert(preset('smoke').defaults.blur >= 6 && preset('smoke').defaults.driftY < -40, 'smoke must be diffuse and rise');
assert(preset('vortex').defaults.expansion < 0 && preset('vortex').defaults.spin > 40, 'vortex must contract and spin');

const effectTypeIds = new Set(EFFECT_TYPES.map((item) => item.id));
assert(effectTypeIds.size === EFFECT_TYPES.length, 'effect type IDs must be unique');
assert(PRESETS.every((item) => effectTypeIds.has(item.effectTypeId)), 'every preset must reference a registered effect type');
assert(EFFECT_TYPES.every((item) => presetsForEffectType(item.id).length > 0), 'every effect type must expose at least one preset');
assert(PRESETS.every((item) => getEffectType(item.effectTypeId).createRenderer === getEffectType('motion-trails').createRenderer), 'current looks must share the motion-trail renderer instead of duplicating effect code');
assert(new Set(PRESETS.map((item) => item.effectTypeId)).size === 1, 'Neon, Ghost, Smoke, and Vortex are presets, not separate effect types');

const image = (values: number[]) => ({ data: new Uint8ClampedArray(values), width: 2, height: 1, colorSpace: 'srgb' }) as ImageData;
const current = image([70, 70, 70, 255, 250, 240, 230, 255]);
const output = image([0, 0, 0, 0, 0, 0, 0, 0]);
extractMotion(current, new Float32Array(8), output, 20, 200);
assert(output.data[3] === 0, 'dim moving subjects must be excluded');
assert(output.data[7] > 0, 'bright moving props must remain in the mask');
console.log('effect type, preset, parameter, and isolation checks passed');
