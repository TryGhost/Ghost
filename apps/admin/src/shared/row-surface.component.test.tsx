import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { renderInApp } from '@test-utils/acceptance';
import {
  List,
  ListItem,
  ListItemActions,
  ListItemContent,
  Button,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogClose,
  RowPrimaryAction,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowAction,
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

async function renderRows(admin7Design = true) {
  primaryAction.mockClear();
  secondaryAction.mockClear();
  await renderInApp(
    <Box className="w-[480px]" padding="lg">
      <List aria-label="Content rows" className="border-t" role="list">
        {['First', 'Second'].map((name) => (
          <ListItem key={name} role="listitem">
            <ListItemContent asChild>
              <Button
                className="justify-start py-4"
                variant="link"
                onClick={() => primaryAction(name)}
              >
                Open {name}
              </Button>
            </ListItemContent>
            <ListItemActions>
              <Button variant="ghost" onClick={() => secondaryAction(name)}>
                Edit {name}
              </Button>
            </ListItemActions>
          </ListItem>
        ))}
        <ListItem role="listitem">
          <ListItemContent className="py-4">Static information</ListItemContent>
        </ListItem>
      </List>
    </Box>,
    { labs: { admin7Design } },
  );
}

describe('shared content row surfaces in the browser', () => {
  it.each([false, true])(
    'keeps custom row markup and expands its action: admin7Design %s',
    async (admin7Design) => {
      const open = vi.fn<() => void>();
      const edit = vi.fn<() => void>();
      await renderInApp(
        <Box className="w-[480px]" padding="lg">
          <ul>
            <ListItem asChild>
              <li className="relative border-b py-4">
                <RowPrimaryAction asChild>
                  <button type="button" onClick={open}>
                    Open custom row
                  </button>
                </RowPrimaryAction>
                <button className="relative z-10" type="button" onClick={edit}>
                  Edit custom row
                </button>
              </li>
            </ListItem>
          </ul>
        </Box>,
        { labs: { admin7Design } },
      );
      const custom = page.getByRole('listitem');
      expect(custom.element().parentElement?.tagName).toBe('UL');
      expect(getComputedStyle(custom.element()).display).toBe('list-item');
      await page.getByRole('button', { name: 'Edit custom row' }).click();
      expect(edit).toHaveBeenCalledTimes(1);
      expect(open).not.toHaveBeenCalled();
      await custom.click({ position: { x: -8, y: 12 } });
      expect(open).toHaveBeenCalledTimes(1);
    },
  );

  it('expands action-list focus and click areas with the design flag off', async () => {
    await renderRows(false);
    await page.getByText('Static information').hover();
    await userEvent.tab();
    const primary = page.getByRole('button', { name: 'Open First' });
    await expect.element(primary).toHaveFocus();
    expect(fill(row(0)).opacity).toBe('1');
    const bounds = row(0).getBoundingClientRect();
    expect(
      document.elementFromPoint(bounds.left - 8, bounds.top + bounds.height / 2)?.closest('button'),
    ).toBe(primary.element());
    await primary.click();
    expect(primaryAction).toHaveBeenCalledExactlyOnceWith('First');
  });

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
    await page.getByRole('button', { name: 'Open Second' }).hover();
    const hoverColor = fill(row(1)).backgroundColor;
    row(0).setAttribute('data-state', 'selected');
    row(1).setAttribute('data-state', 'selected');
    const selectionColor = fill(row(1)).backgroundColor;
    expect(selectionColor).not.toBe(hoverColor);
    await page.getByRole('button', { name: 'Open Second' }).hover();
    expect(fill(row(1)).backgroundColor).toBe(selectionColor);
    expect(fill(row(0)).opacity).toBe('1');
    expect(fill(row(1)).opacity).toBe('1');
    expect(parseFloat(fill(row(0)).borderTopLeftRadius)).toBeGreaterThan(0);
    expect(parseFloat(fill(row(1)).borderTopLeftRadius)).toBeGreaterThan(0);

    page.getByRole('list').element().setAttribute('data-row-dragging', 'true');
    expect(fill(row(0)).opacity).toBe('1');
    expect(fill(row(1)).opacity).toBe('1');
    expect(fill(row(1)).backgroundColor).toBe(selectionColor);
    row(0).removeAttribute('data-state');
    row(1).removeAttribute('data-state');
    expect(fill(row(1)).opacity).toBe('0');
    page.getByRole('list').element().removeAttribute('data-row-dragging');
    expect(fill(row(1)).opacity).toBe('1');
  });

  it.each([false, true])('preserves table defaults with admin7Design %s', async (admin7Design) => {
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
      { labs: { admin7Design } },
    );
    const header = page.getByRole('columnheader', { name: /name/i }).element();
    const cell = page.getByRole('cell', { name: 'Static entry' });
    const table = page.getByRole('table').element();
    expect(header.getBoundingClientRect().left).toBe(table.getBoundingClientRect().left);
    expect(cell.element().getBoundingClientRect().left).toBe(table.getBoundingClientRect().left);
    expect(getComputedStyle(header).paddingLeft).toBe('0px');
    expect(getComputedStyle(cell.element()).paddingLeft).toBe('0px');
    const background = getComputedStyle(cell.element()).backgroundColor;
    await cell.hover();
    expect(fill(page.getByRole('row').nth(1).element()).opacity).toBe('0');
    expect(getComputedStyle(cell.element()).backgroundColor).toBe(background);
    expect(getComputedStyle(page.getByRole('row').nth(0).element()).borderBottomColor).not.toBe(
      transparent,
    );
  });

  it('gets primary and secondary table actions from Shade without row click plumbing', async () => {
    const open = vi.fn<() => void>();
    const edit = vi.fn<() => void>();
    await renderInApp(
      <Box className="w-[480px]" padding="lg">
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="static">
                <TableRowAction asChild>
                  <button type="button" onClick={open}>
                    Open entry
                  </button>
                </TableRowAction>
              </TableCell>
              <TableCell>
                <button className="relative z-10" type="button" onClick={edit}>
                  Edit entry
                </button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Box>,
      { labs: { admin7Design: true } },
    );
    await page.getByRole('row').click({ position: { x: -8, y: 12 } });
    expect(open).toHaveBeenCalledTimes(1);
    await page.getByRole('button', { name: 'Edit entry' }).click();
    expect(edit).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledTimes(1);
  });
});

