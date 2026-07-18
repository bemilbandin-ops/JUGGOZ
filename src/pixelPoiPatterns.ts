export type PatternId =
  | 'neon-rails'
  | 'prism-ribbon'
  | 'chromatic-echoes'
  | 'electric-comets'
  | 'kinetic-lattice'
  | 'psychedelic-serpent'
  | 'apex-shatter'
  | 'pixel-mosaic'
  | 'radial-pov'
  | 'acid-blooms'
  | 'liquid-portal'
  | 'kaleido-tunnel'
  | 'melting-rainbow'
  | 'hypno-eyes'
  | 'cosmic-spores';

export type PatternCategory = 'geometric' | 'psychedelic';

export type PatternPreset = {
  id: PatternId;
  name: string;
  category: PatternCategory;
  geometry: string;
  description: string;
};

export const PATTERN_PRESETS: PatternPreset[] = [
  { id: 'neon-rails', name: 'Neon Rails', category: 'geometric', geometry: 'dual endpoint splines', description: 'Twin cyan and magenta endpoint rails twist along each throw.' },
  { id: 'prism-ribbon', name: 'Prism Ribbon', category: 'geometric', geometry: 'open trajectory mesh', description: 'A tapered stained-glass ribbon follows the translated flight path.' },
  { id: 'chromatic-echoes', name: 'Chromatic Echoes', category: 'geometric', geometry: 'discrete pose stamps', description: 'Separated club silhouettes preserve the real rotation of the throw.' },
  { id: 'electric-comets', name: 'Electric Comets', category: 'geometric', geometry: 'endpoint particles', description: 'Independent electrical branches shed from both moving endpoints.' },
  { id: 'kinetic-lattice', name: 'Kinetic Lattice', category: 'geometric', geometry: 'temporal polygon mesh', description: 'Sequential poses form a fading chain of triangles and diamonds.' },
  { id: 'psychedelic-serpent', name: 'Psychedelic Serpent', category: 'geometric', geometry: 'multi-strand path waveform', description: 'Flowing wave strands coil around the club’s translated trajectory.' },
  { id: 'apex-shatter', name: 'Apex Shatter', category: 'geometric', geometry: 'apex event shards', description: 'One restrained shard burst fires at the detected apex of each throw.' },
  { id: 'pixel-mosaic', name: 'Pixel Mosaic', category: 'geometric', geometry: 'path-oriented tiles', description: 'Spaced diamonds, chevrons, hexagons, and squares mark the flight path.' },
  { id: 'radial-pov', name: 'Radial POV', category: 'geometric', geometry: 'local radial spokes', description: 'The original center-based rotational effect, retained as an option.' },
  { id: 'acid-blooms', name: 'Acid Blooms', category: 'psychedelic', geometry: 'animated petal mandalas', description: 'Pulsing rainbow flowers blossom and rotate along every throw.' },
  { id: 'liquid-portal', name: 'Liquid Portal', category: 'psychedelic', geometry: 'warped concentric rings', description: 'Fluid neon portals ripple outward through the flight path.' },
  { id: 'kaleido-tunnel', name: 'Kaleido Tunnel', category: 'psychedelic', geometry: 'nested rotating star wheels', description: 'Layered kaleidoscope stars twist into a prismatic tunnel.' },
  { id: 'melting-rainbow', name: 'Melting Rainbow', category: 'psychedelic', geometry: 'dripping spectral bands', description: 'Thick spectral ribbons wobble, overlap, and melt behind the club.' },
  { id: 'hypno-eyes', name: 'Hypno Eyes', category: 'psychedelic', geometry: 'alternating orbital eyes', description: 'Color-shifting eyes blink and stare from the trail.' },
  { id: 'cosmic-spores', name: 'Cosmic Spores', category: 'psychedelic', geometry: 'orbiting halo colonies', description: 'Glowing spores orbit soft halos like a moving alien galaxy.' },
];

export const DEFAULT_PATTERN_ID: PatternId = 'neon-rails';
export const PATTERN_IDS = new Set<PatternId>(PATTERN_PRESETS.map(({ id }) => id));

export function isPatternId(value: string): value is PatternId {
  return PATTERN_IDS.has(value as PatternId);
}
