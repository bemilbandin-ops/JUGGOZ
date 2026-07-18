import { DEFAULT_PATTERN_ID, type PatternId } from './pixelPoiPatterns';

export type Point = { x: number; y: number };
export type Detection = Point & { angle: number; confidence: number; length?: number };
export type PoiState = 'held' | 'released' | 'airborne' | 'apex' | 'caught' | 'lost';
export type PoiPose = {
  center: Point;
  first: Point;
  second: Point;
  angle: number;
  length: number;
  velocity: Point;
  speed: number;
  angularVelocity: number;
  timestamp: number;
  confidence: number;
  state: PoiState;
  segment: number;
  travel: number;
};

type Particle = { origin: Point; velocity: Point; born: number; seed: number; branches: number };
type Shard = { origin: Point; angle: number; speed: number; spin: number; size: number; born: number };

export type PoiControls = {
  lifetime: number;
  brightness: number;
  glow: number;
  smoothing: number;
  lostReset: number;
  railSeparation: number;
  crossbarFrequency: number;
  ribbonWidth: number;
  cellDensity: number;
  echoCount: number;
  echoSpacing: number;
  branching: number;
  turbulence: number;
  latticeDensity: number;
  strandCount: number;
  waveAmplitude: number;
  shardCount: number;
  shardSpread: number;
  tileSpacing: number;
  shapeMix: number;
  radialSymmetry: number;
};

export type PoiTrack = {
  id: number;
  center: Point;
  velocity: Point;
  angle: number;
  length: number;
  angularVelocity: number;
  confidence: number;
  lastSeen: number;
  state: PoiState;
  resumeState: Exclude<PoiState, 'lost'>;
  stateAt: number;
  pendingState: PoiState | null;
  pendingAt: number;
  segment: number;
  travel: number;
  history: PoiPose[];
  particles: Particle[];
  shards: Shard[];
  rising: boolean;
  apexFired: boolean;
  effectId: PatternId;
};

export const DEFAULT_POI_CONTROLS: PoiControls = {
  lifetime: 1800,
  brightness: 90,
  glow: 38,
  smoothing: 72,
  lostReset: 650,
  railSeparation: 100,
  crossbarFrequency: 28,
  ribbonWidth: 100,
  cellDensity: 22,
  echoCount: 9,
  echoSpacing: 24,
  branching: 58,
  turbulence: 42,
  latticeDensity: 24,
  strandCount: 4,
  waveAmplitude: 16,
  shardCount: 12,
  shardSpread: 72,
  tileSpacing: 24,
  shapeMix: 75,
  radialSymmetry: 8,
};

const tuned = (values: Partial<PoiControls>): PoiControls => ({ ...DEFAULT_POI_CONTROLS, ...values });

export const PATTERN_CONTROL_DEFAULTS: Record<PatternId, PoiControls> = {
  'neon-rails': tuned({ lifetime: 1900, brightness: 92, glow: 42, smoothing: 72, railSeparation: 105, crossbarFrequency: 26 }),
  'prism-ribbon': tuned({ lifetime: 1550, brightness: 78, glow: 28, smoothing: 76, ribbonWidth: 112, cellDensity: 19 }),
  'chromatic-echoes': tuned({ lifetime: 1400, brightness: 86, glow: 22, smoothing: 68, echoCount: 8, echoSpacing: 25 }),
  'electric-comets': tuned({ lifetime: 1150, brightness: 76, glow: 48, smoothing: 66, branching: 46, turbulence: 34 }),
  'kinetic-lattice': tuned({ lifetime: 1650, brightness: 82, glow: 26, smoothing: 74, latticeDensity: 23 }),
  'psychedelic-serpent': tuned({ lifetime: 1450, brightness: 78, glow: 30, smoothing: 78, strandCount: 4, waveAmplitude: 13 }),
  'apex-shatter': tuned({ lifetime: 1250, brightness: 90, glow: 25, smoothing: 62, shardCount: 12, shardSpread: 68 }),
  'pixel-mosaic': tuned({ lifetime: 1500, brightness: 86, glow: 20, smoothing: 70, tileSpacing: 23, shapeMix: 72 }),
  'radial-pov': tuned({ lifetime: 1300, brightness: 80, glow: 36, smoothing: 70, radialSymmetry: 8 }),
  'acid-blooms': tuned({ lifetime: 2100, brightness: 94, glow: 52, smoothing: 74, radialSymmetry: 7, tileSpacing: 38 }),
  'liquid-portal': tuned({ lifetime: 1900, brightness: 88, glow: 48, smoothing: 80, echoSpacing: 34, waveAmplitude: 22 }),
  'kaleido-tunnel': tuned({ lifetime: 1800, brightness: 96, glow: 42, smoothing: 72, radialSymmetry: 9, latticeDensity: 32 }),
  'melting-rainbow': tuned({ lifetime: 2300, brightness: 92, glow: 38, smoothing: 82, strandCount: 5, waveAmplitude: 26 }),
  'hypno-eyes': tuned({ lifetime: 2000, brightness: 90, glow: 46, smoothing: 76, echoSpacing: 42, shapeMix: 82 }),
  'cosmic-spores': tuned({ lifetime: 2400, brightness: 86, glow: 58, smoothing: 78, tileSpacing: 30, branching: 72, waveAmplitude: 20 }),
};

