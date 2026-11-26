/** Ghost's one application. Creating it reads what the providers list and loads nothing. */
import { createApplication } from '#foundation/application';
import providers from './providers';
import { site } from './site';

export const application = createApplication({ providers });

let stopListening: (() => void) | undefined;

/** Subscribes the listed listeners. Each boot in this process calls it, so it subscribes once. */
export function start(): void {
  stopListening ??= application.listen(site);
}

export function stop(): void {
  stopListening?.();
  stopListening = undefined;
}
