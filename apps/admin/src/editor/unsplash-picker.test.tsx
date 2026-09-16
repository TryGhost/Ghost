import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UnsplashPicker } from './unsplash-picker';

vi.mock('@tryghost/kg-unsplash-selector', () => ({
  UnsplashSearchModal: ({ onClose }: { onClose: () => void }) => (
    <div>
      Unsplash search
      <button type="button" onClick={onClose}>
        Close search
      </button>
    </div>
  ),
}));

vi.mock('@tryghost/admin-x-framework', () => ({
  useFramework: () => ({ unsplashConfig: null }),
}));

const LABEL = 'Select an image from Unsplash';

/** Whether an Escape raised from `from` is marked as already answered. */
function escapeMarked(from: EventTarget): boolean {
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  from.dispatchEvent(event);
  return event.defaultPrevented;
}

function picker(enabled: boolean) {
  return <UnsplashPicker enabled={enabled} label={LABEL} onSelect={vi.fn()} />;
}

function openSearch() {
  fireEvent.click(screen.getByRole('button', { name: LABEL }));
  return screen.getByText('Unsplash search');
}

/**
 * The Unsplash affordance on an image field. Only the search itself answers
 * Escape, so the pane it opened over keeps its own.
 */
describe('UnsplashPicker', () => {
  it('returns focus to the picker when the search closes', async () => {
    render(picker(true));
    const trigger = screen.getByRole('button', { name: LABEL });
    trigger.focus();
    openSearch();

    const close = screen.getByRole('button', { name: 'Close search' });
    expect(close).toHaveFocus();
    fireEvent.click(close);

    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('marks only the Escape raised inside the open search', () => {
    render(picker(true));

    const search = openSearch();

    expect(escapeMarked(search)).toBe(true);
    // Anything the search does not contain still reaches the pane behind it.
    expect(escapeMarked(window)).toBe(false);
    expect(escapeMarked(document.body)).toBe(false);
  });

  it('closes the search and gives Escape back when the integration goes off', () => {
    const { rerender } = render(picker(true));

    const search = openSearch();

    expect(search).toBeInTheDocument();
    expect(escapeMarked(search)).toBe(true);

    rerender(picker(false));

    expect(screen.queryByText('Unsplash search')).not.toBeInTheDocument();
    expect(escapeMarked(search)).toBe(false);

    rerender(picker(true));

    // The affordance comes back closed rather than reopening what was dismissed.
    expect(screen.queryByText('Unsplash search')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: LABEL })).toBeVisible();
  });
});
