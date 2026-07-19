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
  'acid-blooms': tuned({ lifetime: 1100, brightness: 74, glow: 22, smoothing: 74, radialSymmetry: 6, tileSpacing: 28 }),
  'liquid-portal': tuned({ lifetime: 800, brightness: 72, glow: 20, smoothing: 78, echoSpacing: 16, waveAmplitude: 10 }),
  'kaleido-tunnel': tuned({ lifetime: 700, brightness: 68, glow: 16, smoothing: 72, radialSymmetry: 6, latticeDensity: 24 }),
  'melting-rainbow': tuned({ lifetime: 1250, brightness: 72, glow: 20, smoothing: 80, strandCount: 3, waveAmplitude: 12 }),
  'hypno-eyes': tuned({ lifetime: 750, brightness: 70, glow: 18, smoothing: 76, echoSpacing: 28, shapeMix: 60 }),
  'cosmic-spores': tuned({ lifetime: 700, brightness: 72, glow: 18, smoothing: 76, tileSpacing: 22, branching: 42, waveAmplitude: 8 }),
};

const TAU = Math.PI * 2;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
function effectScale(item: PoiPose, controls: PoiControls) {
  const normalizedLength = clamp(item.length, 32, 92);
  return normalizedLength / 72;
}
function localRadius(item: PoiPose, controls: PoiControls, baseRadius: number, maxRadius = 28) {
  return Math.min(maxRadius, baseRadius * effectScale(item, controls));
}
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
  if (track.confidence < 0.18) return [];
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
  render: (ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls, image: ImageData | null, displayScale: number) => void;
  reset: (track: PoiTrack) => void;
};

const noUpdate: EffectRenderer['update'] = () => undefined;
const noRender: EffectRenderer['render'] = () => undefined;
const resetTransient: EffectRenderer['reset'] = (track) => { track.particles = []; track.shards = []; };

function trackFade(track: PoiTrack, now: number, controls: PoiControls) {
  if (track.state === 'lost') return clamp(1 - (now - track.lastSeen) / Math.min(420, controls.lostReset), 0, 1);
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
    
    // First rail (glow + core)
    drawSegment(ctx, aEnds.first, bEnds.first, color(track, 0, alpha * 0.4), 6);
    drawSegment(ctx, aEnds.first, bEnds.first, `rgba(255, 255, 255, ${alpha * 0.95})`, 1.2);
    
    // Second rail (glow + core)
    drawSegment(ctx, aEnds.second, bEnds.second, color(track, 1, alpha * 0.4), 6);
    drawSegment(ctx, aEnds.second, bEnds.second, `rgba(255, 255, 255, ${alpha * 0.95})`, 1.2);
  });
}

function renderRibbon(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls) {
  const visible = track.history.filter((item) => now - item.timestamp < controls.lifetime);
  if (visible.length < 2) return;
  
  ctx.beginPath();
  const alpha = trackFade(track, now, controls);
  
  const pointsLeft: Point[] = [];
  const pointsRight: Point[] = [];
  
  for (let index = 0; index < visible.length; index++) {
    const item = visible[index];
    const taper = clamp(Math.min(index / 6, (visible.length - index) / 6), 0.1, 1);
    const halfLen = item.length * 0.25 * (controls.ribbonWidth / 100) * taper;
    const ends = endpoints(item.center, item.angle, halfLen);
    pointsLeft.push(ends.first);
    pointsRight.unshift(ends.second);
  }
  
  ctx.moveTo(pointsLeft[0].x, pointsLeft[0].y);
  for (let p = 1; p < pointsLeft.length; p++) ctx.lineTo(pointsLeft[p].x, pointsLeft[p].y);
  for (let p = 0; p < pointsRight.length; p++) ctx.lineTo(pointsRight[p].x, pointsRight[p].y);
  ctx.closePath();
  
  const start = pointsLeft[0];
  const end = pointsLeft[pointsLeft.length - 1] || start;
  const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
  grad.addColorStop(0, color(track, 0, alpha * 0.32));
  grad.addColorStop(0.5, color(track, 1, alpha * 0.32));
  grad.addColorStop(1, color(track, 2, alpha * 0.32));
  
  ctx.fillStyle = grad;
  ctx.fill();
  
  ctx.strokeStyle = color(track, 0, alpha * 0.7, 75);
  ctx.lineWidth = 1.0;
  ctx.stroke();
}

