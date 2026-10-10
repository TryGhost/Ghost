import assert from 'assert/strict';
import { describe, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { FloatingSidebar } from '../../../../src/components/ui/floating-sidebar';
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

    assert.equal(capsuleState(), 'closed');
    assert.equal(trigger().getAttribute('aria-expanded'), 'false');

    fireEvent.click(trigger());
    assert.equal(capsuleState(), 'open');
    assert.equal(trigger().getAttribute('aria-expanded'), 'true');

    fireEvent.keyDown(document, { key: 'Escape' });
    assert.equal(capsuleState(), 'closed');
  });

  it('only opens on hover once the pointer has been outside it', () => {
    renderFloatingSidebar({ hotZone: false });
    const wrapper = screen.getByTestId('floating-sidebar');

    // Appearing under a resting pointer doesn't open it
    fireEvent.mouseEnter(wrapper);
    assert.equal(capsuleState(), 'closed');

    fireEvent.mouseLeave(wrapper);
    fireEvent.mouseEnter(wrapper);
    assert.equal(capsuleState(), 'open');
  });

  it('stays open while the pointer moves over it, though its mouseleave misfired', () => {
    vi.useFakeTimers();
    try {
      renderFloatingSidebar({ hotZone: false });
      const wrapper = screen.getByTestId('floating-sidebar');
      fireEvent.mouseLeave(wrapper);
      fireEvent.mouseEnter(wrapper);
      assert.equal(capsuleState(), 'open');

      // e.g. as it morphed under the pointer
      fireEvent.mouseLeave(wrapper);
      fireEvent.pointerMove(screen.getByRole('link', { name: 'Posts' }));
      act(() => vi.advanceTimersByTime(1000));
      assert.equal(capsuleState(), 'open');

      fireEvent.pointerMove(document.body);
      act(() => vi.advanceTimersByTime(1000));
      assert.equal(capsuleState(), 'closed');
    } finally {
      vi.useRealTimers();
    }
  });

  it('unpins with the pin button', () => {
    const onPinnedChange = vi.fn();
    renderFloatingSidebar({ pinned: true, onPinnedChange });

    assert.equal(capsuleState(), 'pinned');
    fireEvent.click(screen.getByRole('button', { name: 'Unpin sidebar' }));
    assert.deepEqual(onPinnedChange.mock.calls, [[false]]);
  });

  it('pins the open panel with the pin button', () => {
    const onPinnedChange = vi.fn();
    renderFloatingSidebar({ onPinnedChange });

    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole('button', { name: 'Pin sidebar' }));
    assert.deepEqual(onPinnedChange.mock.calls, [[true]]);
  });

  it('hides the pin button while pinning is locked', () => {
    renderFloatingSidebar({ pinned: true, pinLocked: true });

    assert.equal(
      document.querySelector('[data-slot=floating-sidebar-pin]')?.getAttribute('aria-hidden'),
      'true',
    );
  });

  it('reports the end of the morph a pin change starts', () => {
    const onPinnedMorphEnd = vi.fn();
    // Without transitions the morph ends at once
    const { rerender } = renderFloatingSidebar({ animate: false, onPinnedMorphEnd });
    assert.equal(onPinnedMorphEnd.mock.calls.length, 0);

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
    assert.deepEqual(onPinnedMorphEnd.mock.calls, [[true]]);
  });

  it('keeps the body out of reach while closed', () => {
    renderFloatingSidebar();
    const body = () => document.querySelector<HTMLElement>('[data-slot=floating-sidebar-body]')!;

    assert.equal(body().inert, true);
    fireEvent.click(trigger());
    assert.equal(body().inert, false);
  });
});