it('keeps action-slot whitespace clickable while respecting modal pointer blocking', async () => {
  const open = vi.fn();
  const edit = vi.fn();
  await renderInApp(
    <Dialog>
      <Box className="w-[480px]" padding="lg">
        <ListItem>
          <ListItemContent asChild>
            <button type="button" onClick={open}>
              Open entry
            </button>
          </ListItemContent>
          <ListItemActions data-testid="row-actions">
            <button type="button" onClick={edit}>
              Edit entry
            </button>
          </ListItemActions>
        </ListItem>
        <DialogTrigger asChild>
          <Button>Open dialog</Button>
        </DialogTrigger>
      </Box>
      <DialogContent>
        <DialogTitle>Example dialog</DialogTitle>
        <DialogClose asChild>
          <Button>Close example</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>,
  );
  const primary = page.getByRole('button', { name: 'Open entry' });
  const secondary = page.getByRole('button', { name: 'Edit entry' });
  const bounds = page.getByTestId('row-actions').element().getBoundingClientRect();
  expect(
    document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + 2)?.closest('button'),
  ).toBe(primary.element());
  await page
    .getByTestId('row-actions')
    .click({ position: { x: bounds.width / 2, y: 2 }, force: true });
  expect(open).toHaveBeenCalledOnce();
  await secondary.click();
  expect(edit).toHaveBeenCalledOnce();
  const primaryElement = primary.element();
  const secondaryElement = secondary.element();
  await page.getByRole('button', { name: 'Open dialog' }).click();
  await expect.element(page.getByRole('dialog')).toBeVisible();
  await expect.poll(() => getComputedStyle(secondaryElement).pointerEvents).toBe('none');
  expect(getComputedStyle(primaryElement, '::after').pointerEvents).toBe('none');
  await page.getByRole('button', { name: 'Close example' }).click();
  await expect.poll(() => getComputedStyle(secondaryElement).pointerEvents).not.toBe('none');
  await secondary.click();
  expect(edit).toHaveBeenCalledTimes(2);
  expect(open).toHaveBeenCalledOnce();
});

