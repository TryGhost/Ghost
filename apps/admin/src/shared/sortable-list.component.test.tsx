import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { dragByPointer, renderInApp } from '@test-utils/acceptance';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  SortableList,
} from '@tryghost/shade/components';

// dnd-kit works out keyboard moves from the rows' layout, so these run in Admin's browser
// harness, where rows have real sizes.

interface Row {
  id: string;
  name: string;
  tall?: boolean;
}

const evenRows: Row[] = [
  { id: 'weekly', name: 'The Weekly' },
  { id: 'deep-dives', name: 'Deep Dives' },
  { id: 'digest', name: 'Digest' },
];

const unevenRows: Row[] = [
  { id: 'short-one', name: 'Short one' },
  { id: 'tall', name: 'Tall', tall: true },
  { id: 'short-two', name: 'Short two' },
  { id: 'short-three', name: 'Short three' },
];

const manyRows: Row[] = Array.from({ length: 8 }, (_, index) => ({
  id: `row-${index + 1}`,
  name: `Row ${index + 1}`,
}));

function List({
  initial,
  getDragHandleLabel,
  control,
}: {
  initial: Row[];
  getDragHandleLabel?: (row: Row) => string;
  /** Lets a spec change the rows mid-drag, as a refetch would. */
  control?: (setRows: Dispatch<SetStateAction<Row[]>>) => void;
}) {
  const [rows, setRows] = useState(initial);
  useEffect(() => control?.(setRows), [control]);

  return (
    <SortableList
      className="w-80"
      getDragHandleLabel={getDragHandleLabel}
      getItemLabel={(row) => row.name}
      items={rows}
      renderItem={(row) => (
        <div className={row.tall ? 'h-40' : 'h-8'} data-testid="row">
          {row.name}
        </div>
      )}
      onMove={(id, overId) =>
        setRows((current) => {
          const next = [...current];
          const [moved] = next.splice(
            next.findIndex((row) => row.id === id),
            1,
          );
          next.splice(
            current.findIndex((row) => row.id === overId),
            0,
            moved,
          );
          return next;
        })
      }
    />
  );
}

/** The list in an open Shade dialog. */
function ListInDialog({
  control,
  onOpenChange,
}: {
  control?: (setRows: Dispatch<SetStateAction<Row[]>>) => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange?.(next);
        setOpen(next);
      }}
    >
      <DialogContent>
        <DialogTitle>Newsletters</DialogTitle>
        <DialogDescription>Put the newsletters in order.</DialogDescription>
        <List control={control} initial={evenRows} />
      </DialogContent>
    </Dialog>
  );
}

const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

const order = () =>
  page
    .getByTestId('row')
    .elements()
    .map((row) => row.textContent);

// dnd-kit's live regions, one per list.
const liveRegions = () =>
  [...document.querySelectorAll('[role="status"][aria-live="assertive"]')].map(
    (region) => region.textContent,
  );

const announced = (text: string) => expect.poll(liveRegions).toContain(text);

/** Focuses a row's handle and picks the row up with Space. */
async function pickUp(
  name: string,
  handleLabel = `Reorder ${name}`,
  position = order().indexOf(name) + 1,
) {
  const handle = page.getByRole('button', { name: handleLabel }).element() as HTMLElement;
  // Count before the pick-up: the lifted copy of the row is a row too.
  const total = order().length;
  handle.focus();
  await userEvent.keyboard(' ');
  await announced(`Picked up ${name}, position ${position} of ${total}.`);
}

/** Picks the row up from the keyboard, presses each arrow key in turn, then drops it. */
async function move(name: string, keys: Array<'ArrowUp' | 'ArrowDown'>, positions: number[]) {
  const total = order().length;
  await pickUp(name);
  for (const [index, key] of keys.entries()) {
    await userEvent.keyboard(`{${key}}`);
    await announced(`${name} moved to position ${positions[index]} of ${total}.`);
  }
  await userEvent.keyboard(' ');
  await announced(`${name} dropped at position ${positions.at(-1)} of ${total}.`);
}

