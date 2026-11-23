import type { RefObject } from 'react';
import { Button } from '@tryghost/shade/components';
import { focusMain } from './focus-main';

/**
 * The shell's first tab stop: hidden until focused, it moves focus to the
 * main content. A button, as a fragment link would change the admin's hash route.
 */
export function SkipLink({ target }: { target: RefObject<HTMLElement | null> }) {
  const skip = () => {
    if (target.current) {
      focusMain(target.current);
    }
  };

  return (
    <Button className="fixed top-3 left-3 z-50 not-focus:sr-only" onClick={skip}>
      Skip to main content
    </Button>
  );
}
