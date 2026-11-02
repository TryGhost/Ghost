import { beforeAll, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';

import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../../../../src/components/ui/command';
import { render } from '../../utils/test-utils';

describe('Command Components', () => {
  beforeAll(() => {
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('uses matching control typography for search and results', () => {
    render(
      <Command>
        <CommandInput data-testid="command-input" />
        <CommandList>
          <CommandGroup>
            <CommandItem data-testid="command-item">Result</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>,
    );

    const input = screen.getByTestId('command-input');
    const item = screen.getByTestId('command-item');

    expect(input.className).toMatch(/text-\(length:--text-control\)/);
    expect(input.className).not.toMatch(/text-sm/);
    expect(item.className).toMatch(/text-\(length:--text-control\)/);
  });
});
