import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { toast } from 'sonner';
import { fakeAdminEndpoint, fakeTags, renderAdminApp } from '@test-utils/acceptance';
import { sidebarScreen } from '@/layout/sidebar.screen';
import { tagsScreen } from '@/tags/tags.screen';

let lateToastPublishedAfterUnmount = false;

// This pair verifies cleanup across afterEach, so setup must precede the next-app check.
describe('Acceptance toast isolation', { shuffle: false, concurrent: false }, () => {
  it('leaves a persistent error toast for the harness to clean up', async () => {
    fakeTags([]);
    await renderAdminApp('/tags');
    await expect.element(page.getByRole('region', { name: 'Notifications' })).toBeInTheDocument();
    // The region mounts before Sonner subscribes; wait for the loaded screen before publishing.
    await expect.element(tagsScreen.emptyStateHeading()).toBeVisible();

    toast.error("Couldn't sign out. Please try again.", {
      id: 'acceptance-toast',
      duration: Infinity,
    });

    await expect
      .element(sidebarScreen.errorToast())
      .toHaveTextContent("Couldn't sign out. Please try again.");

    // A save continuation can publish after the app unmounts, while the
    // harness is draining requests. It must be cleared alongside live toasts.
    fakeAdminEndpoint('GET', '/toast-isolation/', async () => {
      await new Promise<void>((resolve) => {
        const mounted = () => document.querySelector('[data-react-admin-mounted]');
        if (!mounted()) {
          resolve();
          return;
        }
        const observer = new MutationObserver(() => {
          if (!mounted()) {
            observer.disconnect();
            resolve();
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      });
      return {};
    });
    void fetch('/ghost/api/admin/toast-isolation/').then(() => {
      lateToastPublishedAfterUnmount = !document.querySelector('[data-react-admin-mounted]');
      toast.error('A late error', { id: 'late-acceptance-toast', duration: Infinity });
    });
  });

  it('starts the next app without active toasts and opens its user menu', async () => {
    expect(lateToastPublishedAfterUnmount).toBe(true);
    expect(toast.getToasts()).toHaveLength(0);
    await renderAdminApp('/site');

    await sidebarScreen.userMenuTrigger().click();

    await expect.element(sidebarScreen.appearanceMenuItem()).toBeVisible();
    await expect(
      page.getByRole('region', { name: 'Notifications' }).getByRole('listitem'),
    ).toHaveCount(0);

    toast.error('A new error', { id: 'acceptance-toast', duration: Infinity });
    await expect.element(sidebarScreen.errorToast()).toHaveTextContent('A new error');
  });
});
