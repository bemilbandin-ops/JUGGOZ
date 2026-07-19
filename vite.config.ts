import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sacredGeometryTransform } from './build/sacredGeometryTransform';
import { afterimageTrailTransform } from './build/afterimageTrailTransform';

export default defineConfig({
  plugins: [afterimageTrailTransform(), sacredGeometryTransform(), react()],
});
