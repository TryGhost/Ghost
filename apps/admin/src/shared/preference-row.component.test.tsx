import { describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { page, userEvent } from 'vitest/browser';
import { renderInApp } from '@test-utils/acceptance';
import {
  SettingAction,
  SettingDescription,
  SettingHeader,
  SettingItem,
  SettingTitle,
} from '../../../activitypub/src/views/preferences/components/settings';

describe.each([false, true])('preference row with admin7Design=%s', (admin7Design) => {
  it('activates its callback from the title, description and chevron', async () => {
    const navigate = vi.fn();
    const router = createMemoryRouter([
      {
        path: '/',
        element: (
          <SettingItem withHover onClick={navigate}>
            <SettingHeader>
              <SettingTitle>Bluesky sharing</SettingTitle>
              <SettingDescription>Share content directly on Bluesky</SettingDescription>
            </SettingHeader>
            <SettingAction>
              <svg aria-label="Open sharing settings" height="20" viewBox="0 0 20 20" width="20">
                <path d="m8 5 5 5-5 5" />
              </svg>
            </SettingAction>
          </SettingItem>
        ),
      },
    ]);
    await renderInApp(<RouterProvider router={router} />, { admin7Design });

    await page.getByText('Bluesky sharing', { exact: true }).click();
    await page.getByText('Share content directly on Bluesky', { exact: true }).click();
    await page.getByLabelText('Open sharing settings').click();
    expect(navigate).toHaveBeenCalledTimes(3);

    const action = page.getByRole('button', { name: /Bluesky sharing/ });
    action.element().focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(navigate).toHaveBeenCalledTimes(admin7Design ? 5 : 3);
  });
});