const TAU = Math.PI * 2;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
const seeded = (value: number) => {
  const result = Math.sin(value * 12.9898) * 43758.5453;
  return result - Math.floor(result);
};

export function unwrapShaftAngle(previous: number, measured: number) {
  return previous + Math.atan2(Math.sin(2 * (measured - previous)), Math.cos(2 * (measured - previous))) / 2;
}

function endpoints(center: Point, angle: number, length: number) {
  const half = length / 2;
  const offset = { x: Math.cos(angle) * half, y: Math.sin(angle) * half };
  return { first: { x: center.x - offset.x, y: center.y - offset.y }, second: { x: center.x + offset.x, y: center.y + offset.y } };
}

function pose(track: PoiTrack, timestamp: number, state = track.state): PoiPose {
  const ends = endpoints(track.center, track.angle, track.length);
  return {
    center: { ...track.center }, ...ends, angle: track.angle, length: track.length,
    velocity: { ...track.velocity }, speed: Math.hypot(track.velocity.x, track.velocity.y),
    angularVelocity: track.angularVelocity, timestamp, confidence: track.confidence,
    state, segment: track.segment, travel: track.travel,
  };
}

export function createTrack(id: number, detection: Detection, now: number): PoiTrack {
  return {
    id,
    center: { x: detection.x, y: detection.y },
    velocity: { x: 0, y: 0 },
    angle: detection.angle,
    length: clamp(detection.length ?? 72, 24, 150),
    angularVelocity: 0,
    confidence: detection.confidence,
    lastSeen: now,
    state: 'held',
    resumeState: 'held',
    stateAt: now,
    pendingState: null,
    pendingAt: now,
    segment: 0,
    travel: 0,
    history: [],
    particles: [],
    shards: [],
    rising: false,
    apexFired: false,
    effectId: DEFAULT_PATTERN_ID,
  };
}

function enterState(track: PoiTrack, state: Exclude<PoiState, 'lost'>, now: number) {
  track.state = track.resumeState = state;
  track.stateAt = now;
  track.pendingState = null;
}

function heldLongEnough(track: PoiTrack, candidate: PoiState, now: number, duration: number) {
  if (track.pendingState !== candidate) {
    track.pendingState = candidate;
    track.pendingAt = now;
    return false;
  }
  return now - track.pendingAt >= duration;
}

function updateFlightState(track: PoiTrack, previousVy: number, now: number) {
  const speed = Math.hypot(track.velocity.x, track.velocity.y);
  const moving = speed > 0.035;
  const quiet = speed < 0.014 && Math.abs(track.angularVelocity) < 0.00045;

  if (track.state === 'released' && now - track.stateAt >= 90) enterState(track, 'airborne', now);
  if (track.state === 'apex' && now - track.stateAt >= 120) enterState(track, 'airborne', now);

  if (track.state === 'held' || track.state === 'caught') {
    if (moving && track.confidence > 0.18 && heldLongEnough(track, 'released', now, 65)) {
      track.segment += 1;
      track.apexFired = false;
      track.rising = track.velocity.y < -0.012;
      enterState(track, 'released', now);
    } else if (!moving) track.pendingState = null;
    if (track.state === 'caught' && !moving && now - track.stateAt > 480) enterState(track, 'held', now);
    return;
  }

  if (track.velocity.y < -0.016) track.rising = true;
  if (!track.apexFired && track.rising && previousVy < 0.002 && track.velocity.y > 0.004 && now - track.stateAt > 140) {
    track.apexFired = true;
    enterState(track, 'apex', now);
    return;
  }

  if (quiet && now - track.stateAt > 180) {
    if (heldLongEnough(track, 'caught', now, 130)) enterState(track, 'caught', now);
  } else if (track.pendingState === 'caught') track.pendingState = null;
}

function appendSpatialPoses(track: PoiTrack, now: number) {
  if (!['released', 'airborne', 'apex'].includes(track.state) || track.confidence < 0.18) return [];
  const current = pose(track, now);
  const previous = [...track.history].reverse().find((item) => item.segment === track.segment);
  if (!previous) {
    track.history.push(current);
    return [current];
  }
  const span = distance(previous.center, current.center);
  if (span < 2.8) return [];
  const added: PoiPose[] = [];
  const steps = Math.floor(span / 3);
  for (let index = 1; index <= steps; index++) {
    const t = index * 3 / span;
    track.travel += 3;
    const center = { x: mix(previous.center.x, current.center.x, t), y: mix(previous.center.y, current.center.y, t) };
    const angle = mix(previous.angle, current.angle, t);
    const length = mix(previous.length, current.length, t);
    const ends = endpoints(center, angle, length);
    added.push({
      center, ...ends, angle, length,
      velocity: { x: mix(previous.velocity.x, current.velocity.x, t), y: mix(previous.velocity.y, current.velocity.y, t) },
      speed: mix(previous.speed, current.speed, t), angularVelocity: mix(previous.angularVelocity, current.angularVelocity, t),
      timestamp: mix(previous.timestamp, current.timestamp, t), confidence: mix(previous.confidence, current.confidence, t),
      state: track.state, segment: track.segment, travel: track.travel,
    });
  }
  track.history.push(...added);
  return added;
}

