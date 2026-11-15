import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useRevealOnMount } from './use-reveal-on-mount';

const FADE_MS = 150;

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export interface FadingTextProps {
  show: boolean;
  /** Keeps the text for screen readers while it is hidden, instead of unmounting it. */
  keepForScreenReaders?: boolean;
  children: ReactNode;
}

/** Inline text that fades in when shown and fades out before it unmounts. */
export function FadingText({ show, keepForScreenReaders = false, children }: FadingTextProps) {
  const [mounted, setMounted] = useState(show);
  const element = useRef<HTMLSpanElement | null>(null);
  const reveal = useRevealOnMount<HTMLSpanElement>(true, FADE_MS);

  const ref = useCallback(
    (node: HTMLSpanElement | null) => {
      element.current = node;
      reveal(node);
    },
    [reveal],
  );

  useEffect(() => {
    if (show) {
      setMounted(true);
      return;
    }
    const node = element.current;
    if (!node || typeof node.animate !== 'function' || prefersReducedMotion()) {
      setMounted(false);
      return;
    }
    const fade = node.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: FADE_MS,
      easing: 'ease-in-out',
      fill: 'forwards',
    });
    fade.onfinish = () => setMounted(false);
    return () => fade.cancel();
  }, [show]);

  if (mounted) {
    return <span ref={ref}>{children}</span>;
  }
  return keepForScreenReaders ? <span className="sr-only">{children}</span> : null;
}