function drawClubSilhouette(ctx: CanvasRenderingContext2D, center: Point, angle: number, length: number, strokeColor: string, strokeWidth: number) {
  const half = length / 2;
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(angle);
  
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth;
  
  ctx.beginPath();
  ctx.arc(-half + 4, 0, 4.5, 0, TAU); // Knob
  ctx.moveTo(-half + 8.5, -1.2);
  ctx.lineTo(-half * 0.1, -1.8); // Handle
  ctx.bezierCurveTo(half * 0.2, -6.5, half * 0.75, -8.0, half * 0.9, -3.8); // Body
  ctx.bezierCurveTo(half, -1.2, half, 1.2, half * 0.9, 3.8);
  ctx.bezierCurveTo(half * 0.75, 8.0, half * 0.2, 6.5, -half * 0.1, 1.8);
  ctx.lineTo(-half + 8.5, 1.2);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function sampleImage(image: ImageData, u: number, v: number) {
  const x = clamp(Math.round(u * (image.width - 1)), 0, image.width - 1);
  const y = clamp(Math.round(v * (image.height - 1)), 0, image.height - 1);
  const offset = (y * image.width + x) * 4;
  return `rgb(${image.data[offset]} ${image.data[offset + 1]} ${image.data[offset + 2]} / ${image.data[offset + 3] / 255})`;
}

function acidColor(track: PoiTrack, item: PoiPose, now: number, offset = 0, alpha = 1, lightness = 60) {
  const hue = (item.travel * 2.4 + now * 0.09 + track.id * 47 + offset) % 360;
  return `hsl(${hue} 100% ${lightness}% / ${clamp(alpha, 0, 0.88)})`;
}

function renderEchoes(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls) {
  spacedPoses(track, now, controls, controls.echoSpacing, Math.round(controls.echoCount)).forEach((item, index) => {
    const alpha = poseFade(item, track, now, controls) * (1 - index / (controls.echoCount + 2));
    const scale = 1 - index * 0.02;
    const len = item.length * scale;
    
    const speed = Math.hypot(item.velocity.x, item.velocity.y);
    const offset = Math.min(6.0, speed * 15);
    const dir = speed > 0.001 ? { x: item.velocity.x / speed, y: item.velocity.y / speed } : { x: 0, y: 0 };
    
    // Red chromatic echo
    drawClubSilhouette(
      ctx,
      { x: item.center.x - dir.x * offset, y: item.center.y - dir.y * offset },
      item.angle,
      len,
      `rgba(255, 0, 100, ${alpha * 0.4})`,
      1.0
    );
    
    // Cyan chromatic echo
    drawClubSilhouette(
      ctx,
      { x: item.center.x + dir.x * offset, y: item.center.y + dir.y * offset },
      item.angle,
      len,
      `rgba(0, 200, 255, ${alpha * 0.4})`,
      1.0
    );
    
    // White core echo
    drawClubSilhouette(
      ctx,
      item.center,
      item.angle,
      len,
      `rgba(255, 255, 255, ${alpha * 0.8})`,
      1.0
    );
  });
}

function emitComets(track: PoiTrack, added: PoiPose[], now: number, controls: PoiControls) {
  // Do not emit particles
}

function renderComets(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls) {
  // Draw nothing for individual comets to only show the connecting electricity
}

function renderLattice(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls) {
  const samples = spacedPoses(track, now, controls, controls.latticeDensity).reverse();
  if (samples.length < 2) return;
  
  ctx.strokeStyle = color(track, 0, trackFade(track, now, controls) * 0.2, 70);
  ctx.lineWidth = 0.8;
  
  ctx.beginPath();
  for (let index = 1; index < samples.length; index++) {
    const a = samples[index - 1], b = samples[index];
    if (a.segment !== b.segment || distance(a.center, b.center) > controls.latticeDensity * 2.8) continue;
    
    ctx.moveTo(a.center.x, a.center.y);
    ctx.lineTo(b.center.x, b.center.y);
    ctx.moveTo(a.first.x, a.first.y);
    ctx.lineTo(b.first.x, b.first.y);
    ctx.moveTo(a.second.x, a.second.y);
    ctx.lineTo(b.second.x, b.second.y);
  }
  ctx.stroke();
}

function renderSerpent(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls) {
  eachPair(track, now, controls, (a, b) => {
    const tangent = Math.atan2(b.center.y - a.center.y, b.center.x - a.center.x);
    const normal = { x: -Math.sin(tangent), y: Math.cos(tangent) };
    const alpha = poseFade(b, track, now, controls);
    const amplitude = controls.waveAmplitude * 2.2;
    
    const offsetA = Math.sin(a.travel * 0.08 - now * 0.003) * amplitude;
    const offsetB = Math.sin(b.travel * 0.08 - now * 0.003) * amplitude;
    
    const ptA1 = { x: a.center.x + normal.x * offsetA, y: a.center.y + normal.y * offsetA };
    const ptB1 = { x: b.center.x + normal.x * offsetB, y: b.center.y + normal.y * offsetB };
    
    const ptA2 = { x: a.center.x - normal.x * offsetA, y: a.center.y - normal.y * offsetA };
    const ptB2 = { x: b.center.x - normal.x * offsetB, y: b.center.y - normal.y * offsetB };
    
    drawSegment(ctx, ptA1, ptB1, acidColor(track, b, now, 0, alpha * 0.5, 65), 14);
    drawSegment(ctx, ptA2, ptB2, acidColor(track, b, now, 180, alpha * 0.5, 65), 14);
    
    drawSegment(ctx, ptA1, ptB1, `rgba(255, 255, 255, ${alpha * 0.95})`, 3.0);
    drawSegment(ctx, ptA2, ptB2, `rgba(255, 255, 255, ${alpha * 0.95})`, 3.0);
  });
}

function emitApex(track: PoiTrack, _added: PoiPose[], now: number, controls: PoiControls) {
  if (track.state !== 'apex' || track.shards.some((item) => Math.abs(item.born - track.stateAt) < 2)) return;
  const count = Math.round(controls.shardCount * 2.0);
  for (let index = 0; index < count; index++) {
    track.shards.push({
      origin: { ...track.center },
      angle: (index / count) * TAU + seeded(track.id * 31 + index) * 0.6,
      speed: 0.03 + seeded(track.id * 53 + index) * 0.06,
      spin: (seeded(track.id * 79 + index) - 0.5) * 0.05,
      size: 6.0 + seeded(track.id * 101 + index) * 8.0,
      born: now,
    });
  }
}

function renderShatter(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls) {
  track.shards.forEach((shard, index) => {
    const age = now - shard.born;
    const alpha = clamp(1 - age / (controls.lifetime * 1.2), 0, 1) * controls.brightness / 100;
    
    const x = shard.origin.x + Math.cos(shard.angle) * shard.speed * age;
    const y = shard.origin.y + Math.sin(shard.angle) * shard.speed * age + age * age * 0.00003;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(shard.angle + age * shard.spin);
    
    ctx.fillStyle = color(track, index, alpha * 0.4, 70);
    ctx.beginPath();
    ctx.moveTo(0, -shard.size * 1.5);
    ctx.lineTo(shard.size, 0);
    ctx.lineTo(0, shard.size * 1.5);
    ctx.lineTo(-shard.size, 0);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
    ctx.beginPath();
    ctx.moveTo(0, -shard.size * 0.6);
    ctx.lineTo(shard.size * 0.4, 0);
    ctx.lineTo(0, shard.size * 0.6);
    ctx.lineTo(-shard.size * 0.4, 0);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  });
}

function renderMosaic(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls) {
  spacedPoses(track, now, controls, controls.tileSpacing * 0.8).forEach((item, index) => {
    const alpha = poseFade(item, track, now, controls);
    const size = 12.0;
    
    ctx.save();
    ctx.translate(item.center.x, item.center.y);
    ctx.rotate(item.angle + now * 0.002);
    
    ctx.strokeStyle = color(track, index, alpha * 0.85, 68);
    ctx.lineWidth = 2.5;
    
    ctx.beginPath();
    ctx.rect(-size, -size, size * 2, size * 2);
    ctx.stroke();
    
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, TAU);
    ctx.fill();
    
    ctx.restore();
  });
}

