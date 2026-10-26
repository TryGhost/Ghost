import type { CSSProperties } from 'react';

/** Rises and fades in; under reduced motion it's simply there. */
export const REVEAL_CLASS_NAME =
  'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-both motion-safe:duration-500 motion-safe:ease-out';

const STAGGER = 90;

/** Delays a block's reveal by its place in the order things appear. */
export function revealAt(step: number): CSSProperties {
  return { animationDelay: `${step * STAGGER}ms` };
}
