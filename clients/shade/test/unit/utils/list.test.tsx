import { expect, it } from 'vitest';
import {
  ActionList,
  ActionListItem,
  ActionListItemActions,
  ActionListItemContent,
  List,
  ListItem,
  ListItemActions,
  ListItemContent,
} from '../../../src/components/ui/list';

it('keeps the published ActionList names as aliases of the List components', () => {
  expect(ActionList).toBe(List);
  expect(ActionListItem).toBe(ListItem);
  expect(ActionListItemActions).toBe(ListItemActions);
  expect(ActionListItemContent).toBe(ListItemContent);
});
