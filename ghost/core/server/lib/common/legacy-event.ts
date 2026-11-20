/**
 * Transitional. Names an event of the legacy bus (`./events`) in the
 * `listeners` of a service definition. Ghost's event bus sends a listener for
 * one of these to the legacy bus. It goes when nothing publishes on that bus.
 */
export function legacyEvent(name: string) {
  return { name, legacy: true } as const;
}

export function isLegacyEvent(event: { readonly name: string }): boolean {
  return 'legacy' in event && event.legacy === true;
}