export function updateTrackPose(track: PoiTrack, next: Detection, now: number, controls: PoiControls, effectId: PatternId = DEFAULT_PATTERN_ID) {
  const elapsed = clamp(now - track.lastSeen, 1, 80);
  const measuredLength = clamp(next.length ?? track.length, 24, 150);
  const jump = distance(track.center, next);
  const measuredAngle = unwrapShaftAngle(track.angle, next.angle);
  if (jump > Math.max(72, track.length * 2.7) || measuredLength / track.length > 1.85 || track.length / measuredLength > 1.85 || Math.abs(measuredAngle - track.angle) > Math.PI * 0.48) return false;

  const wasLost = track.state === 'lost';
  if (wasLost) {
    track.state = track.resumeState;
    track.segment += 1;
  }
  if (track.effectId !== effectId) {
    CLUB_EFFECTS[track.effectId].reset(track);
    track.effectId = effectId;
  }

  const previousCenter = { ...track.center };
  const previousAngle = track.angle;
  const previousVy = track.velocity.y;
  const rate = clamp((100 - controls.smoothing) / 100, 0.16, 0.55);
  track.center = { x: mix(track.center.x, next.x, rate), y: mix(track.center.y, next.y, rate) };
  track.angle = mix(track.angle, measuredAngle, Math.max(0.22, rate));
  track.length = mix(track.length, measuredLength, Math.max(0.18, rate * 0.8));
  const instantVelocity = { x: (track.center.x - previousCenter.x) / elapsed, y: (track.center.y - previousCenter.y) / elapsed };
  track.velocity = { x: mix(track.velocity.x, instantVelocity.x, 0.42), y: mix(track.velocity.y, instantVelocity.y, 0.42) };
  track.angularVelocity = mix(track.angularVelocity, (track.angle - previousAngle) / elapsed, 0.46);
  track.confidence = mix(track.confidence, next.confidence, 0.42);
  track.lastSeen = now;
  updateFlightState(track, previousVy, now);
  const added = appendSpatialPoses(track, now);
  CLUB_EFFECTS[effectId].update(track, added, now, controls);
  track.history = track.history.filter((item) => now - item.timestamp < controls.lifetime + 450).slice(-900);
  track.particles = track.particles.filter((item) => now - item.born < controls.lifetime).slice(-160);
  track.shards = track.shards.filter((item) => now - item.born < Math.min(1300, controls.lifetime)).slice(-32);
  return true;
}

export function detectClubs(mask: ImageData, stride = 3): Detection[] {
  const width = Math.ceil(mask.width / stride), height = Math.ceil(mask.height / stride);
  const active = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) active[y * width + x] = mask.data[((y * stride * mask.width) + x * stride) * 4 + 3] > 36 ? 1 : 0;

  const detections: Detection[] = [], queue: number[] = [];
  for (let start = 0; start < active.length; start++) {
    if (!active[start]) continue;
    active[start] = 0; queue.length = 0; queue.push(start);
    let count = 0, sumX = 0, sumY = 0, sumXX = 0, sumYY = 0, sumXY = 0;
    for (let head = 0; head < queue.length; head++) {
      const index = queue[head], x = index % width, y = Math.floor(index / width);
      count++; sumX += x; sumY += y; sumXX += x * x; sumYY += y * y; sumXY += x * y;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const nx = x + ox, ny = y + oy, neighbor = ny * width + nx;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && active[neighbor]) { active[neighbor] = 0; queue.push(neighbor); }
      }
    }
    if (count < 3) continue;
    const meanX = sumX / count, meanY = sumY / count;
    const varianceX = Math.max(0, sumXX / count - meanX * meanX), varianceY = Math.max(0, sumYY / count - meanY * meanY);
    const covariance = sumXY / count - meanX * meanY;
    const trace = varianceX + varianceY;
    const majorVariance = trace / 2 + Math.sqrt(Math.max(0, (varianceX - varianceY) ** 2 / 4 + covariance ** 2));
    const elongation = Math.abs(varianceX - varianceY) / Math.max(1, trace);
    detections.push({
      x: meanX * stride, y: meanY * stride,
      angle: 0.5 * Math.atan2(2 * covariance, varianceX - varianceY),
      length: clamp(Math.sqrt(majorVariance) * stride * 3.2, 24, 150),
      confidence: clamp(count / 18 * (0.65 + elongation), 0, 1),
    });
  }
  return detections.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

