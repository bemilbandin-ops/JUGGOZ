import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sacredGeometryTransform } from './build/sacredGeometryTransform';

export default defineConfig({ plugins: [sacredGeometryTransform(), react()] });