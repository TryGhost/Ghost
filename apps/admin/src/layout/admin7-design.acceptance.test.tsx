import { expect, it } from 'vitest';
import {
  fakeEditorChrome,
  fakeEditorPost,
  fakeMembers,
  renderAdminApp,
} from '@test-utils/acceptance';

// React pages use the current design.
// Ember-owned routes retain the compatibility appearance.
it.each<{
  name: string;
  route: string;
  labs: Record<string, boolean>;
  enabled: boolean;
}>([
  { name: 'React route', route: '/members', labs: {}, enabled: true },
  { name: 'Ember route excluded', route: '/pro/plans', labs: {}, enabled: false },
  {
    name: 'Ember editor excluded',
    route: '/editor/post/new',
    labs: {},
    enabled: false,
  },
  {
    name: 'Ember editor excluded with React editor flag disabled',
    route: '/editor/post/new',
    labs: { editorReact: false },
    enabled: false,
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
