import React, { useRef } from 'react';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useToasterInset } from './use-toaster-inset';

// Pins the half of the toast-offset mechanism we own: that a rule is written, that it
// carries the MEASURED left edge rather than a constant, and that it's cleaned up.
//
// It can't prove sonner then honours it — jsdom has no layout and no sonner container
// — so the rule's shape is the contract being fixed here. If toasts ever stop moving,
// this test passing narrows it to the selector or to specificity rather than to the
// hook.

const RULE = "[data-sonner-toaster][data-x-position='left']";

const findRule = (): string | undefined =>
  Array.from(document.head.querySelectorAll<HTMLStyleElement>('style[data-proto-toaster-inset]'))
    .map((style) => style.textContent ?? '')
    .find((text) => text.includes(RULE));

// jsdom lays nothing out, so every rect is zeroes. Stub the one measurement the hook
// takes, which is also the one thing worth asserting about.
const Harness: React.FC<{ left: number }> = ({ left }) => {
  // useRef<T | null> rather than useRef<T>(null): the second is React's read-only
  // "managed by JSX" form, and this ref is assigned by hand.
  const ref = useRef<HTMLDivElement | null>(null);
  const attach = (node: HTMLDivElement | null) => {
    if (node) {
      node.getBoundingClientRect = () => ({ left }) as DOMRect;
    }
    ref.current = node;
  };
  useToasterInset(ref);
  return <div ref={attach} />;
};

describe('useToasterInset', () => {
  afterEach(() => {
    document.head.querySelectorAll('style[data-proto-toaster-inset]').forEach((el) => el.remove());
  });

  it('offsets the toaster to the measured element plus the standard gutter', () => {
    render(<Harness left={480} />);
    expect(findRule()).toContain('left:504px!important');
  });

  it('follows the element rather than assuming a pane width', () => {
    render(<Harness left={0} />);
    expect(findRule()).toContain('left:24px!important');
  });

  it('overrides the narrow-viewport rule too, which sonner switches to under 600px', () => {
    render(<Harness left={480} />);
    expect(findRule()).toContain('@media (max-width:600px)');
  });

  it('takes its rule away with it, so other screens keep the app default', () => {
    const { unmount } = render(<Harness left={480} />);
    expect(findRule()).toBeDefined();
    unmount();
    expect(findRule()).toBeUndefined();
  });
});
