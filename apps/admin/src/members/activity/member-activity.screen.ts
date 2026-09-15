import { page } from 'vitest/browser';
import { getScrollParent } from '@tryghost/shade/utils';
import {
  activityEmailPreview,
  clearMemberButton,
  filterEventsButton,
  memberActivityPage,
  memberActivityTable,
  searchMembersLabel,
  showAllActivityLink,
} from '@tryghost/test-data/selectors/member-activity';

export const activityScreen = {
  root: () => page.getByTestId(memberActivityPage),
  table: () => page.getByRole('table', { name: memberActivityTable }),
  rows: () =>
    activityScreen
      .table()
      .getByRole('row')
      .filter({ has: page.getByRole('cell') }),
  memberColumn: () => page.getByRole('columnheader', { name: 'Member', exact: true }),
  link: (name: string | RegExp) => page.getByRole('link', { name, exact: true }),
  heading: (name: string) => page.getByRole('heading', { name, exact: true }),
  text: (text: string) => page.getByText(text, { exact: true }),
  filterButton: () => page.getByRole('button', { name: filterEventsButton }),
  eventType: (name: string) => page.getByRole('menuitemcheckbox', { name, exact: true }),
  search: () => page.getByRole('combobox', { name: searchMembersLabel }),
  memberOption: (name: string | RegExp) => page.getByRole('option', { name }),
  clearMember: () => page.getByRole('button', { name: clearMemberButton }).first(),
  showAll: () => page.getByRole('link', { name: showAllActivityLink }),
  retry: () => page.getByRole('button', { name: 'Retry', exact: true }),
  previewButton: (subject: string) => page.getByRole('button', { name: subject, exact: true }),
  preview: () => page.getByTestId(activityEmailPreview),
  scrollToEnd() {
    const scroller = getScrollParent(activityScreen.root().element());
    scroller?.scrollTo({ top: scroller.scrollHeight });
  },
};
