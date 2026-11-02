import { expect, it } from 'vitest';
import {
  fakeAdminStats,
  fakeEditorChrome,
  fakeEditorPost,
  fakeMembers,
  renderAdminApp,
} from '@test-utils/acceptance';

it.each<{
  name: string;
  route: string;
  admin7Design: boolean;
}>([
  { name: 'members list', route: '/members', admin7Design: true },
  { name: 'members list', route: '/members', admin7Design: false },
  { name: 'editor', route: '/editor/post/abc123', admin7Design: true },
  { name: 'editor', route: '/editor/post/abc123', admin7Design: false },
])(
  'passes the admin7Design flag to Shade: $name, admin7Design $admin7Design',
  async ({ route, admin7Design }) => {
    fakeMembers([]);
    if (admin7Design) {
      // The Admin 7 frame's top bar shows the site's numbers.
      fakeAdminStats.memberCount();
      fakeAdminStats.mrr();
    }
    if (route.startsWith('/editor/')) {
      fakeEditorChrome();
      fakeEditorPost();
    }
    await renderAdminApp(route, { labs: { admin7Design } });

    await expect
      .poll(() =>
        document.querySelector('[data-react-admin-mounted]')?.getAttribute('data-admin7-design'),
      )
      .toBe(String(admin7Design));
  },
);
