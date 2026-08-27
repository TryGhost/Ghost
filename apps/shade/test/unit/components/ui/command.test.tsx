import assert from 'assert/strict';
import { beforeAll, describe, it, vi } from 'vitest';
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

    assert.match(input.className, /text-\(length:--text-control\)/);
    assert.doesNotMatch(input.className, /text-sm/);
    assert.match(item.className, /text-\(length:--text-control\)/);
  });
});
