import { expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShadeApp, useShade } from '../../../../src/app';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../src/components/ui/popover';

function FlagState() {
  const { admin7Design, admin7Mobile } = useShade();
  return <span>{`design:${admin7Design} mobile:${admin7Mobile}`}</span>;
}

it.each([false, true])(
  'keeps independent design/mobile flags in their owning portal scopes (mobile: %s)',
  (admin7Mobile) => {
    render(
      <ShadeApp admin7Mobile={admin7Mobile} darkMode={false}>
        <Popover open>
          <PopoverTrigger>Admin 7 menu</PopoverTrigger>
          <PopoverContent>
            <FlagState />
          </PopoverContent>
        </Popover>
        <ShadeApp admin7Design={false} darkMode={false}>
          <Popover open>
            <PopoverTrigger>Previous menu</PopoverTrigger>
            <PopoverContent>
              <FlagState />
            </PopoverContent>
          </Popover>
        </ShadeApp>
      </ShadeApp>,
    );

    const outer = screen.getByText(`design:true mobile:${admin7Mobile}`).closest('.shade');
    const inner = screen.getByText('design:false mobile:false').closest('.shade');
    expect(outer?.getAttribute('data-admin7-design')).toBe('true');
    expect(outer?.getAttribute('data-admin7-mobile')).toBe(String(admin7Mobile));
    expect(inner?.getAttribute('data-admin7-design')).toBe('false');
    expect(inner?.getAttribute('data-admin7-mobile')).toBe('false');
    expect(document.body.hasAttribute('data-admin7-design')).toBe(false);
    expect(document.body.hasAttribute('data-admin7-mobile')).toBe(false);
  },
);
