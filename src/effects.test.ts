import { BLEND_MODES, effectLayerFilter, extractMotion, lightThreshold, motionThreshold, PRESETS, trailFade, trailTransform } from './effects';
import { CLUB_EFFECTS, createTrack, DEFAULT_POI_CONTROLS, PATTERN_CONTROL_DEFAULTS, unwrapShaftAngle, updateTrackPose } from './pixelPoi';
import { DEFAULT_PATTERN_ID, PATTERN_PRESETS } from './pixelPoiPatterns';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

assert(trailFade(100) < trailFade(0), 'longer legacy trails must fade more slowly');
assert(motionThreshold(100) < motionThreshold(0), 'higher sensitivity must detect subtler motion');
assert(lightThreshold(100) > lightThreshold(20), 'higher isolation must reject dimmer pixels');
assert(lightThreshold(0) === 0, 'zero isolation must disable the brightness gate');
assert(effectLayerFilter(false) === 'none' && effectLayerFilter(true, 'blur(4px)') === 'invert(1) blur(4px)', 'effect filters must compose inversion with glow');
assert(BLEND_MODES.map(({ value }) => value).join('|') === 'source-over|screen|lighter|color-dodge', 'compositing must expose the four supported blend modes');

const preset = (id: string) => PRESETS.find((item) => item.id === id)!;
const extreme = trailTransform({ ...preset('neon').defaults, expansion: 100, spin: 100, driftX: 100, driftY: -100 });
assert(extreme.zoom >= 1.035 && extreme.rotation >= 0.03, 'legacy transforms must remain intact');
assert(preset('ghost').defaults.echo >= 100 && preset('smoke').defaults.blur >= 6, 'unrelated legacy presets must remain intact');

const expectedGeometric = ['Neon Rails', 'Prism Ribbon', 'Chromatic Echoes', 'Electric Comets', 'Kinetic Lattice', 'Psychedelic Serpent', 'Apex Shatter', 'Pixel Mosaic', 'Radial POV'];
const expectedPsychedelic = ['Crystalline Constellation', 'Vector Swarm', 'Volumetric Fan Rays', 'Lava Plasma', 'Atomic Shell', 'Digital Glitch'];
assert(PATTERN_PRESETS.filter(({ category }) => category === 'geometric').map(({ name }) => name).join('|') === expectedGeometric.join('|'), 'geometric category must preserve the original nine patterns');
assert(PATTERN_PRESETS.filter(({ category }) => category === 'psychedelic').map(({ name }) => name).join('|') === expectedPsychedelic.join('|'), 'psychedelic category must contain the six new patterns');
assert(PRESETS[0].id === DEFAULT_PATTERN_ID && DEFAULT_PATTERN_ID === 'neon-rails', 'Neon Rails must be the default');
assert(new Set(PATTERN_PRESETS.map(({ geometry }) => geometry)).size === PATTERN_PRESETS.length, 'every club preset must declare a distinct topology');
assert(Object.keys(CLUB_EFFECTS).length === PATTERN_PRESETS.length, 'every club preset must own a renderer');
assert(Object.keys(PATTERN_CONTROL_DEFAULTS).length === PATTERN_PRESETS.length, 'every club preset must have a visible default profile');
assert(new Set(Object.values(PATTERN_CONTROL_DEFAULTS).map((controls) => JSON.stringify(controls))).size === PATTERN_PRESETS.length, 'each club preset must have independently tuned defaults');
assert(PATTERN_CONTROL_DEFAULTS['electric-comets'].lifetime < PATTERN_CONTROL_DEFAULTS['neon-rails'].lifetime, 'comets must fade faster than rails');
assert(PATTERN_CONTROL_DEFAULTS['psychedelic-serpent'].waveAmplitude < DEFAULT_POI_CONTROLS.waveAmplitude, 'serpent defaults must restrain overlap');
assert(PATTERN_CONTROL_DEFAULTS['prism-ribbon'].glow < PATTERN_CONTROL_DEFAULTS['neon-rails'].glow, 'translucent ribbons must bloom less than rails');