function renderRadial(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls, image: ImageData | null) {
  const latest = track.history.at(-1);
  if (!latest) return;
  const spokes = spacedPoses(track, now, controls, Math.max(3, 40 / controls.radialSymmetry), 80);
  
  for (const [index, item] of spokes.entries()) {
    const alpha = poseFade(item, track, now, controls) * 0.7;
    const ends = endpoints(latest.center, item.angle, item.length);
    const stroke = image ? sampleImage(image, index / Math.max(1, spokes.length - 1), (Math.sin(item.angle) + 1) / 2) : color(track, index, alpha, 70);
    
    drawSegment(ctx, ends.first, ends.second, stroke, 3.0);
  }
}

function renderCrystallineConstellation(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls, image: ImageData | null, displayScale: number) {
  const poses = spacedPoses(track, now, controls, Math.max(10, controls.tileSpacing)).slice(0, 14);
  if (poses.length < 2) return;
  
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  
  const maxDist = 34; // in tracking pixels
  
  // Find two closest neighbors for each node
  const neighbors: number[][] = [];
  for (let i = 0; i < poses.length; i++) {
    const list: { index: number; dist: number }[] = [];
    for (let j = 0; j < poses.length; j++) {
      if (i === j) continue;
      const d = distance(poses[i].center, poses[j].center);
      list.push({ index: j, dist: d });
    }
    list.sort((a, b) => a.dist - b.dist);
    neighbors.push(list.slice(0, 2).map(item => item.index));
  }
  
  // Connect each node to its two closest neighbors if distance < 34
  ctx.lineWidth = 1 / displayScale;
  for (let i = 0; i < poses.length; i++) {
    const alphaI = poseFade(poses[i], track, now, controls);
    if (alphaI <= 0.05) continue;
    
    const nbs = neighbors[i];
    for (const nb of nbs) {
      const dist = distance(poses[i].center, poses[nb].center);
      if (dist < maxDist) {
        const alphaNb = poseFade(poses[nb], track, now, controls);
        const avgAlpha = (alphaI + alphaNb) / 2;
        const hue = i % 2 === 0 ? 275 : 185; // Violet-cyan palette
        
        ctx.strokeStyle = `hsla(${hue}, 100%, 75%, ${avgAlpha * 0.75})`;
        ctx.beginPath();
        ctx.moveTo(poses[i].center.x, poses[i].center.y);
        ctx.lineTo(poses[nb].center.x, poses[nb].center.y);
        ctx.stroke();
      }
    }
    
    // Create a triangle only every third node
    if (i % 3 === 0 && nbs.length >= 2) {
      const nb1 = nbs[0];
      const nb2 = nbs[1];
      const d1 = distance(poses[i].center, poses[nb1].center);
      const d2 = distance(poses[i].center, poses[nb2].center);
      const d3 = distance(poses[nb1].center, poses[nb2].center);
      
      if (d1 < maxDist && d2 < maxDist && d3 < maxDist) {
        const alpha1 = poseFade(poses[nb1], track, now, controls);
        const alpha2 = poseFade(poses[nb2], track, now, controls);
        const avgAlpha = (alphaI + alpha1 + alpha2) / 3;
        const hue = i % 2 === 0 ? 275 : 185;
        
        ctx.fillStyle = `hsla(${hue}, 100%, 65%, ${avgAlpha * 0.04})`;
        ctx.beginPath();
        ctx.moveTo(poses[i].center.x, poses[i].center.y);
        ctx.lineTo(poses[nb1].center.x, poses[nb1].center.y);
        ctx.lineTo(poses[nb2].center.x, poses[nb2].center.y);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  
  poses.forEach((p, idx) => {
    const alpha = poseFade(p, track, now, controls);
    if (alpha <= 0.05) return;
    const hue = idx % 2 === 0 ? 275 : 185;
    const r = localRadius(p, controls, 2.5) / displayScale;
    
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = `hsla(${hue}, 100%, 60%, 1.0)`;
    ctx.shadowBlur = 4 / displayScale;
    ctx.beginPath();
    ctx.arc(p.center.x, p.center.y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  
  ctx.restore();
}

function updateVectorSwarm(track: PoiTrack, added: PoiPose[], now: number, controls: PoiControls) {
  added.forEach((pose) => {
    // Emit once every 12–18 pixels of travel (we choose 15)
    if (Math.floor(pose.travel / 15) > Math.floor((pose.travel - 3) / 15)) {
      const angle = Math.random() * Math.PI * 2;
      // Velocity in pixels per second, multiplying by age/1000
      const speed = (30 + Math.random() * 50) * (controls.waveAmplitude / 10);
      track.particles.push({
        origin: { x: pose.center.x, y: pose.center.y },
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        born: now,
        seed: Math.random(),
        branches: 0
      });
    }
  });
  
  // Cap at 50 particles per track
  track.particles = track.particles.filter((p) => now - p.born < controls.lifetime).slice(-50);
}

function renderVectorSwarm(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls, image: ImageData | null, displayScale: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over'; // Use source-over instead of lighter
  
  track.particles.forEach((p) => {
    const age = now - p.born;
    const progress = age / controls.lifetime;
    if (progress >= 1.0) return;
    
    // Position at current age (swirl radius reduced to 5.5)
    const t = age * 0.005;
    const swirlX = Math.sin(t + p.seed * Math.PI * 2) * 5.5;
    const swirlY = Math.cos(t * 1.5 + p.seed * Math.PI * 2) * 5.5;
    
    // Containment force pulling back to track center
    const px = mix(p.origin.x + p.velocity.x * (age / 1000) + swirlX, track.center.x, progress * 0.6);
    const py = mix(p.origin.y + p.velocity.y * (age / 1000) + swirlY, track.center.y, progress * 0.6);
    
    // Position at previous age for curved streak
    const prevAge = Math.max(0, age - 30);
    const prevProgress = prevAge / controls.lifetime;
    const prevT = prevAge * 0.005;
    const prevSwirlX = Math.sin(prevT + p.seed * Math.PI * 2) * 5.5;
    const prevSwirlY = Math.cos(prevT * 1.5 + p.seed * Math.PI * 2) * 5.5;
    const prevPx = mix(p.origin.x + p.velocity.x * (prevAge / 1000) + prevSwirlX, track.center.x, prevProgress * 0.6);
    const prevPy = mix(p.origin.y + p.velocity.y * (prevAge / 1000) + prevSwirlY, track.center.y, prevProgress * 0.6);
    
    const alpha = poseFade({ timestamp: p.born } as any, track, now, controls) * (1 - progress);
    const baseSize = localRadius({ length: track.length } as PoiPose, controls, 3.5);
    const size = Math.max(0.5, baseSize * (1 - progress)) / displayScale;
    
    // Palette: Cyan (190) and Violet (270)
    const hue = p.seed < 0.5 ? 190 : 270;
    
    ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${alpha * 0.9})`;
    ctx.shadowColor = `hsla(${hue}, 100%, 60%, ${alpha * 0.9})`;
    ctx.shadowBlur = size * 2.0;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(prevPx, prevPy);
    ctx.lineTo(px, py);
    ctx.stroke();
  });
  
  ctx.restore();
}

function renderVolumetricFanRays(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls, image: ImageData | null, displayScale: number) {
  // Render rays only from the latest one or two poses
  const poses = track.history.slice(-2).reverse();
  if (poses.length === 0) return;
  
  ctx.save();
  ctx.globalCompositeOperation = 'source-over'; // Avoid additive compositing
  
  poses.forEach((item, index) => {
    const alpha = poseFade(item, track, now, controls);
    if (alpha <= 0.05) return;
    
    const age = now - item.timestamp;
    const progress = age / controls.lifetime;
    
    // Cap ray length to 18–30 tracking pixels (e.g. 24)
    const maxLen = localRadius(item, controls, 24, 30);
    if (maxLen < 4) return;
    
    // Orient the fan using the club angle or movement direction
    const speed = Math.hypot(item.velocity.x, item.velocity.y);
    const baseAngle = speed > 0.02 ? Math.atan2(item.velocity.y, item.velocity.x) : item.angle;
    
    // Use 5–7 narrow lines (we choose 7)
    const lineCount = 7;
    // Narrow angular spread, about 25–40 degrees total (we choose 35 degrees = 0.61 radians)
    const spread = 35 * Math.PI / 180;
    
    // Palette: Electric Blue (210) and Hot Pink (320)
    const hue = index % 2 === 0 ? 210 : 320;
    
    ctx.save();
    ctx.translate(item.center.x, item.center.y);
    
    // Fade older pose relative to latest
    const poseWeight = index === 0 ? 1.0 : 0.5;
    ctx.globalAlpha = alpha * (1 - progress) * poseWeight;
    
    for (let r = 0; r < lineCount; r++) {
      const angleOffset = ((r / (lineCount - 1)) - 0.5) * spread;
      const angle = baseAngle + angleOffset;
      
      // Fade in the direction opposite motion (rays further from center fade out)
      const motionFade = Math.cos(angleOffset * (Math.PI / spread));
      
      ctx.save();
      ctx.rotate(angle);
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(maxLen, 0);
      
      ctx.strokeStyle = `hsla(${hue}, 100%, 65%, ${motionFade})`;
      ctx.lineWidth = (1.5 / displayScale) * motionFade;
      ctx.stroke();
      
      ctx.restore();
    }
    ctx.restore();
  });
  ctx.restore();
}

function renderLavaPlasma(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls, image: ImageData | null, displayScale: number) {
  // Sample poses at 22 pixel spacing
  const spacing = 22;
  const poses = spacedPoses(track, now, controls, spacing);
  if (poses.length < 2) return;
  
  ctx.save();
  ctx.globalCompositeOperation = 'source-over'; // Use source-over instead of lighter
  
  const lavaPalette = [0, 25, 50];
  
  // First, draw the thick tapered path underneath the blobs
  for (let i = 1; i < poses.length; i++) {
    const a = poses[i - 1];
    const b = poses[i];
    if (a.segment !== b.segment) continue;
    
    const alphaA = poseFade(a, track, now, controls);
    const alphaB = poseFade(b, track, now, controls);
    const avgAlpha = (alphaA + alphaB) / 2;
    if (avgAlpha <= 0.05) continue;
    
    const progressA = (now - a.timestamp) / controls.lifetime;
    const progressB = (now - b.timestamp) / controls.lifetime;
    
    // Older blobs shrink faster using Math.pow(1 - progress, 2)
    const scaleA = Math.pow(1 - clamp(progressA, 0, 1), 2.0);
    const scaleB = Math.pow(1 - clamp(progressB, 0, 1), 2.0);
    
    // Radius multiplier 0.10, capped at 20 (via localRadius)
    const baseRadiusA = localRadius(a, controls, a.length * 0.10, 20);
    const baseRadiusB = localRadius(b, controls, b.length * 0.10, 20);
    
    const sizeA = baseRadiusA * scaleA;
    const sizeB = baseRadiusB * scaleB;
    
    const hue = lavaPalette[i % lavaPalette.length];
    
    ctx.strokeStyle = `hsla(${hue}, 100%, 55%, ${avgAlpha * 0.4})`;
    ctx.lineWidth = (sizeA + sizeB) / displayScale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.center.x, a.center.y);
    ctx.lineTo(b.center.x, b.center.y);
    ctx.stroke();
  }
  
  // Then, draw the blobs on top
  poses.forEach((item, index) => {
    const alpha = poseFade(item, track, now, controls);
    if (alpha <= 0.05) return;
    
    const age = now - item.timestamp;
    const progress = age / controls.lifetime;
    
    // Older blobs shrink faster
    const scale = Math.pow(1 - clamp(progress, 0, 1), 2.0);
    const baseRadius = localRadius(item, controls, item.length * 0.10, 20);
    const size = baseRadius * scale;
    if (size < 1) return;
    
    const hue = lavaPalette[index % lavaPalette.length];
    
    const displaySize = size / displayScale;
    const grad = ctx.createRadialGradient(item.center.x, item.center.y, 1 / displayScale, item.center.x, item.center.y, displaySize);
    grad.addColorStop(0, `hsla(${hue}, 100%, 70%, ${alpha})`);
    grad.addColorStop(0.5, `hsla(${(hue + 20) % 360}, 100%, 55%, ${alpha * 0.4})`);
    grad.addColorStop(1, 'transparent');
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(item.center.x, item.center.y, displaySize, 0, Math.PI * 2);
    ctx.fill();
  });
  
  ctx.restore();
}

function renderAtomicShell(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls, image: ImageData | null, displayScale: number) {
  // Draw shell only around the latest pose and 2 older ghost shells (maximum 3 shells)
  const poses = spacedPoses(track, now, controls, 20, 3);
  
  ctx.save();
  ctx.globalCompositeOperation = 'source-over'; // Use source-over instead of lighter
  
  poses.forEach((item, index) => {
    const alpha = poseFade(item, track, now, controls);
    if (alpha <= 0.05) return;
    
    const age = now - item.timestamp;
    const progress = age / controls.lifetime;
    
    // Cap radius to 16–24 tracking pixels (e.g. 18)
    const radius = localRadius(item, controls, 18, 20);
    
    ctx.save();
    ctx.translate(item.center.x, item.center.y);
    
    // Keep opacity under approximately 0.45, older ghost shells have lower opacity
    const ghostWeight = index === 0 ? 1.0 : (index === 1 ? 0.5 : 0.25);
    ctx.globalAlpha = alpha * (1 - progress) * 0.40 * ghostWeight;
    
    // Draw one small nucleus at the center
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = `rgba(255, 255, 255, 0.8)`;
    ctx.shadowBlur = 4 / displayScale;
    ctx.beginPath();
    ctx.arc(0, 0, 3.5 / displayScale, 0, Math.PI * 2);
    ctx.fill();
    
    // Use two rings instead of three
    const ringCount = 2;
    for (let s = 0; s < ringCount; s++) {
      ctx.save();
      
      // Rotate using actual club angle and angular velocity
      const baseRot = item.angle + s * Math.PI / ringCount;
      const spin = item.angularVelocity * age * 0.5;
      ctx.rotate(baseRot + spin);
      ctx.scale(1.0, 0.28);
      
      // Two-color palette: Cyan (180) and Magenta (320)
      const hue = s % 2 === 0 ? 180 : 320;
      
      ctx.strokeStyle = `hsla(${hue}, 100%, 65%, 0.85)`;
      ctx.lineWidth = 1.5 / displayScale;
      ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.8)`;
      ctx.shadowBlur = (radius * 0.3) / displayScale;
      
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  });
  
  ctx.restore();
}

function renderDigitalGlitch(ctx: CanvasRenderingContext2D, track: PoiTrack, now: number, controls: PoiControls, image: ImageData | null, displayScale: number) {
  const spacing = Math.max(15, controls.tileSpacing);
  const poses = spacedPoses(track, now, controls, spacing);
  
  ctx.save();
  ctx.globalCompositeOperation = 'source-over'; // Use source-over instead of lighter
  
  poses.forEach((item, index) => {
    // Randomly show only 30–50% of sampled poses each frame (we choose 40%)
    if (Math.random() > 0.40) return;
    
    const alpha = poseFade(item, track, now, controls);
    if (alpha <= 0.05) return;
    
    const age = now - item.timestamp;
    const progress = age / controls.lifetime;
    
    // Cap strand length at 3–5 blocks (we choose 4)
    const strandLength = 4;
    
    ctx.save();
    ctx.globalAlpha = alpha * (1 - progress);
    
    // Correct the Digital Glitch time-unit bug and keep fall distance under 25-40 (we choose 30) tracking pixels
    const speed = controls.waveAmplitude * 1.6;
    const fallDist = Math.min(30, (age / 1000) * speed);
    
    for (let s = 0; s < strandLength; s++) {
      const yOffset = fallDist + s * (6.0 / displayScale);
      const blockAlpha = 1.0 - (s / strandLength);
      
      const glitchX = (seeded(item.travel * 10 + s + Math.floor(now / 80)) - 0.5) * (6.0 / displayScale);
      
      // Restrained magenta/cyan palette
      const hue = s % 2 === 0 ? 320 : 180;
      
      ctx.fillStyle = `hsla(${hue}, 100%, 65%, ${blockAlpha * 0.9})`;
      ctx.shadowColor = `hsla(${hue}, 100%, 60%, 1.0)`;
      ctx.shadowBlur = 4 / displayScale;
      
      const w = 3.0 / displayScale;
      const h = 4.0 / displayScale;
      ctx.fillRect(
        item.center.x + glitchX - w / 2,
        item.center.y + yOffset - h / 2,
        w,
        h
      );
      
      // Add short horizontal scanline fragments
      if (s === 0) {
        ctx.strokeStyle = `hsla(${hue}, 100%, 75%, ${blockAlpha * 0.7})`;
        ctx.lineWidth = 1.0 / displayScale;
        ctx.beginPath();
        ctx.moveTo(item.center.x - 10 / displayScale, item.center.y + yOffset);
        ctx.lineTo(item.center.x + 10 / displayScale, item.center.y + yOffset);
        ctx.stroke();
      }
    }
    ctx.restore();
  });
  
  ctx.restore();
}

function drawElectricArc(ctx: CanvasRenderingContext2D, from: Point, to: Point, color: string, width: number, seed: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  if (dist < 1) return;
  const segments = Math.max(3, Math.floor(dist / 10));
  
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const baseX = from.x + (to.x - from.x) * t;
    const baseY = from.y + (to.y - from.y) * t;
    
    const perpX = -(to.y - from.y) / dist;
    const perpY = (to.x - from.x) / dist;
    const offset = Math.sin(t * Math.PI) * (seeded(seed + i) - 0.5) * 14.0;
    
    ctx.lineTo(baseX + perpX * offset, baseY + perpY * offset);
  }
  
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

function connectActiveClubs(ctx: CanvasRenderingContext2D, tracks: PoiTrack[], now: number, controls: PoiControls, patternId: PatternId) {
  const active = tracks.filter(t => t.state !== 'lost');
  if (active.length < 2) return;
  
  ctx.save();
  if (patternId === 'kinetic-lattice') {
    ctx.strokeStyle = 'rgba(0, 255, 200, 0.45)';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        ctx.moveTo(active[i].center.x, active[i].center.y);
        ctx.lineTo(active[j].center.x, active[j].center.y);
      }
    }
    ctx.stroke();
  } else if (patternId === 'electric-comets') {
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const hue = (now * 0.1 + i * 60) % 360;
        // Outer glow arc
        drawElectricArc(
          ctx,
          active[i].center,
          active[j].center,
          `hsla(${hue}, 100%, 75%, 0.5)`,
          5.0,
          now * 0.001 + i
        );
        // Inner white core arc
        drawElectricArc(
          ctx,
          active[i].center,
          active[j].center,
          `rgba(255, 255, 255, 0.9)`,
          1.2,
          now * 0.001 + i
        );
      }
    }
  } else if (patternId === 'neon-rails') {
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const hue = (now * 0.08 + i * 120) % 360;
        // Outer glow
        ctx.strokeStyle = `hsla(${hue}, 100%, 65%, 0.55)`;
        ctx.lineWidth = 6.0;
        ctx.beginPath();
        ctx.moveTo(active[i].center.x, active[i].center.y);
        ctx.lineTo(active[j].center.x, active[j].center.y);
        ctx.stroke();
        
        // Inner white core
        ctx.strokeStyle = `rgba(255, 255, 255, 0.9)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(active[i].center.x, active[i].center.y);
        ctx.lineTo(active[j].center.x, active[j].center.y);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}



export const CLUB_EFFECTS: Record<PatternId, EffectRenderer> = {
  'neon-rails': { update: noUpdate, render: renderRails, reset: resetTransient },
  'prism-ribbon': { update: noUpdate, render: renderRibbon, reset: resetTransient },
  'chromatic-echoes': { update: noUpdate, render: renderEchoes, reset: resetTransient },
  'electric-comets': { update: noUpdate, render: renderComets, reset: resetTransient },
  'kinetic-lattice': { update: noUpdate, render: renderLattice, reset: resetTransient },
  'psychedelic-serpent': { update: noUpdate, render: renderSerpent, reset: resetTransient },
  'apex-shatter': { update: emitApex, render: renderShatter, reset: resetTransient },
  'pixel-mosaic': { update: noUpdate, render: renderMosaic, reset: resetTransient },
  'radial-pov': { update: noUpdate, render: renderRadial, reset: resetTransient },
  'acid-blooms': { update: noUpdate, render: renderCrystallineConstellation, reset: resetTransient },
  'liquid-portal': { update: updateVectorSwarm, render: renderVectorSwarm, reset: resetTransient },
  'kaleido-tunnel': { update: noUpdate, render: renderVolumetricFanRays, reset: resetTransient },
  'melting-rainbow': { update: noUpdate, render: renderLavaPlasma, reset: resetTransient },
  'hypno-eyes': { update: noUpdate, render: renderAtomicShell, reset: resetTransient },
  'cosmic-spores': { update: noUpdate, render: renderDigitalGlitch, reset: resetTransient },
};

export function drawPoiLayer(ctx: CanvasRenderingContext2D, tracks: PoiTrack[], now: number, controls: PoiControls, patternId: PatternId, image: ImageData | null, displayScale: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  
  // 1. Draw active club connections (electric arcs, neon lines)
  connectActiveClubs(ctx, tracks, now, controls, patternId);
  
  // 2. Draw individual club trajectories
  for (const track of tracks) {
    CLUB_EFFECTS[patternId].render(ctx, track, now, controls, image, displayScale);
  }
  
  ctx.restore();
}
