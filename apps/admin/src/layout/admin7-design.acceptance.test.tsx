import { expect, it } from 'vitest';
import {
  fakeEditorChrome,
  fakeEditorPost,
  fakeMembers,
  renderAdminApp,
} from '@test-utils/acceptance';

// Protect the rollout boundary without prescribing the experimental appearance.
it.each<{
  name: string;
  route: string;
  labs: Record<string, boolean>;
  enabled: boolean;
}>([
  { name: 'flag absent', route: '/members', labs: {}, enabled: false },
  { name: 'flag disabled', route: '/members', labs: { admin7Pill: false }, enabled: false },
  { name: 'flag enabled', route: '/members', labs: { admin7Pill: true }, enabled: true },
  { name: 'Ember route excluded', route: '/site', labs: { admin7Pill: true }, enabled: false },
  {
    name: 'Ember editor excluded',
    route: '/editor/post/new',
    labs: { admin7Pill: true },
    enabled: false,
  },
  {
    name: 'Ember editor excluded with React editor flag disabled',
    route: '/editor/post/new',
    labs: { admin7Pill: true, editorReact: false },
    enabled: false,
  },
  {
    name: 'React editor with pill flag disabled',
    route: '/editor/post/abc123',
    labs: { admin7Pill: false, editorReact: true },
    enabled: false,
  },
  {
    name: 'React editor with pill flag enabled',
    route: '/editor/post/abc123',
    labs: { admin7Pill: true, editorReact: true },
    enabled: true,
  },
])('selects the Admin 7 design only when allowed: $name', async ({ route, labs, enabled }) => {
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
