# Rules and Codebase Guide for AI Assistants

This file outlines the rules, architecture, and design principles of the Afterimage codebase for any AI coding assistants working in this repository.

---

## Core Rules (Must Follow)

1. **Electric Comets and Volumetric Fan Rays Modification Lock**:
   - You must **NEVER** edit, delete, or change any code related to the **Electric Comets** preset or the **Volumetric Fan Rays** preset in `src/pixelPoi.ts`. This includes:
     - The functions `emitComets`, `renderComets`, and the `electric-comets` logic inside `connectActiveClubs`.
     - The function `renderVolumetricFanRays` and all associated default control values.
   - Even if the user says "all" (e.g., "change all presets"), these locked settings and code files are NOT included and must remain completely untouched.
   - The only exception is if the user specifically instructs you to change Electric Comets or Volumetric Fan Rays in a new prompt.

2. **No Screen-Wide Overlays**:
   - Psychedelic effects must be drawn **locally** around each juggling club's position.
   - Do **NOT** rotate or zoom the entire screen canvas around the screen center, as this covers up the juggler and makes the effects look like a giant screen-wide overlay.
   - Keep the sizes of these effects small and proportional to the club's physical length.

3. **Visual Quality and Glow**:
   - Do **NOT** draw simple, flat wireframe lines (using standard thin strokes).
   - Use soft radial gradients, glowing shadows (`ctx.shadowBlur`), and additive compositing (`ctx.globalCompositeOperation = 'lighter'`) to make the light trails look organic and glowing.

4. **Verify Work**:
   - Always run the tests with `npm test` and run a production build check with `npm run build` before finishing. The codebase must have zero TypeScript errors.

---

## Codebase Map

Here is where the main files are located and what they do:

- **`src/App.tsx`**: Renders the user interface. It contains the sidebar, navigation tabs (Geometric, Psychedelic, Classic), and range sliders for adjusting settings.
- **`src/VideoStage.tsx`**: Manages the camera feed, uploads, and the main animation render loop. It extracts the moving light spots from the video frame and overlays the trails.
- **`src/pixelPoi.ts`**: Contains the computer-vision tracking algorithms, trajectory pose history, particle systems, and the Canvas 2D math drawing code for all Geometric and Psychedelic effects.
- **`src/pixelPoiPatterns.ts`**: Defines the list, category, names, and descriptions of all pattern presets.
- **`src/effects.ts`**: Defines the list and default settings for all Classic trail presets. It also contains the math for motion detection and pixel thresholding.
- **`src/effects.test.ts`**: The unit test suite.
- **`src/styles.css`**: Styling sheets and icon artwork previews for all presets.
