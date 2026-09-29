import { page, type Locator } from 'vitest/browser';
import {
  localRevisionsTable,
  noLocalRevisionsText,
  openRestoredPostLink,
  restoreHeading,
  restoreRevisionButton,
} from '@tryghost/test-data/selectors/restore';

/** A revision row locator augmented with factories for the row's parts. */
export type RevisionRowScope = Locator & {
  restoreButton(): Locator;
  openLink(): Locator;
};

function rowScope(row: Locator): RevisionRowScope {
  return Object.assign(row, {
    restoreButton: () => row.getByRole('button', { name: restoreRevisionButton, exact: true }),
    openLink: () => row.getByRole('link', { name: openRestoredPostLink }),
  });
}

export const restoreScreen = {
  heading: () => page.getByRole('heading', { name: restoreHeading }),
  emptyState: () => page.getByText(noLocalRevisionsText),
  // The second row group is the body; the first holds the column headers.
  revisionRows: () =>
    page
      .getByRole('table', { name: localRevisionsTable })
      .getByRole('rowgroup')
      .nth(1)
      .getByRole('row'),
  revisionRow: (title: string) => rowScope(restoreScreen.revisionRows().filter({ hasText: title })),
};