export function updateTracks(tracks: PoiTrack[], detections: Detection[], now: number, controls: PoiControls, effectId: PatternId, nextId: () => number) {
  const available = new Set(detections.map((_, index) => index));
  for (const track of tracks) {
    let best = -1, bestDistance = Math.max(52, track.length * 1.15);
    if (now - track.lastSeen < controls.lostReset) for (const index of available) {
      const elapsed = Math.min(80, now - track.lastSeen);
      const predicted = { x: track.center.x + track.velocity.x * elapsed, y: track.center.y + track.velocity.y * elapsed };
      const candidateDistance = distance(predicted, detections[index]);
      if (candidateDistance < bestDistance) { best = index; bestDistance = candidateDistance; }
    }
    if (best >= 0 && updateTrackPose(track, detections[best], now, controls, effectId)) available.delete(best);
    else if (track.state !== 'lost') {
      track.resumeState = track.state;
      track.state = 'lost';
      track.stateAt = now;
      track.pendingState = null;
    }
    track.history = track.history.filter((item) => now - item.timestamp < controls.lifetime + 450);
    track.particles = track.particles.filter((item) => now - item.born < controls.lifetime);
    track.shards = track.shards.filter((item) => now - item.born < Math.min(1300, controls.lifetime));
  }
  for (const index of available) {
    const track = createTrack(nextId(), detections[index], now);
    track.effectId = effectId;
    tracks.push(track);
  }
  return tracks.filter((track) => now - track.lastSeen < controls.lostReset || track.history.length || track.particles.length || track.shards.length);
}

type EffectRenderer = {
  update: (track: PoiTrack, added: PoiPose[], now: number, controls: PoiControls) => void;
  render: (ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls, image: ImageData | null) => void;
  reset: (track: PoiTrack) => void;
};

const noUpdate: EffectRenderer['update'] = () => undefined;
const resetTransient: EffectRenderer['reset'] = (track) => { track.particles = []; track.shards = []; };

function trackFade(track: PoiTrack, now: number, controls: PoiControls) {
  if (track.state === 'lost') return clamp(1 - (now - track.lastSeen) / Math.min(420, controls.lostReset), 0, 1);
  if (track.state === 'caught' || track.state === 'held') return clamp(1 - (now - track.stateAt) / 520, 0, 1);
  return 1;
}

function poseFade(item: PoiPose, track: PoiTrack, now: number, controls: PoiControls) {
  return clamp(1 - (now - item.timestamp) / controls.lifetime, 0, 1) * trackFade(track, now, controls) * controls.brightness / 100;
}

const hues = [188, 322, 274, 102, 25];
function color(track: PoiTrack, index: number, alpha = 1, lightness = 62) {
  return `hsl(${(hues[index % hues.length] + (track.id % 3 - 1) * 7 + 360) % 360} 100% ${lightness}% / ${clamp(alpha, 0, 0.82)})`;
}

function drawSegment(ctx: CanvasRenderingContext2D, from: Point, to: Point, stroke: string, width: number) {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

function eachPair(track: PoiTrack, now: number, controls: PoiControls, visit: (a: PoiPose, b: PoiPose, index: number) => void) {
  const visible = track.history.filter((item) => now - item.timestamp < controls.lifetime);
  for (let index = 1; index < visible.length; index++) if (visible[index - 1].segment === visible[index].segment) visit(visible[index - 1], visible[index], index);
}

function spacedPoses(track: PoiTrack, now: number, controls: PoiControls, spacing: number, count = Infinity) {
  const visible = track.history.filter((item) => now - item.timestamp < controls.lifetime);
  const result: PoiPose[] = [];
  let lastTravel = Infinity, segment = -1;
  for (let index = visible.length - 1; index >= 0 && result.length < count; index--) {
    const item = visible[index];
    if (item.segment !== segment) { segment = item.segment; lastTravel = Infinity; }
    if (lastTravel - item.travel >= spacing || lastTravel === Infinity) { result.push(item); lastTravel = item.travel; }
  }
  return result;
}

function renderRails(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls) {
  eachPair(track, now, controls, (a, b) => {
    const alpha = poseFade(b, track, now, controls);
    const separation = controls.railSeparation / 100;
    const aEnds = endpoints(a.center, a.angle, a.length * separation);
    const bEnds = endpoints(b.center, b.angle, b.length * separation);
    drawSegment(ctx, aEnds.first, bEnds.first, color(track, 0, alpha), 3.2);
    drawSegment(ctx, aEnds.second, bEnds.second, color(track, 1, alpha), 3.2);
    drawSegment(ctx, aEnds.first, bEnds.first, `rgb(255 255 255 / ${alpha * 0.72})`, 0.8);
    drawSegment(ctx, aEnds.second, bEnds.second, `rgb(255 255 255 / ${alpha * 0.72})`, 0.8);
    if (Math.floor(a.travel / controls.crossbarFrequency) !== Math.floor(b.travel / controls.crossbarFrequency)) drawSegment(ctx, bEnds.first, bEnds.second, `rgb(220 250 255 / ${alpha * 0.58})`, 0.75);
  });
}

function renderRibbon(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls) {
  const visible = track.history.filter((item) => now - item.timestamp < controls.lifetime);
  for (let index = 1; index < visible.length; index++) {
    const a = visible[index - 1], b = visible[index];
    if (a.segment !== b.segment || seeded(track.id * 71 + Math.floor(b.travel / controls.cellDensity)) < 0.14) continue;
    const tangent = Math.atan2(b.center.y - a.center.y, b.center.x - a.center.x);
    const normal = { x: -Math.sin(tangent), y: Math.cos(tangent) };
    const taper = clamp(Math.min(index / 4, (visible.length - index) / 4), 0.18, 1);
    const halfA = a.length * 0.27 * controls.ribbonWidth / 100 * taper;
    const halfB = b.length * 0.27 * controls.ribbonWidth / 100 * taper;
    const points = [
      { x: a.center.x + normal.x * halfA, y: a.center.y + normal.y * halfA },
      { x: b.center.x + normal.x * halfB, y: b.center.y + normal.y * halfB },
      { x: b.center.x - normal.x * halfB, y: b.center.y - normal.y * halfB },
      { x: a.center.x - normal.x * halfA, y: a.center.y - normal.y * halfA },
    ];
    const alpha = poseFade(b, track, now, controls);
    ctx.fillStyle = color(track, index, alpha * 0.12, 54);
    ctx.strokeStyle = color(track, index + 1, alpha * 0.7);
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let p = 1; p < points.length; p++) ctx.lineTo(points[p].x, points[p].y);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    const diagonal = Math.sin(b.angle * 2) > 0 ? [points[0], points[2]] : [points[1], points[3]];
    drawSegment(ctx, diagonal[0], diagonal[1], color(track, index + 3, alpha * 0.55), 0.7);
  }
}

