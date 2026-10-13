import type { RefObject } from 'react';
import { Button } from '@tryghost/shade/components';

/**
 * The shell's first tab stop: hidden until focused, it moves focus to the
 * main content. A button, as a fragment link would change the admin's hash route.
 */
export function SkipLink({ target }: { target: RefObject<HTMLElement | null> }) {
  const skip = () => {
    const main = target.current;
    if (!main) {
      return;
    }
    // Focusable only until focus moves on, so clicks inside still focus what they hit.
    main.tabIndex = -1;
    main.addEventListener('blur', () => main.removeAttribute('tabindex'), { once: true });
    main.focus();
  };

  return (
    <Button className="fixed top-3 left-3 z-50 not-focus:sr-only" onClick={skip}>
      Skip to main content
    </Button>
  );
}
