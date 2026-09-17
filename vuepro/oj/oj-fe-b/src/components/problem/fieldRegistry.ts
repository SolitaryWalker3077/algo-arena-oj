import { markRaw, type Component } from 'vue'

const renderers = new Map<string, Component>()

/** Register a custom metadata field type without coupling it to the base form component. */
export function registerProblemFieldRenderer(type: string, renderer: Component): void {
  renderers.set(type, markRaw(renderer))
}

/** Resolve a renderer previously registered by a contest or user-module integration. */
export function getProblemFieldRenderer(type: string): Component | undefined {
  return renderers.get(type)
}