function renderEchoes(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls) {
  spacedPoses(track, now, controls, controls.echoSpacing, Math.round(controls.echoCount)).forEach((item, index) => {
    const alpha = poseFade(item, track, now, controls) * (1 - index / (controls.echoCount + 2));
    const scale = 1 - index * 0.018;
    const ends = endpoints(item.center, item.angle, item.length * scale);
    ctx.lineCap = 'round';
    drawSegment(ctx, ends.first, ends.second, color(track, index, alpha * 0.18), 7 * scale);
    drawSegment(ctx, ends.first, ends.second, color(track, index, alpha * 0.8), 1.35);
    ctx.lineCap = 'butt';
  });
}

function emitComets(track: PoiTrack, added: PoiPose[], now: number, controls: PoiControls) {
  for (const item of added) {
    if (Math.floor(item.travel / 12) === Math.floor((item.travel - 3) / 12)) continue;
    const branchCount = 1 + Math.round(Math.abs(item.angularVelocity) * 500 * controls.branching / 100);
    for (const [end, offset] of [[item.first, 0], [item.second, 1]] as const) track.particles.push({
      origin: { ...end }, velocity: { ...item.velocity }, born: now,
      seed: track.id * 1009 + item.travel * 7 + offset * 97,
      branches: clamp(branchCount, 1, 3),
    });
  }
}

function renderComets(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls) {
  for (const particle of track.particles) {
    const age = now - particle.born;
    const alpha = clamp(1 - age / controls.lifetime, 0, 1) * trackFade(track, now, controls) * controls.brightness / 100;
    const speed = Math.hypot(particle.velocity.x, particle.velocity.y);
    const turbulence = controls.turbulence / 100 * clamp(1.3 - speed * 1.4, 0.22, 1.2);
    for (let branch = 0; branch < particle.branches; branch++) {
      let previous = particle.origin;
      const branchAngle = (branch - (particle.branches - 1) / 2) * 0.32;
      for (let step = 1; step <= 4; step++) {
        const t = age * step / 4;
        const curl = Math.sin(particle.seed * 0.07 + step * 1.9 + age * 0.006) * 12 * turbulence;
        const next = {
          x: particle.origin.x + particle.velocity.x * t * 0.42 + Math.cos(branchAngle + step) * curl,
          y: particle.origin.y + particle.velocity.y * t * 0.42 + Math.sin(branchAngle + step) * curl,
        };
        drawSegment(ctx, previous, next, color(track, 0, alpha * 0.2), 1.45);
        drawSegment(ctx, previous, next, `rgb(245 253 255 / ${alpha * 0.48})`, 0.5);
        previous = next;
      }
    }
  }
}

function renderLattice(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls) {
  const samples = spacedPoses(track, now, controls, controls.latticeDensity).reverse();
  for (let index = 1; index < samples.length; index++) {
    const a = samples[index - 1], b = samples[index];
    if (a.segment !== b.segment || distance(a.center, b.center) > controls.latticeDensity * 2.2) continue;
    const alpha = poseFade(b, track, now, controls);
    const vertices = index % 2 ? [a.first, b.second, b.first] : [a.second, b.first, b.second, a.first];
    ctx.fillStyle = color(track, index + 2, alpha * 0.055);
    ctx.strokeStyle = color(track, index, alpha * 0.7);
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let vertex = 1; vertex < vertices.length; vertex++) ctx.lineTo(vertices[vertex].x, vertices[vertex].y);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}

