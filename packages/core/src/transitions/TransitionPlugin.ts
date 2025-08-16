export type TransitionContext = {
  fps: number;
  width: number;
  height: number;
};

export interface TransitionPlugin {
  id: string;
  name: string;
  // devuelve frames de transición entre A y B (como índices relativos o un descriptor agnóstico)
  generateFrames: (context: TransitionContext) => unknown[];
}


