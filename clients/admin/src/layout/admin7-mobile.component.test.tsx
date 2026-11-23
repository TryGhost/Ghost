import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { renderInApp } from '@test-utils/acceptance';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useShade } from '@tryghost/shade/app';
import { Popover, PopoverContent, PopoverTrigger } from '@tryghost/shade/components';

function FlagState() {
  const flag = useFeatureFlag('admin7Mobile');
  const { admin7Mobile } = useShade();
  return <span>{`flag:${flag} shade:${admin7Mobile}`}</span>;
}

it.each([undefined, false, true])(
  'passes the mobile flag through component tests and portals: %s',
  async (enabled) => {
    await renderInApp(
      <Popover open>
        <PopoverTrigger>Preview</PopoverTrigger>
        <PopoverContent>
          <FlagState />
        </PopoverContent>
      </Popover>,
      enabled === undefined ? undefined : { labs: { admin7Mobile: enabled } },
    );
    const state = page.getByText(`flag:${enabled ?? false} shade:${enabled ?? false}`);
    await expect.element(state).toBeVisible();
    expect(state.element().closest('.shade')?.getAttribute('data-admin7-mobile')).toBe(
      String(enabled ?? false),
    );
  },
);