describe('SortableList keyboard reordering', () => {
  it('stops at the ends of the list', async () => {
    await renderInApp(<List initial={evenRows} />);

    await pickUp('Digest');
    await userEvent.keyboard('{ArrowDown}');
    // Still at the end, so one press back up moves it one place.
    await userEvent.keyboard('{ArrowUp}');
    await announced('Digest moved to position 2 of 3.');
    await userEvent.keyboard('{ArrowDown}');
    await announced('Digest moved to position 3 of 3.');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard(' ');
    await announced('Digest dropped at position 3 of 3.');
    await expect.poll(order).toEqual(['The Weekly', 'Deep Dives', 'Digest']);

    await pickUp('The Weekly');
    await userEvent.keyboard('{ArrowUp}');
    await userEvent.keyboard('{ArrowDown}');
    await announced('The Weekly moved to position 2 of 3.');
    await userEvent.keyboard('{ArrowUp}');
    await announced('The Weekly moved to position 1 of 3.');
    await userEvent.keyboard('{ArrowUp}');
    await userEvent.keyboard(' ');
    await announced('The Weekly dropped at position 1 of 3.');
    await expect.poll(order).toEqual(['The Weekly', 'Deep Dives', 'Digest']);
  });

  it('moves rows of different heights one place per press', async () => {
    await renderInApp(<List initial={unevenRows} />);

    // A short row past a tall one, and back.
    await move('Short one', ['ArrowDown', 'ArrowDown'], [2, 3]);
    await expect.poll(order).toEqual(['Tall', 'Short two', 'Short one', 'Short three']);
    await move('Short one', ['ArrowUp', 'ArrowUp'], [2, 1]);
    await expect.poll(order).toEqual(['Short one', 'Tall', 'Short two', 'Short three']);

    // The tall row over short ones, down and back up.
    await move('Tall', ['ArrowDown', 'ArrowDown'], [3, 4]);
    await expect.poll(order).toEqual(['Short one', 'Short two', 'Short three', 'Tall']);
    await move('Tall', ['ArrowUp'], [3]);
    await expect.poll(order).toEqual(['Short one', 'Short two', 'Tall', 'Short three']);
  });

  it('shows the lifted row in the place it will drop into', async () => {
    await renderInApp(<List initial={unevenRows} />);

    await pickUp('Short one');
    await userEvent.keyboard('{ArrowDown}');
    await announced('Short one moved to position 2 of 4.');

    // The tall row moves up into the gap, and the lifted row sits just below it rather than over it.
    const rowOf = (name: string) =>
      page
        .getByRole('button', { name: `Reorder ${name}` })
        .elements()
        .at(-1)!.parentElement!;
    await expect
      .poll(() =>
        Math.round(
          rowOf('Short one').getBoundingClientRect().top -
            rowOf('Tall').getBoundingClientRect().bottom,
        ),
      )
      .toBeCloseTo(0, 0);
    await userEvent.keyboard('{Escape}');
  });

  it('moves a row one place per press in a list that scrolls, even when keys come quickly', async () => {
    await renderInApp(
      <div className="max-h-32 overflow-auto" data-testid="scroller">
        <List initial={manyRows} />
      </div>,
    );

    await move('Row 1', ['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown'], [2, 3, 4, 5]);
    await expect
      .poll(order)
      .toEqual(['Row 2', 'Row 3', 'Row 4', 'Row 5', 'Row 1', 'Row 6', 'Row 7', 'Row 8']);

    // Dropped straight after the presses, before the list has scrolled to show the target.
    await pickUp('Row 1');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown} ');
    await announced('Row 1 dropped at position 8 of 8.');
    await expect
      .poll(order)
      .toEqual(['Row 2', 'Row 3', 'Row 4', 'Row 5', 'Row 6', 'Row 7', 'Row 8', 'Row 1']);

    // Scrolling the list under a lifted row doesn't move it: only the arrow keys do.
    const scroller = page.getByTestId('scroller').element();
    scroller.scrollTop = 0;
    await pickUp('Row 3');
    scroller.scrollTop += 82;
    // Let dnd-kit see the scroll and re-render before the drop.
    await nextFrame();
    await nextFrame();
    await userEvent.keyboard(' ');
    await announced('Row 3 dropped at position 2 of 8.');
    await expect
      .poll(order)
      .toEqual(['Row 2', 'Row 3', 'Row 4', 'Row 5', 'Row 6', 'Row 7', 'Row 8', 'Row 1']);
  });

  it('moves rows by keyboard and by pointer in the same list', async () => {
    await renderInApp(<List initial={evenRows} />);

    await move('The Weekly', ['ArrowDown'], [2]);
    await expect.poll(order).toEqual(['Deep Dives', 'The Weekly', 'Digest']);

    await dragByPointer(
      page.getByRole('button', { name: 'Reorder Digest' }),
      page.getByTestId('row').first(),
    );
    await expect.poll(order).toEqual(['Digest', 'Deep Dives', 'The Weekly']);

    await move('Deep Dives', ['ArrowDown'], [3]);
    await expect.poll(order).toEqual(['Digest', 'The Weekly', 'Deep Dives']);
  });

  it('keeps a lifted row in place when rows leave the list mid-drag', async () => {
    let setRows: Dispatch<SetStateAction<Row[]>> | undefined;
    await renderInApp(
      <List
        control={(set) => {
          setRows = set;
        }}
        initial={[...evenRows, { id: 'events', name: 'Events' }]}
      />,
    );
    const remove = async (id: string) => {
      setRows?.((rows) => rows.filter((row) => row.id !== id));
      await nextFrame();
      await nextFrame();
    };

    // The row it was moving to goes: it drops where it started.
    await pickUp('The Weekly');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await announced('The Weekly moved to position 3 of 4.');
    await remove('digest');
    await userEvent.keyboard(' ');
    await announced('The Weekly dropped at position 1 of 3.');
    await expect.poll(order).toEqual(['The Weekly', 'Deep Dives', 'Events']);

    // The lifted row itself goes: nothing moves.
    await pickUp('Deep Dives');
    await userEvent.keyboard('{ArrowDown}');
    await remove('deep-dives');
    await userEvent.keyboard(' ');
    await announced('Moving cancelled. The item is no longer in the list.');
    await expect.poll(order).toEqual(['The Weekly', 'Events']);
  });

  it('names a row by its handle label when it has no name of its own', async () => {
    await renderInApp(
      <List
        getDragHandleLabel={(row) => `Reorder ${row.name || 'untitled row'}`}
        initial={[{ id: 'untitled', name: '' }, ...evenRows]}
      />,
    );

    await pickUp('Reorder untitled row', 'Reorder untitled row', 1);
    await userEvent.keyboard('{Escape}');
  });

  it('announces a cancelled move by name, and keeps the order', async () => {
    await renderInApp(<List initial={evenRows} />);

    await pickUp('Deep Dives');
    await userEvent.keyboard('{ArrowDown}');
    await announced('Deep Dives moved to position 3 of 3.');
    await userEvent.keyboard('{Escape}');
    await announced('Moving cancelled. Deep Dives stays at position 2 of 3.');
    await expect.poll(order).toEqual(['The Weekly', 'Deep Dives', 'Digest']);
  });

  describe('in a dialog', () => {
    const dialog = () => page.getByRole('dialog', { name: 'Newsletters' });

    it('cancels a move on Escape and keeps the dialog open, then closes it on the next Escape', async () => {
      const onOpenChange = vi.fn();
      await renderInApp(<ListInDialog onOpenChange={onOpenChange} />);

      await pickUp('Deep Dives');
      await userEvent.keyboard('{ArrowDown}');
      await announced('Deep Dives moved to position 3 of 3.');
      await userEvent.keyboard('{Escape}');
      await announced('Moving cancelled. Deep Dives stays at position 2 of 3.');

      // The dialog asks to close as Escape reaches it, before anything is announced.
      expect(onOpenChange).not.toHaveBeenCalled();

      await userEvent.keyboard('{Escape}');
      await expect.element(dialog()).not.toBeInTheDocument();
    });

    it('lets Escape close the dialog once a move is dropped', async () => {
      await renderInApp(<ListInDialog />);

      await move('The Weekly', ['ArrowDown'], [2]);
      await expect.poll(order).toEqual(['Deep Dives', 'The Weekly', 'Digest']);

      await userEvent.keyboard('{Escape}');
      await expect.element(dialog()).not.toBeInTheDocument();
    });

    it('lets Escape close the dialog once the list has gone mid-move', async () => {
      let setRows: Dispatch<SetStateAction<Row[]>> | undefined;
      await renderInApp(
        <ListInDialog
          control={(set) => {
            setRows = set;
          }}
        />,
      );

      await pickUp('Digest');
      // With no rows left, the list renders nothing, and the move goes with it.
      setRows?.([]);
      await expect.poll(order).toEqual([]);

      await userEvent.keyboard('{Escape}');
      await expect.element(dialog()).not.toBeInTheDocument();
    });
  });
});
