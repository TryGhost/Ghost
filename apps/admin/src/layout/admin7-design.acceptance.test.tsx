import { expect, it } from 'vitest';
import {
  fakeEditorChrome,
  fakeEditorPost,
  fakeMembers,
  renderAdminApp,
} from '@test-utils/acceptance';

// React pages use the current design even with older Core responses or stored flag values.
it.each<{
  name: string;
  route: string;
  labs: Record<string, boolean>;
  enabled: boolean;
}>([
  { name: 'older Core without the flag', route: '/members', labs: {}, enabled: true },
  {
    name: 'stored flag disabled is ignored',
    route: '/members',
    labs: { admin7Pill: false },
    enabled: true,
  },
  {
    name: 'stored flag enabled is ignored',
    route: '/members',
    labs: { admin7Pill: true },
    enabled: true,
  },
  {
    name: 'React editor enabled independently',
    route: '/editor/post/abc123',
    labs: { editorReact: true },
    enabled: true,
  },
])('selects the design by route ownership: $name', async ({ route, labs, enabled }) => {
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
