# Afterimage

Afterimage is a web application that tracks your glowing LED juggling clubs in real-time (using your camera or an uploaded video file) and draws beautiful, glowing light trails behind them.

---

## How It Works

1. **Light Detection**: The app looks at the video feed and isolates the bright moving lights of your juggling clubs.
2. **Path Tracking**: It calculates where the clubs are moving, how fast they are spinning, and where their endpoints are.
3. **Visual Overlay**: It draws glowing patterns and trails directly following the clubs' paths at 60 frames per second.

---

## Effect Categories

There are three main tabs of effects in the sidebar:

### 1. Geometric
These draw clean, geometric vector shapes connected to the club's physical frame and rotation:
- **Neon Rails**: Draws double parallel neon lines following the endpoints of the clubs.
- **Prism Ribbon**: Draws a solid, tapering gradient ribbon behind the clubs.
- **Chromatic Echoes**: Draws colored ghost copies of the clubs that match their exact rotation.
- **Electric Comets**: Draws white-hot electrical arcs connecting the clubs in mid-air.
- **Kinetic Lattice**: Connects past club positions into a network of triangles and diamonds.
- **Psychedelic Serpent**: Waves and twists neon strands around the club path.
- **Apex Shatter**: Fires a burst of glass-like shards when a club reaches the peak of a throw.
- **Pixel Mosaic**: Places spaced glowing tiles (diamonds, hexagons, squares) along the path.
- **Radial POV**: Recreates classic circular spoke patterns from the center of the clubs.

### 2. Psychedelic
These are premium, high-fidelity visual effects that are centered exactly on each club and follow their paths:
- **Crystalline Constellation**: Draws a glowing geometric web of connected neon triangles and star points.
- **Vector Swarm**: Spawns a dense swarm of tiny glowing sparks that swirl and orbit behind each club.
- **Volumetric Fan Rays**: Sweeps volumetric searchlight beams outward from each club like a rotating laser.
- **Lava Plasma**: Draws soft, glowing plasma blobs along the path that merge organically like a lava lamp.
- **Atomic Shell**: Spins thin glowing rings around the club on multiple tilted axes like a gyroscope.
- **Digital Glitch**: Drops vertical digital rain strands that fall and fragment along the trajectory.

### 3. Classic
These are traditional video-feedback trails that copy the actual camera feed:
- **Neon**: A tight, high-contrast trail with fast color cycling.
- **Ghost**: Leaves frozen snapshots of the clubs along their path.
- **Smoke**: Leaves a wide, blurry cloud that rises and drifts away.
- **Vortex**: A long trail that spirals sharply inward toward the center of the screen.

---

## Sliders and Controls

- **Lifetime**: How long the trails and particles remain visible before fading out.
- **Brightness**: How bright and opaque the glowing trails are.
- **Glow**: The size of the soft neon glow surrounding the trails.
- **Smoothing**: Reduces shaking/jittering from camera noise. Higher values are smoother but add slight delay.
- **Other Sliders**: Different effects unlock custom sliders (like symmetry, particle density, wave height, or line thickness) to tune the trails.

---

## Getting Started (Local Setup)

To run this app on your computer:

1. **Install Node.js**: Make sure you have Node.js installed on your computer.
2. **Install Dependencies**: Open your terminal in this folder and run:
   ```bash
   npm install
   ```
3. **Run Development Server**: Start the local server by running:
   ```bash
   npm run dev
   ```
   Open the address shown in your browser (usually `http://localhost:5173`).
4. **Build for Production**: To compile the app into clean, optimized files:
   ```bash
   npm run build
   ```
5. **Run Tests**: To run the automated checks:
   ```bash
   npm test
   ```