function renderSerpent(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls) {
  const strands = Math.round(controls.strandCount);
  for (let strand = 0; strand < strands; strand++) {
    eachPair(track, now, controls, (a, b) => {
      const tangent = Math.atan2(b.center.y - a.center.y, b.center.x - a.center.x);
      const normal = { x: -Math.sin(tangent), y: Math.cos(tangent) };
      const phase = strand / strands * TAU;
      const amplitude = controls.waveAmplitude * (0.55 + Math.min(1.4, Math.abs(b.angularVelocity) * 900));
      const offsetA = Math.sin(a.travel * 0.075 - now * 0.0012 + phase) * amplitude + (strand - (strands - 1) / 2) * 2.4;
      const offsetB = Math.sin(b.travel * 0.075 - now * 0.0012 + phase) * amplitude + (strand - (strands - 1) / 2) * 2.4;
      const alpha = poseFade(b, track, now, controls);
      drawSegment(ctx,
        { x: a.center.x + normal.x * offsetA, y: a.center.y + normal.y * offsetA },
        { x: b.center.x + normal.x * offsetB, y: b.center.y + normal.y * offsetB },
        color(track, strand, alpha * 0.72), strand === Math.floor(strands / 2) ? 2.1 : 1.2);
    });
  }
  for (const item of spacedPoses(track, now, controls, 62)) {
    const alpha = poseFade(item, track, now, controls);
    ctx.save(); ctx.translate(item.center.x, item.center.y); ctx.rotate(item.angle);
    ctx.strokeStyle = color(track, 4, alpha * 0.8); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, 0, 5.5, 2.8, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = `rgb(255 255 255 / ${alpha * 0.75})`; ctx.beginPath(); ctx.arc(0, 0, 1.1, 0, TAU); ctx.fill(); ctx.restore();
  }
}

function emitApex(track: PoiTrack, _added: PoiPose[], now: number, controls: PoiControls) {
  if (track.state !== 'apex' || track.shards.some((item) => Math.abs(item.born - track.stateAt) < 2)) return;
  const velocityAngle = Math.atan2(track.velocity.y, track.velocity.x);
  const count = Math.round(controls.shardCount);
  const spread = controls.shardSpread / 100 * Math.PI;
  for (let index = 0; index < count; index++) {
    const t = count === 1 ? 0.5 : index / (count - 1);
    track.shards.push({
      origin: { ...track.center },
      angle: track.angle + velocityAngle * 0.22 + mix(-spread, spread, t) + (seeded(track.id * 31 + index) - 0.5) * 0.18,
      speed: 0.018 + seeded(track.id * 53 + index) * 0.035,
      spin: (seeded(track.id * 79 + index) - 0.5) * 0.009,
      size: 5 + seeded(track.id * 101 + index) * 8,
      born: now,
    });
  }
}

function renderShatter(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls) {
  track.shards.forEach((shard, index) => {
    const age = now - shard.born;
    const alpha = clamp(1 - age / Math.min(1300, controls.lifetime), 0, 1) * controls.brightness / 100;
    const x = shard.origin.x + Math.cos(shard.angle) * shard.speed * age;
    const y = shard.origin.y + Math.sin(shard.angle) * shard.speed * age + age * age * 0.000006;
    ctx.save(); ctx.translate(x, y); ctx.rotate(shard.angle + shard.spin * age);
    ctx.strokeStyle = color(track, index, alpha * 0.78); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(shard.size, 0); ctx.lineTo(-shard.size * 0.45, shard.size * 0.28); ctx.lineTo(-shard.size * 0.15, -shard.size * 0.24); ctx.closePath(); ctx.stroke(); ctx.restore();
  });
}

function renderMosaic(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls) {
  spacedPoses(track, now, controls, controls.tileSpacing).forEach((item, index) => {
    const alpha = poseFade(item, track, now, controls);
    const speedScale = clamp(0.78 + item.speed * 0.7, 0.75, 1.35);
    const size = (4.5 + seeded(track.id * 19 + item.travel) * 3) * speedScale;
    const shape = Math.floor(seeded(track.id * 41 + item.travel * controls.shapeMix) * 4);
    const tangent = Math.atan2(item.velocity.y, item.velocity.x);
    ctx.save(); ctx.translate(item.center.x, item.center.y); ctx.rotate(Number.isFinite(tangent) ? tangent : item.angle);
    ctx.strokeStyle = color(track, index, alpha * 0.78); ctx.lineWidth = 1.1; ctx.beginPath();
    if (shape === 0) { ctx.moveTo(size, 0); ctx.lineTo(0, size); ctx.lineTo(-size, 0); ctx.lineTo(0, -size); ctx.closePath(); }
    else if (shape === 1) { ctx.moveTo(-size, -size * 0.65); ctx.lineTo(0, 0); ctx.lineTo(-size, size * 0.65); ctx.moveTo(0, -size * 0.65); ctx.lineTo(size, 0); ctx.lineTo(0, size * 0.65); }
    else if (shape === 2) for (let side = 0; side <= 6; side++) { const angle = side / 6 * TAU; const method = side ? 'lineTo' : 'moveTo'; ctx[method](Math.cos(angle) * size, Math.sin(angle) * size); }
    else ctx.rect(-size * 0.7, -size * 0.7, size * 1.4, size * 1.4);
    ctx.stroke();
    ctx.rotate(item.angle - tangent); drawSegment(ctx, { x: -size * 0.45, y: 0 }, { x: size * 0.45, y: 0 }, `rgb(255 255 255 / ${alpha * 0.5})`, 0.65); ctx.restore();
  });
}

