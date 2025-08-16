const registry = new Map();
export function registerTransition(plugin) {
    registry.set(plugin.id, plugin);
}
export function listTransitions() {
    return Array.from(registry.values());
}
export function getTransition(id) {
    return registry.get(id);
}
//# sourceMappingURL=registry.js.map