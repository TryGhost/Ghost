import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TagPicker } from './tag-picker';

vi.mock('@tryghost/admin-x-framework/api/tags', () => ({
  useBrowseTags: () => ({
    data: {
      tags: [
        { id: 'news', name: 'News', slug: 'news', visibility: 'public' },
        { id: 'sport', name: 'Sport', slug: 'sport', visibility: 'public' },
      ],
    },
    isFetching: false,
  }),
}));

const scrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');

beforeEach(() => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  if (scrollIntoView) {
    Object.defineProperty(Element.prototype, 'scrollIntoView', scrollIntoView);
  } else {
    Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
  }
});

function renderPicker() {
  const onAdd = vi.fn();
  const onRemove = vi.fn();
  const onSearchChange = vi.fn();
  render(
    <>
      <TagPicker
        inputLabel="Tags"
        selected={[{ id: 'selected', name: 'Selected' }]}
        onAdd={onAdd}
        onRemove={onRemove}
        onSearchChange={onSearchChange}
      />
      <button type="button">Outside</button>
    </>,
  );
  const input = screen.getByRole('combobox');
  fireEvent.click(input);
  return { input, onAdd, onRemove, onSearchChange };
}

describe('TagPicker composition', () => {
  it.each([{ isComposing: true }, { isComposing: false, keyCode: 229 }])(
    'leaves composition keys to the input method: %j',
    (composition) => {
      const { input, onAdd, onRemove } = renderPicker();
      const active = input.getAttribute('aria-activedescendant');

      for (const key of ['Enter', 'ArrowDown', 'ArrowUp', 'Backspace', 'Escape']) {
        expect(fireEvent.keyDown(input, { key, ...composition })).toBe(true);
        expect(onAdd).not.toHaveBeenCalled();
        expect(onRemove).not.toHaveBeenCalled();
        expect(screen.getByRole('listbox')).toBeVisible();
        expect(input).toHaveAttribute('aria-activedescendant', active);
      }

      // A subsequent Enter is an ordinary selection once composition has ended.
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onAdd).toHaveBeenCalledWith({ id: 'news', name: 'News', slug: 'news' });
    },
  );

  it('does not create a typed tag when Enter confirms composition', async () => {
    const { input, onAdd } = renderPicker();
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: '日本' } });
    await waitFor(() =>
      expect(screen.getByRole('option', { name: 'Create “日本”' })).toBeVisible(),
    );

    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });

    expect(onAdd).not.toHaveBeenCalled();
    expect(input).toHaveValue('日本');
  });
});

describe('TagPicker focus', () => {
  it('keeps a search while moving to a chip, then discards it on leaving the picker', () => {
    const { input, onSearchChange } = renderPicker();
    const chip = screen.getByRole('button', { name: 'Remove Selected' });
    fireEvent.change(input, { target: { value: 'Culture' } });
    fireEvent.blur(input, { relatedTarget: chip });
    expect(input).toHaveValue('Culture');
    expect(screen.getByRole('listbox')).toBeVisible();

    fireEvent.blur(chip, { relatedTarget: screen.getByRole('button', { name: 'Outside' }) });
    expect(input).toHaveValue('');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onSearchChange).toHaveBeenLastCalledWith('');
  });
});
