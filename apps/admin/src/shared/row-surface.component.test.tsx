import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { renderInApp } from '@test-utils/acceptance';
import {
  ActionList,
  ActionListItem,
  ActionListItemActions,
  ActionListItemContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@tryghost/shade/components';
import { Box } from '@tryghost/shade/primitives';

const primaryAction = vi.fn<(name: string) => void>();
const secondaryAction = vi.fn<(name: string) => void>();
const row = (index: number) => page.getByRole('listitem').nth(index).element();
const fill = (element: Element) =>
  getComputedStyle(element.matches('tr') ? element.querySelector('td, th')! : element, '::before');
const transparent = 'rgba(0, 0, 0, 0)';
const geometry = (element: Element) => {
  const { x, y, width, height } = element.getBoundingClientRect();
  return { x, y, width, height };
};

async function renderRows() {
  primaryAction.mockClear();
  secondaryAction.mockClear();
  await renderInApp(
    <Box className="w-[480px]" padding="lg">
      <ActionList aria-label="Content rows" className="border-t" role="list">
        {['First', 'Second'].map((name) => (
          <ActionListItem key={name} role="listitem">
            <ActionListItemContent asChild>
              <Button
                className="justify-start py-4"
                variant="link"
                onClick={() => primaryAction(name)}
              >
                Open {name}
              </Button>
            </ActionListItemContent>
            <ActionListItemActions>
              <Button variant="ghost" onClick={() => secondaryAction(name)}>
                Edit {name}
              </Button>
            </ActionListItemActions>
          </ActionListItem>
        ))}
        <ActionListItem hover={false} role="listitem">
          <ActionListItemContent className="py-4">Static information</ActionListItemContent>
        </ActionListItem>
      </ActionList>
    </Box>,
  );
}

describe('shared content row surfaces in the browser', () => {
  it('extends the fill without moving content and hides both body separators', async () => {
    await renderRows();
    const content = page.getByRole('button', { name: 'Open Second' });
    await document.fonts.ready;
    const before = geometry(content.element());
    const headerBorder = getComputedStyle(page.getByRole('list').element()).borderTopColor;

    await content.hover();

    expect(fill(row(1)).opacity).toBe('1');
    expect(fill(row(1)).left).toBe('-16px');
    expect(fill(row(1)).right).toBe('-16px');
    expect(geometry(content.element())).toEqual(before);
    expect(getComputedStyle(row(0)).borderBottomColor).toBe(transparent);
    expect(getComputedStyle(row(1)).borderBottomColor).toBe(transparent);
    expect(getComputedStyle(page.getByRole('list').element()).borderTopColor).toBe(headerBorder);
  });

  it('activates the primary action from the extended edge and keeps secondary actions independent', async () => {
    await renderRows();
    await page.getByRole('button', { name: 'Open Second' }).click({
      position: { x: -8, y: 12 },
    });
    expect(primaryAction).toHaveBeenCalledExactlyOnceWith('Second');

    await page.getByRole('button', { name: 'Edit Second' }).click();
    expect(secondaryAction).toHaveBeenCalledExactlyOnceWith('Second');
    expect(primaryAction).toHaveBeenCalledTimes(1);
  });

  it('highlights a row when keyboard focus reaches its control', async () => {
    await renderRows();
    await userEvent.tab();
    const control = page.getByRole('button', { name: 'Open First' });
    await expect.element(control).toHaveFocus();
    expect(control.element().matches(':focus-visible')).toBe(true);
    expect(fill(row(0)).opacity).toBe('1');
    expect(getComputedStyle(row(0)).borderBottomColor).toBe(transparent);
  });

  it('leaves static rows unhighlighted', async () => {
    await renderRows();
    await page.getByText('Static information').hover();
    expect(fill(row(2)).opacity).toBe('0');
    expect(getComputedStyle(row(1)).borderBottomColor).not.toBe(transparent);
  });

  it('retains individual selection shapes and suppresses ordinary fill while dragging', async () => {
    await renderRows();
    row(0).setAttribute('data-state', 'selected');
    row(1).setAttribute('data-state', 'selected');
    const selectionColor = fill(row(1)).backgroundColor;
    await page.getByRole('button', { name: 'Open Second' }).hover();
    expect(fill(row(1)).backgroundColor).toBe(selectionColor);
    expect(fill(row(0)).opacity).toBe('1');
    expect(fill(row(1)).opacity).toBe('1');
    expect(parseFloat(fill(row(0)).borderTopLeftRadius)).toBeGreaterThan(0);
    expect(parseFloat(fill(row(1)).borderTopLeftRadius)).toBeGreaterThan(0);

    row(0).removeAttribute('data-state');
    row(1).removeAttribute('data-state');
    page.getByRole('list').element().setAttribute('data-row-dragging', 'true');
    expect(fill(row(1)).opacity).toBe('0');
    page.getByRole('list').element().removeAttribute('data-row-dragging');
    expect(fill(row(1)).opacity).toBe('1');
  });

  it('aligns table headers and cells and keeps data-only rows static', async () => {
    await renderInApp(
      <Box className="w-[480px]" padding="lg">
        <Table className="table-fixed">
          <colgroup>
            <col className="w-3/5" />
            <col className="w-2/5" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Name</TableHead>
              <TableHead scope="col">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Static entry</TableCell>
              <TableCell>Published</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Box>,
    );
    const header = page.getByRole('columnheader', { name: /name/i }).element();
    const cell = page.getByRole('cell', { name: 'Static entry' });
    const table = page.getByRole('table').element();
    expect(header.getBoundingClientRect().left).toBe(table.getBoundingClientRect().left);
    expect(cell.element().getBoundingClientRect().left).toBe(table.getBoundingClientRect().left);
    expect(getComputedStyle(header).paddingLeft).toBe('0px');
    expect(getComputedStyle(cell.element()).paddingLeft).toBe('0px');
    await cell.hover();
    expect(fill(page.getByRole('row').nth(1).element()).opacity).toBe('0');
    expect(getComputedStyle(page.getByRole('row').nth(0).element()).borderBottomColor).not.toBe(
      transparent,
    );
  });
});
