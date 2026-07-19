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
  { id: 'acid-blooms', name: 'Crystalline Constellation', category: 'psychedelic', geometry: 'interconnected neon mesh', description: 'Thin glowing triangles span the trajectory to form a floating crystalline constellation.' },
  { id: 'liquid-portal', name: 'Vector Swarm', category: 'psychedelic', geometry: 'flow-field particles', description: 'A localized swarm of neon sparks swirls and orbits within a fluid velocity flow field.' },
  { id: 'kaleido-tunnel', name: 'Volumetric Fan Rays', category: 'psychedelic', geometry: 'rotational beam sweep', description: 'Volumetric light fan rays sweep outward from the club center like a high-speed laser scanner.' },
  { id: 'melting-rainbow', name: 'Lava Plasma', category: 'psychedelic', geometry: 'merging metaballs', description: 'Glowing neon plasma blobs float along the path and merge organically like a lava lamp.' },
  { id: 'hypno-eyes', name: 'Atomic Shell', category: 'psychedelic', geometry: 'multi-axis orbit rings', description: 'Thin glowing rings spin around the club center on multiple 3D axes like an orbital shell.' },
  { id: 'cosmic-spores', name: 'Digital Glitch', category: 'psychedelic', geometry: 'vertical voxel strands', description: 'Vertical digital rain strands cascade and disintegrate along the flight path.' },
];

export const DEFAULT_PATTERN_ID: PatternId = 'neon-rails';
export const PATTERN_IDS = new Set<PatternId>(PATTERN_PRESETS.map(({ id }) => id));

export function isPatternId(value: string): value is PatternId {
  return PATTERN_IDS.has(value as PatternId);
}
