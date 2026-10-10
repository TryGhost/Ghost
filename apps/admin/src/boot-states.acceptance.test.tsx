import { beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';

import { currentUserResponse, fakeTags, renderAdminApp } from '@test-utils/acceptance';
import { reloadAdmin } from '@/auth/reload';
import { sidebarScreen } from '@/layout/sidebar.screen';

vi.mock('@/auth/reload', () => ({ reloadAdmin: vi.fn() }));

const bootLoader = () => page.getByRole('status', { name: 'Loading Ghost Admin' });
const bootError = () => page.getByRole('alert');

/** Boots with `GET /users/me/` held until the spec releases it. */
function holdCurrentUser() {
  let release = () => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const browseMe = {
    response: async () => {
      await released;
      return currentUserResponse();
    },
  };
  return { boot: { browseMe }, release };
}

describe('Admin boot', () => {
  beforeEach(() => {
    vi.mocked(reloadAdmin).mockClear();
  });

  it('shows its own loader until the signed-in user loads', async () => {
    fakeTags([]);
    const me = holdCurrentUser();
    await renderAdminApp('/tags', { boot: me.boot });

    await expect.element(bootLoader()).toBeVisible();

    me.release();

    await expect.element(sidebarScreen.shellNav()).toBeVisible();
    await expect(bootLoader()).toHaveCount(0);
  });

  it('shows why the signed-in user could not be read, and reloads on retry', async () => {
    await renderAdminApp('/tags?tab=internal', {
      boot: {
        browseMe: {
          response: {
            errors: [
              {
                type: 'InternalServerError',
                message: 'An unexpected error occurred, please try again.',
                context: 'The database is unavailable.',
              },
            ],
          },
          responseStatus: 500,
        },
      },
    });

    await expect.element(bootError()).toHaveTextContent('The database is unavailable.');
    await expect(bootLoader()).toHaveCount(0);

    await bootError().getByRole('button', { name: 'Retry' }).click();

    expect(vi.mocked(reloadAdmin).mock.calls).toEqual([['/tags?tab=internal']]);
  });
});
