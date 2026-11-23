import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Filters } from '@/components/patterns/filters';
import ShadeApp from '@/shade-app';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it.each([
  { enabled: false, width: 390, sheet: false },
  { enabled: true, width: 390, sheet: true },
  { enabled: true, width: 1023, sheet: true },
  { enabled: true, width: 1024, sheet: false },
])(
  'uses the expected filter presentation at $width with flag $enabled',
  ({ enabled, width, sheet }) => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: width < 1024,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    render(
      <ShadeApp admin7Mobile={enabled} darkMode={false}>
        <Filters
          addButtonText="Add filter"
          fields={[{ key: 'name', label: 'Name', type: 'text' }]}
          filters={[]}
          onChange={() => {}}
        />
      </ShadeApp>,
    );
    expect(screen.queryByRole('button', { name: 'Filters' }) !== null).toBe(sheet);
    expect(screen.queryByRole('button', { name: 'Add filter' }) !== null).toBe(!sheet);
  },
);
