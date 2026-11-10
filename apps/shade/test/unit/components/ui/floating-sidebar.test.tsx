import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { FloatingSidebar } from '../../../../src/components/ui/floating-sidebar';
import {
  FLOATING_SIDEBAR_CLOSED_FOOTPRINT,
  FLOATING_SIDEBAR_DURATION,
  FLOATING_SIDEBAR_EASE,
  FLOATING_SIDEBAR_EASE_DURATION,
  FLOATING_SIDEBAR_SPRING,
  getFloatingSidebarGapWidth,
  getFloatingSidebarTiming,
} from '../../../../src/components/ui/floating-sidebar-metrics';
import { render } from '../../utils/test-utils';

function renderFloatingSidebar(props: Partial<React.ComponentProps<typeof FloatingSidebar>> = {}) {
  return render(
    <FloatingSidebar
      data-testid="floating-sidebar"
      header={<span>My site</span>}
      icon={<span />}
      label="My site"
      pinned={false}
      onPinnedChange={() => {}}
      {...props}
    >
      <a href="#/posts">Posts</a>
    </FloatingSidebar>,
  );
}

const capsuleState = () =>
  document.querySelector('[data-slot=floating-sidebar]')?.getAttribute('data-state');
const trigger = () => screen.getByRole('button', { name: 'My site' });

describe('FloatingSidebar', () => {
  it('opens from the closed circle on click and closes with Escape', () => {
    renderFloatingSidebar();

    expect(capsuleState()).toBe('closed');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(trigger());
    expect(capsuleState()).toBe('open');
    expect(trigger().getAttribute('aria-expanded')).toBe('true');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(capsuleState()).toBe('closed');
  });

  it('only opens on hover once the pointer has been outside it', () => {
    renderFloatingSidebar({ hotZone: false });
    const wrapper = screen.getByTestId('floating-sidebar');

    // Appearing under a resting pointer doesn't open it
    fireEvent.mouseEnter(wrapper);
    expect(capsuleState()).toBe('closed');

    fireEvent.mouseLeave(wrapper);
    fireEvent.mouseEnter(wrapper);
    expect(capsuleState()).toBe('open');
  });

  it('stays open while the pointer moves over it, though its mouseleave misfired', () => {
    vi.useFakeTimers();
    try {
      renderFloatingSidebar({ hotZone: false });
      const wrapper = screen.getByTestId('floating-sidebar');
      fireEvent.mouseLeave(wrapper);
      fireEvent.mouseEnter(wrapper);
      expect(capsuleState()).toBe('open');

      // e.g. as it morphed under the pointer
      fireEvent.mouseLeave(wrapper);
      fireEvent.pointerMove(screen.getByRole('link', { name: 'Posts' }));
      act(() => vi.advanceTimersByTime(1000));
      expect(capsuleState()).toBe('open');

      fireEvent.pointerMove(document.body);
      act(() => vi.advanceTimersByTime(1000));
      expect(capsuleState()).toBe('closed');
    } finally {
      vi.useRealTimers();
    }
  });

  it('unpins with the pin button', () => {
    const onPinnedChange = vi.fn();
    renderFloatingSidebar({ pinned: true, onPinnedChange });

    expect(capsuleState()).toBe('pinned');
    fireEvent.click(screen.getByRole('button', { name: 'Unpin sidebar' }));
    expect(onPinnedChange.mock.calls).toStrictEqual([[false]]);
  });

  it('pins the open panel with the pin button', () => {
    const onPinnedChange = vi.fn();
    renderFloatingSidebar({ onPinnedChange });

    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole('button', { name: 'Pin sidebar' }));
    expect(onPinnedChange.mock.calls).toStrictEqual([[true]]);
  });

  it('hides the pin button while pinning is locked', () => {
    renderFloatingSidebar({ pinned: true, pinLocked: true });

    expect(
      document.querySelector('[data-slot=floating-sidebar-pin]')?.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  it('reports the end of the morph a pin change starts', () => {
    const onPinnedMorphEnd = vi.fn();
    // Without transitions the morph ends at once
    const { rerender } = renderFloatingSidebar({ animate: false, onPinnedMorphEnd });
    expect(onPinnedMorphEnd.mock.calls.length).toBe(0);

    rerender(
      <FloatingSidebar
        animate={false}
        header={<span>My site</span>}
        icon={<span />}
        label="My site"
        pinned
        onPinnedMorphEnd={onPinnedMorphEnd}
      >
        <a href="#/posts">Posts</a>
      </FloatingSidebar>,
    );
    expect(onPinnedMorphEnd.mock.calls).toStrictEqual([[true]]);
  });

  it('keeps the body out of reach while closed', () => {
    renderFloatingSidebar();
    const body = () => document.querySelector<HTMLElement>('[data-slot=floating-sidebar-body]')!;

    expect(body().inert).toBe(true);
    fireEvent.click(trigger());
    expect(body().inert).toBe(false);
  });

  it('offsets the content by its gap only while pinned', () => {
    const gapWidth = () => document.querySelector<HTMLElement>('[data-sidebar=gap]')?.style.width;
    const { rerender } = renderFloatingSidebar({ pinned: true });
    expect(gapWidth()).toBe(`${getFloatingSidebarGapWidth(true)}px`);

    rerender(
      <FloatingSidebar header={<span>My site</span>} icon={<span />} label="My site" pinned={false}>
        <a href="#/posts">Posts</a>
      </FloatingSidebar>,
    );
    expect(gapWidth()).toBe('0px');
  });
});

describe('FloatingSidebar metrics', () => {
  it('sizes the gap from the open width and the inset either side', () => {
    expect(getFloatingSidebarGapWidth(true)).toBe(322);
    expect(getFloatingSidebarGapWidth(true, 300)).toBe(332);
    expect(getFloatingSidebarGapWidth(false)).toBe(0);
    expect(FLOATING_SIDEBAR_CLOSED_FOOTPRINT).toBe(82);
  });

  it('times each morph style', () => {
    expect([
      getFloatingSidebarTiming('bump').duration,
      getFloatingSidebarTiming('bump').easing,
    ]).toStrictEqual([FLOATING_SIDEBAR_DURATION, FLOATING_SIDEBAR_SPRING]);
    expect(getFloatingSidebarTiming()).toStrictEqual(getFloatingSidebarTiming('bump'));
    expect([
      getFloatingSidebarTiming('ease').duration,
      getFloatingSidebarTiming('ease').easing,
    ]).toStrictEqual([FLOATING_SIDEBAR_EASE_DURATION, FLOATING_SIDEBAR_EASE]);
  });
});