it('does not expand static, disabled or layout-only content into a row action', async () => {
  const action = vi.fn();
  await renderInApp(
    <Box className="w-[480px]" padding="lg">
      <ListItem data-testid="static-row" hover={false}>
        <ListItemContent asChild>
          <button type="button" onClick={action}>
            Static action
          </button>
        </ListItemContent>
      </ListItem>
      <ListItem>
        <RowPrimaryAction aria-disabled="true" onClick={action}>
          Unavailable action
        </RowPrimaryAction>
      </ListItem>
      <ListItem data-testid="layout-row">
        <ListItemContent asChild>
          <Box>Information only</Box>
        </ListItemContent>
      </ListItem>
    </Box>,
  );
  for (const name of ['Static action', 'Unavailable action']) {
    const control = page.getByRole('button', { name }).element();
    expect(getComputedStyle(control, '::after').content).toBe('none');
  }
  const layout = page.getByTestId('layout-row');
  expect(layout.element().querySelector('.shade-row-primary')).toBeNull();
  await layout.hover();
  expect(fill(layout.element()).opacity).toBe('0');
  await page.getByTestId('static-row').click({ position: { x: -8, y: 12 }, force: true });
  expect(action).not.toHaveBeenCalled();
  await page.getByRole('button', { name: 'Static action' }).click();
  expect(action).toHaveBeenCalledOnce();
});

it.each([false, true])(
  'keeps unmarked controls and labels above the row target with admin7Design %s',
  async (admin7Design) => {
    const open = vi.fn();
    const edit = vi.fn();
    await renderInApp(
      <Dialog>
        <Box className="w-[480px]" padding="lg">
          <ListItem data-testid="native-controls-row">
            <RowPrimaryAction onClick={open}>Open entry</RowPrimaryAction>
            <div>
              <label htmlFor="include-entry">Include entry</label>
              <input id="include-entry" type="checkbox" />
              <button type="button" onClick={edit}>
                Edit entry
              </button>
              <button className="sm:absolute sm:right-0" type="button">
                Positioned action
              </button>
              <button className="sm:sr-only" type="button">
                Hidden action
              </button>
            </div>
          </ListItem>
          <DialogTrigger asChild>
            <Button>Open control dialog</Button>
          </DialogTrigger>
        </Box>
        <DialogContent>
          <DialogTitle>Controls example</DialogTitle>
          <DialogClose asChild>
            <Button>Close control dialog</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>,
      { labs: { admin7Design } },
    );
    const label = page.getByText('Include entry', { exact: true });
    const checkbox = page.getByRole('checkbox', { name: 'Include entry' });
    const secondary = page.getByRole('button', { name: 'Edit entry' });
    const elements = [label.element(), checkbox.element(), secondary.element()];
    expect(
      getComputedStyle(page.getByRole('button', { name: 'Positioned action' }).element()).position,
    ).toBe('absolute');
    expect(
      getComputedStyle(page.getByRole('button', { name: 'Hidden action' }).element()).position,
    ).toBe('absolute');
    for (const element of elements) {
      const bounds = element.getBoundingClientRect();
      expect(
        element.contains(
          document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2),
        ),
      ).toBe(true);
    }
    await label.click();
    await expect.element(checkbox).toBeChecked();
    await checkbox.click();
    await expect.element(checkbox).not.toBeChecked();
    await secondary.click();
    expect(edit).toHaveBeenCalledOnce();
    expect(open).not.toHaveBeenCalled();
    await page.getByTestId('native-controls-row').click({ position: { x: -8, y: 12 } });
    expect(open).toHaveBeenCalledOnce();
    await page.getByRole('button', { name: 'Open control dialog' }).click();
    await expect.element(page.getByRole('dialog')).toBeVisible();
    for (const element of elements) {
      expect(getComputedStyle(element).pointerEvents).toBe('none');
    }
    await page.getByRole('button', { name: 'Close control dialog' }).click();
    await secondary.click();
    expect(edit).toHaveBeenCalledTimes(2);
    expect(open).toHaveBeenCalledOnce();
  },
);