function sampleImage(image: ImageData, u: number, v: number) {
  const x = clamp(Math.round(u * (image.width - 1)), 0, image.width - 1);
  const y = clamp(Math.round(v * (image.height - 1)), 0, image.height - 1);
  const offset = (y * image.width + x) * 4;
  return `rgb(${image.data[offset]} ${image.data[offset + 1]} ${image.data[offset + 2]} / ${image.data[offset + 3] / 255})`;
}

function renderRadial(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls, image: ImageData | null) {
  const latest = track.history.at(-1);
  if (!latest) return;
  const spokes = spacedPoses(track, now, controls, Math.max(3, 42 / controls.radialSymmetry), 80);
  for (const [index, item] of spokes.entries()) {
    const alpha = poseFade(item, track, now, controls) * 0.64;
    const ends = endpoints(latest.center, item.angle, item.length);
    const stroke = image ? sampleImage(image, index / Math.max(1, spokes.length - 1), (Math.sin(item.angle) + 1) / 2) : color(track, index, alpha);
    ctx.globalAlpha = alpha;
    drawSegment(ctx, ends.first, ends.second, stroke, 1.6);
  }
  ctx.globalAlpha = 1;
}

function acidColor(track: PoiTrack, item: PoiPose, now: number, offset = 0, alpha = 1, lightness = 60) {
  const hue = (item.travel * 2.4 + now * 0.09 + track.id * 47 + offset) % 360;
  return `hsl(${hue} 100% ${lightness}% / ${clamp(alpha, 0, 0.88)})`;
}

