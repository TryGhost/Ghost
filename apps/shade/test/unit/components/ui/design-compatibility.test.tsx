import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ShadeApp } from '../../../../src/app';
import { ToggleGroup, ToggleGroupItem } from '../../../../src/components/ui/toggle-group';
import { dropzoneVariants } from '../../../../src/components/ui/dropzone';
import { Button } from '../../../../src/components/ui/button';
import { InputGroup, InputGroupInput } from '../../../../src/components/ui/input-group';
import { Select, SelectTrigger, SelectValue } from '../../../../src/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../src/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../src/components/ui/tooltip';

function Controls() {
  return (
    <>
      <Button variant="secondary">Secondary</Button>
      <Button shape="rounded" variant="ghost">
        Rounded override
      </Button>
      <Button variant="subtle">Subtle</Button>
      <InputGroup>
        <InputGroupInput aria-label="Search" />
      </InputGroup>
      <Select>
        <SelectTrigger aria-label="Range">
          <SelectValue placeholder="All time" />
        </SelectTrigger>
      </Select>
    </>
  );
}

describe('Shade design compatibility', () => {
  it('preserves the previous toggle group radius and button recipe defaults', () => {
    render(
      <ShadeApp darkMode={false} isAdmin7Design={false}>
        <ToggleGroup aria-label="View" type="single">
          <ToggleGroupItem value="list">List</ToggleGroupItem>
        </ToggleGroup>
      </ShadeApp>,
    );
    expect(screen.getByRole('radiogroup', { name: 'View' }).className).toContain(
      'rounded-(--input-group-radius)',
    );
    expect(screen.getByRole('radio').className).toContain('h-[calc(var(--control-height)-2px)]');
    expect(screen.getByRole('radio').className).not.toContain(
      'h-[calc(var(--control-height)-4px)]',
    );
    expect(dropzoneVariants({ variant: 'buttonSecondary' }, false)).toContain('bg-secondary');
    expect(dropzoneVariants({ variant: 'buttonSecondary' })).toContain('bg-tab-active');
  });

  it('uses the current design without local opt-ins', () => {
    render(<Controls />);
    expect(screen.getByRole('button', { name: 'Secondary' }).className).toContain('rounded-full');
    expect(screen.getByRole('button', { name: 'Secondary' }).className).toContain('bg-tab-active');
    expect(screen.getByRole('button', { name: 'Rounded override' }).className).toContain(
      'rounded-control',
    );
    expect(screen.getByRole('button', { name: 'Rounded override' }).className).toContain(
      'enabled:aria-expanded:shadow-control-pressed',
    );
    expect(screen.getByRole('button', { name: 'Subtle' }).className).toContain('hover:bg-accent');
    expect(screen.getByRole('textbox').parentElement?.className).toContain('rounded-full');
    expect(screen.getByRole('combobox').getAttribute('data-control-shape')).toBe('pill');
  });

  it('restores old appearance and interactions at one previous boundary', () => {
    render(
      <ShadeApp darkMode={false} isAdmin7Design={false}>
        <Controls />
      </ShadeApp>,
    );
    const secondary = screen.getByRole('button', { name: 'Secondary' });
    expect(secondary.className).toContain('rounded-control');
    expect(secondary.className).toContain('bg-secondary');
    expect(secondary.className).toContain('hover:bg-secondary/80');
    expect(secondary.className).not.toContain('bg-tab-active');
    expect(secondary.className).not.toContain('shadow-control-pressed');
    expect(screen.getByRole('button', { name: 'Subtle' }).className).toContain(
      'border-control-border',
    );
    expect(screen.getByRole('textbox').parentElement?.className).toContain('rounded-control');
    expect(screen.getByRole('combobox').getAttribute('data-control-shape')).toBe('rounded');
  });

  it('gives portaled overlays their nearest design scope without modifying body', () => {
    render(
      <ShadeApp darkMode={false}>
        <Popover open>
          <PopoverTrigger>Current menu</PopoverTrigger>
          <PopoverContent>Current content</PopoverContent>
        </Popover>
        <ShadeApp darkMode={false} isAdmin7Design={false}>
          <Popover open>
            <PopoverTrigger>Previous menu</PopoverTrigger>
            <PopoverContent>Previous content</PopoverContent>
          </Popover>
        </ShadeApp>
      </ShadeApp>,
    );
    expect(
      screen.getByText('Current content').closest('.shade')?.getAttribute('data-admin7-design'),
    ).toBe('true');
    expect(
      screen.getByText('Previous content').closest('.shade')?.getAttribute('data-admin7-design'),
    ).toBe('false');
    expect(document.body.hasAttribute('data-admin7-design')).toBe(false);
    expect(document.body.style.getPropertyValue('--radius-control')).toBe('');
  });

  it.each([true, false])(
    'preserves tooltip focus semantics with isAdmin7Design=%s',
    async (isAdmin7Design) => {
      render(
        <ShadeApp darkMode={false} isAdmin7Design={isAdmin7Design}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button>Menu</Button>
            </TooltipTrigger>
            <TooltipContent>Menu help</TooltipContent>
          </Tooltip>
        </ShadeApp>,
      );
      const button = screen.getByRole('button', { name: 'Menu' });
      // An option elsewhere in a menu was chosen with the pointer; Radix then
      // restores focus to its trigger. This must not open current tooltips.
      fireEvent.pointerDown(document.body);
      fireEvent.focus(button);
      if (isAdmin7Design) {
        expect(screen.queryByRole('tooltip')).toBeNull();
        fireEvent.blur(button);
        fireEvent.keyDown(document.body, { key: 'Tab' });
        fireEvent.focus(button);
      }
      await waitFor(() => expect(screen.getByRole('tooltip')).toBeTruthy());
      expect(
        screen.getByRole('tooltip').closest('.shade')?.getAttribute('data-admin7-design'),
      ).toBe(String(isAdmin7Design));
    },
  );
});
