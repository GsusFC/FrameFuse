import type { TransitionPlugin } from './TransitionPlugin';

const registry = new Map<string, TransitionPlugin>();

export function registerTransition(plugin: TransitionPlugin): void {
  registry.set(plugin.id, plugin);
}

export function listTransitions(): TransitionPlugin[] {
  return Array.from(registry.values());
}

export function getTransition(id: string): TransitionPlugin | undefined {
  return registry.get(id);
}


