import { expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShadeApp, useShade } from '../../../../src/app';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../src/components/ui/popover';

function MobileState() {
  const { admin7Mobile } = useShade();
  return <span>{admin7Mobile ? 'Mobile enabled' : 'Mobile disabled'}</span>;
}

it('keeps mobile hardening opt-in and carries each owning scope into portals', () => {
  render(
    <ShadeApp admin7Design={false} darkMode={false} admin7Mobile>
      <Popover open>
        <PopoverTrigger>Preview</PopoverTrigger>
        <PopoverContent>
          <MobileState />
        </PopoverContent>
      </Popover>
      <ShadeApp darkMode={false}>
        <Popover open>
          <PopoverTrigger>Standalone</PopoverTrigger>
          <PopoverContent>
            <MobileState />
          </PopoverContent>
        </Popover>
      </ShadeApp>
    </ShadeApp>,
  );

  const enabled = screen.getByText('Mobile enabled').closest('.shade');
  const disabled = screen.getByText('Mobile disabled').closest('.shade');
  expect(enabled?.getAttribute('data-admin7-mobile')).toBe('true');
  expect(enabled?.getAttribute('data-admin7-design')).toBe('false');
  expect(disabled?.getAttribute('data-admin7-mobile')).toBe('false');
  expect(disabled?.getAttribute('data-admin7-design')).toBe('true');
  expect(document.body.hasAttribute('data-admin7-mobile')).toBe(false);
});
