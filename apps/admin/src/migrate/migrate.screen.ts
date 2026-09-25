import { page } from 'vitest/browser';
import { closeMigrateButton, migrateFrame } from '@tryghost/test-data/selectors/migrate';

export const migrateScreen = {
  frame: () => page.getByTitle(migrateFrame, { exact: true }),
  closeButton: () => page.getByRole('button', { name: closeMigrateButton, exact: true }),
};
