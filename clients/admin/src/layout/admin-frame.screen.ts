import { page } from 'vitest/browser';

/** The admin7Design frame's top bar: locators for acceptance specs; no assertions. */
export const adminFrameScreen = {
  topBar: () => page.getByTestId('admin-frame-top-bar'),
  places: () => adminFrameScreen.topBar().getByRole('navigation', { name: 'Places' }),
  place: (name: 'Ghost' | 'View site') =>
    adminFrameScreen.places().getByRole('link', { name, exact: true }),
  /** One of the site's numbers on the right: Online, Members or MRR. */
  stat: (label: 'Online' | 'Members' | 'MRR') =>
    adminFrameScreen
      .topBar()
      .getByRole('link')
      .filter({ hasText: new RegExp(label, 'i') }),
};
