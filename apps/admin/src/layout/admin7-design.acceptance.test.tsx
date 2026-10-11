import { expect, it } from 'vitest';
import {
  fakeEditorChrome,
  fakeEditorPost,
  fakeMembers,
  renderAdminApp,
} from '@test-utils/acceptance';

it.each<{
  name: string;
  route: string;
  enabled: boolean;
}>([
  { name: 'members list', route: '/members', enabled: true },
  { name: 'editor', route: '/editor/post/abc123', enabled: true },
])('uses the current design on every route: $name', async ({ route, enabled }) => {
  fakeMembers([]);
  if (route.startsWith('/editor/')) {
    fakeEditorChrome();
    fakeEditorPost();
  }
  await renderAdminApp(route);

  await expect
    .poll(() => document.querySelector('[data-react-admin-mounted]')?.getAttribute('data-admin7'))
    .toBe(String(enabled));
});
