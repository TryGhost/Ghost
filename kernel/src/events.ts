/**
 * What code is handed when it publishes or listens to events. A type only.
 * Events are keyed by the name of their class.
 *
 * @see [Foundation types](../README.md#foundation-types)
 */
export interface EventBus {
  subscribe(event: { readonly name: string }, handler: (event: unknown) => unknown): void;
  dispatch(event: object): void;
}