function renderBlooms(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls) {
  const petals = Math.round(controls.radialSymmetry);
  for (const item of spacedPoses(track, now, controls, controls.tileSpacing)) {
    const alpha = poseFade(item, track, now, controls);
    const pulse = 1 + Math.sin(now * 0.006 + item.travel * 0.08) * 0.22;
    const radius = clamp(item.length * 0.17 * pulse, 8, 22);
    ctx.save(); ctx.translate(item.center.x, item.center.y); ctx.rotate(item.angle + now * 0.0005);
    for (let petal = 0; petal < petals; petal++) {
      ctx.rotate(TAU / petals);
      ctx.fillStyle = acidColor(track, item, now, petal * 360 / petals, alpha * 0.22, 56);
      ctx.strokeStyle = acidColor(track, item, now, petal * 360 / petals + 35, alpha * 0.72, 68);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(radius * 0.72, 0, radius * 0.72, radius * 0.28, 0, 0, TAU); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = `rgb(255 255 210 / ${alpha * 0.78})`; ctx.beginPath(); ctx.arc(0, 0, radius * 0.18, 0, TAU); ctx.fill(); ctx.restore();
  }
}

function renderPortals(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls) {
  for (const item of spacedPoses(track, now, controls, controls.echoSpacing)) {
    const alpha = poseFade(item, track, now, controls);
    ctx.save(); ctx.translate(item.center.x, item.center.y); ctx.rotate(item.angle);
    for (let ring = 1; ring <= 4; ring++) {
      const wobble = Math.sin(now * 0.004 + item.travel * 0.1 + ring) * controls.waveAmplitude * 0.12;
      ctx.strokeStyle = acidColor(track, item, now, ring * 62, alpha * (0.82 - ring * 0.1), 66);
      ctx.lineWidth = ring === 1 ? 2.2 : 1.2;
      ctx.beginPath(); ctx.ellipse(wobble, 0, 4 + ring * 5.5 + wobble * 0.2, 2 + ring * 2.8, ring * 0.12, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }
}

function renderKaleido(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls) {
  const points = Math.round(controls.radialSymmetry);
  for (const item of spacedPoses(track, now, controls, controls.latticeDensity)) {
    const alpha = poseFade(item, track, now, controls);
    ctx.save(); ctx.translate(item.center.x, item.center.y); ctx.rotate(item.angle + now * 0.0008);
    for (let layer = 3; layer > 0; layer--) {
      const outer = 5 + layer * 4.8, inner = outer * (0.34 + layer * 0.06);
      ctx.strokeStyle = acidColor(track, item, now, layer * 88, alpha * (0.82 - layer * 0.12), 66);
      ctx.lineWidth = layer === 1 ? 1.8 : 1;
      ctx.beginPath();
      for (let point = 0; point <= points * 2; point++) {
        const angle = point / (points * 2) * TAU;
        const radius = point % 2 ? inner : outer;
        if (point) ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius); else ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      }
      ctx.stroke(); ctx.rotate(-now * 0.00035 * layer);
    }
    ctx.restore();
  }
}

function renderMeltingRainbow(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls) {
  const strands = Math.round(controls.strandCount);
  for (let strand = 0; strand < strands; strand++) eachPair(track, now, controls, (a, b) => {
    const tangent = Math.atan2(b.center.y - a.center.y, b.center.x - a.center.x);
    const normal = { x: -Math.sin(tangent), y: Math.cos(tangent) };
    const band = (strand - (strands - 1) / 2) * 4.5;
    const meltA = band + Math.sin(a.travel * 0.045 + now * 0.002 + strand) * controls.waveAmplitude * 0.45 + Math.max(0, now - a.timestamp) * 0.006;
    const meltB = band + Math.sin(b.travel * 0.045 + now * 0.002 + strand) * controls.waveAmplitude * 0.45 + Math.max(0, now - b.timestamp) * 0.006;
    const alpha = poseFade(b, track, now, controls);
    drawSegment(ctx, { x: a.center.x + normal.x * meltA, y: a.center.y + normal.y * meltA }, { x: b.center.x + normal.x * meltB, y: b.center.y + normal.y * meltB }, acidColor(track, b, now, strand * 66, alpha * 0.6, 62), 4.8);
  });
}

function renderEyes(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls) {
  for (const [index, item] of spacedPoses(track, now, controls, controls.echoSpacing).entries()) {
    const alpha = poseFade(item, track, now, controls);
    const blink = 0.35 + Math.abs(Math.sin(now * 0.003 + index * 1.7)) * 0.65;
    const size = 8 + controls.shapeMix * 0.07;
    ctx.save(); ctx.translate(item.center.x, item.center.y); ctx.rotate(item.angle + Math.PI / 2);
    ctx.fillStyle = acidColor(track, item, now, index * 55, alpha * 0.2, 58);
    ctx.strokeStyle = acidColor(track, item, now, index * 55 + 95, alpha * 0.82, 72); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(0, 0, size, size * 0.52 * blink, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgb(15 4 35 / ${alpha * 0.9})`; ctx.beginPath(); ctx.arc(Math.sin(now * 0.002 + index) * size * 0.24, 0, size * 0.23 * blink, 0, TAU); ctx.fill(); ctx.restore();
  }
}

function renderSpores(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls) {
  const satellites = 2 + Math.round(controls.branching / 24);
  for (const item of spacedPoses(track, now, controls, controls.tileSpacing)) {
    const alpha = poseFade(item, track, now, controls);
    const radius = 5 + controls.waveAmplitude * 0.28;
    ctx.strokeStyle = acidColor(track, item, now, 120, alpha * 0.32, 66); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(item.center.x, item.center.y, radius, 0, TAU); ctx.stroke();
    for (let dot = 0; dot < satellites; dot++) {
      const angle = now * (0.001 + dot * 0.00018) + item.travel * 0.05 + dot / satellites * TAU;
      const orbit = radius * (0.65 + (dot % 3) * 0.28);
      ctx.fillStyle = acidColor(track, item, now, dot * 71, alpha * 0.78, 68);
      ctx.beginPath(); ctx.arc(item.center.x + Math.cos(angle) * orbit, item.center.y + Math.sin(angle) * orbit, 1.4 + dot % 2, 0, TAU); ctx.fill();
    }
  }
}

export const CLUB_EFFECTS: Record<PatternId, EffectRenderer> = {
  'neon-rails': { update: noUpdate, render: renderRails, reset: resetTransient },
  'prism-ribbon': { update: noUpdate, render: renderRibbon, reset: resetTransient },
  'chromatic-echoes': { update: noUpdate, render: renderEchoes, reset: resetTransient },
  'electric-comets': { update: emitComets, render: renderComets, reset: resetTransient },
  'kinetic-lattice': { update: noUpdate, render: renderLattice, reset: resetTransient },
  'psychedelic-serpent': { update: noUpdate, render: renderSerpent, reset: resetTransient },
  'apex-shatter': { update: emitApex, render: renderShatter, reset: resetTransient },
  'pixel-mosaic': { update: noUpdate, render: renderMosaic, reset: resetTransient },
  'radial-pov': { update: noUpdate, render: renderRadial, reset: resetTransient },
  'acid-blooms': { update: noUpdate, render: renderBlooms, reset: resetTransient },
  'liquid-portal': { update: noUpdate, render: renderPortals, reset: resetTransient },
  'kaleido-tunnel': { update: noUpdate, render: renderKaleido, reset: resetTransient },
  'melting-rainbow': { update: noUpdate, render: renderMeltingRainbow, reset: resetTransient },
  'hypno-eyes': { update: noUpdate, render: renderEyes, reset: resetTransient },
  'cosmic-spores': { update: noUpdate, render: renderSpores, reset: resetTransient },
};

export function drawPoiLayer(ctx: CanvasRenderingContext2D, tracks: PoiTrack[], now: number, controls: PoiControls, patternId: PatternId, image: ImageData | null) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const track of tracks) CLUB_EFFECTS[patternId].render(ctx, track, now, controls, image);
  ctx.restore();
}
