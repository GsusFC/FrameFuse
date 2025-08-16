export type TransitionContext = {
    fps: number;
    width: number;
    height: number;
};
export interface TransitionPlugin {
    id: string;
    name: string;
    generateFrames: (context: TransitionContext) => unknown[];
}
//# sourceMappingURL=TransitionPlugin.d.ts.map