const radians = (degrees: number) => degrees * Math.PI / 180;
assert(Math.abs(unwrapShaftAngle(radians(89), radians(-89)) - radians(91)) < 0.001, 'shaft angle must unwrap across its 180-degree boundary');

const track = createTrack(1, { x: 0, y: 100, angle: 0, length: 70, confidence: 1 }, 0);
updateTrackPose(track, { x: 10, y: 96, angle: radians(8), length: 72, confidence: 1 }, 40, DEFAULT_POI_CONTROLS);
updateTrackPose(track, { x: 28, y: 84, angle: radians(22), length: 73, confidence: 1 }, 80, DEFAULT_POI_CONTROLS);
updateTrackPose(track, { x: 52, y: 66, angle: radians(48), length: 74, confidence: 1 }, 160, DEFAULT_POI_CONTROLS);
updateTrackPose(track, { x: 80, y: 54, angle: radians(75), length: 75, confidence: 1 }, 240, DEFAULT_POI_CONTROLS);
assert(track.state === 'released' || track.state === 'airborne', 'sustained translated motion must release a held club');
assert(track.history.length > 3, 'airborne paths must be spatially resampled');
for (let index = 1; index < track.history.length; index++) {
  if (track.history[index].segment === track.history[index - 1].segment) {
    assert(Math.hypot(track.history[index].center.x - track.history[index - 1].center.x, track.history[index].center.y - track.history[index - 1].center.y) <= 3.01, 'path samples must remain 2–4 screen pixels apart');
  }
}
const lastPose = track.history.at(-1)!;
assert(Math.abs(Math.hypot(lastPose.second.x - lastPose.first.x, lastPose.second.y - lastPose.first.y) - lastPose.length) < 0.001, 'each pose must expose both shaft endpoints');

const historyBeforeJump = track.history.length;
assert(updateTrackPose(track, { x: 500, y: 500, angle: 0, length: 20, confidence: 1 }, 260, DEFAULT_POI_CONTROLS) === false, 'implausible tracking jumps must be rejected');
assert(track.history.length === historyBeforeJump, 'rejected jumps must not bridge effect geometry');

track.state = 'lost';
track.resumeState = 'airborne';
const segmentBeforeResume = track.segment;
updateTrackPose(track, { x: track.center.x + 4, y: track.center.y + 2, angle: track.angle, length: track.length, confidence: 1 }, 280, DEFAULT_POI_CONTROLS);
assert(track.segment === segmentBeforeResume + 1, 'reacquired tracking must start a new segment');

const apex = createTrack(2, { x: 100, y: 100, angle: 0.4, length: 70, confidence: 1 }, 0);
apex.state = apex.resumeState = 'airborne';
apex.stateAt = 0;
apex.rising = true;
apex.velocity.y = -0.05;
updateTrackPose(apex, { x: 104, y: 150, angle: 0.6, length: 70, confidence: 1 }, 220, { ...DEFAULT_POI_CONTROLS, smoothing: 40 }, 'apex-shatter');
assert(String(apex.state) === 'apex' && apex.shards.length >= 8, 'a rising-to-falling transition must emit one apex burst');
const shardCount = apex.shards.length;
updateTrackPose(apex, { x: 108, y: 160, angle: 0.7, length: 70, confidence: 1 }, 260, { ...DEFAULT_POI_CONTROLS, smoothing: 40 }, 'apex-shatter');
assert(apex.shards.length === shardCount, 'Apex Shatter must emit only once per throw');

const image = (values: number[]) => ({ data: new Uint8ClampedArray(values), width: 2, height: 1, colorSpace: 'srgb' }) as ImageData;
const current = image([70, 70, 70, 255, 250, 240, 230, 255]);
const output = image([0, 0, 0, 0, 0, 0, 0, 0]);
extractMotion(current, new Float32Array(8), output, 20, 200);
assert(output.data[3] === 0 && output.data[7] > 0, 'brightness isolation must preserve bright moving clubs and reject dim subjects');

console.log('club geometry, state, resampling, and isolation checks passed');
