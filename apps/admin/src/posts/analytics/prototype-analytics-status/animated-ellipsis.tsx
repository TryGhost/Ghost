// PROTOTYPE ONLY — not production code. See ./README.md
//
// Used by the two treatments that name the preparing state, so the sentence
// reads as ongoing without either of them owning a timer.

import React, { useEffect, useState } from 'react';

/**
 * A cycling ellipsis: "." then ".." then "..." then nothing, then round again.
 * The empty beat is what makes it read as a loop rather than a stutter.
 *
 * All three dots always occupy space and only their opacity changes, so the
 * label never changes width and nothing beside it twitches. Only the ellipsis
 * moves — animating the whole word made it feel uncertain, when the only
 * uncertainty is when it finishes.
 */
const AnimatedEllipsis: React.FC = () => {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [visibleDots, setVisibleDots] = useState(1);

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }
    const id = setInterval(() => setVisibleDots((count) => (count + 1) % 4), 400);
    return () => clearInterval(id);
  }, [prefersReducedMotion]);

  return (
    <span aria-hidden="true" className="inline-flex">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={`transition-opacity duration-200 ${
            prefersReducedMotion || index < visibleDots ? 'opacity-100' : 'opacity-0'
          }`}
        >
          .
        </span>
      ))}
    </span>
  );
};

export default AnimatedEllipsis;
