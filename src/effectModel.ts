import type { EffectControls } from './effects';

export type EffectTypeId = 'motion-trails';

export type EffectFrame = {
  now: number;
  output: CanvasRenderingContext2D;
  mask: CanvasImageSource;
  displayWidth: number;
  displayHeight: number;
  controls: EffectControls;
};

export type EffectRenderer = {
  resize: (width: number, height: number) => void;
  reset: () => void;
  render: (frame: EffectFrame) => void;
};
