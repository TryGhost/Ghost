import { expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShadeApp } from '../../../../src/app';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../src/components/ui/popover';

it('keeps each portaled menu in its owning design scope without changing the document', () => {
  render(
    <ShadeApp darkMode={false}>
      <Popover open>
        <PopoverTrigger>Admin 7 menu</PopoverTrigger>
        <PopoverContent>Admin 7 content</PopoverContent>
      </Popover>
      <ShadeApp darkMode={false} isAdmin7Pill={false}>
        <Popover open>
          <PopoverTrigger>Previous menu</PopoverTrigger>
          <PopoverContent>Previous content</PopoverContent>
        </Popover>
      </ShadeApp>
    </ShadeApp>,
  );

  expect(
    screen.getByText('Admin 7 content').closest('.shade')?.getAttribute('data-admin7-pill'),
  ).toBe('true');
  expect(
    screen.getByText('Previous content').closest('.shade')?.getAttribute('data-admin7-pill'),
  ).toBe('false');
  expect(document.body.hasAttribute('data-admin7-pill')).toBe(false);
});
