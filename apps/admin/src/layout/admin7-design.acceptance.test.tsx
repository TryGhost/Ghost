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
  labs: Record<string, boolean>;
  enabled: boolean;
}>([
  { name: 'members list', route: '/members', labs: {}, enabled: true },
  {
    name: 'editor',
    route: '/editor/post/abc123',
    labs: { editorReact: true },
    enabled: true,
  },
])('uses the current design on every route: $name', async ({ route, labs, enabled }) => {
  fakeMembers([]);
  if (labs.editorReact) {
    fakeEditorChrome();
    fakeEditorPost();
  }
  await renderAdminApp(route, { labs });

  await expect
    .poll(() => document.querySelector('[data-react-admin-mounted]')?.getAttribute('data-admin7'))
    .toBe(String(enabled));
});
