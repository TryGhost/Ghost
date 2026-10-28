import assert from 'assert/strict';
import { describe, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';

import { Dialog, DialogContent, DialogTitle } from '../../../../src/components/ui/dialog';
import { DirtyConfirmDialog } from '../../../../src/components/patterns/dirty-confirm-dialog';
import { useDirtyConfirmation } from '../../../../src/components/patterns/use-dirty-confirmation';
import { render } from '../../utils/test-utils';

// A dialog that asks before Escape closes it, as Admin's email design modal does.
const DialogHarness = ({ onLeave }: { onLeave: () => void }) => {
  const { confirm, dialogProps } = useDirtyConfirmation();

  return (
    <Dialog open>
      <DialogContent
        aria-describedby={undefined}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          confirm(true, onLeave);
        }}
      >
        <DialogTitle>Customize</DialogTitle>
      </DialogContent>
      <DirtyConfirmDialog {...dialogProps} />
    </Dialog>
  );
};

// Escape as a browser delivers it: outside act(), so React schedules work as it does on a page
// rather than flushing everything before the next line runs.
const pressEscapeOutsideAct = () => {
  const actEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const wasActEnvironment = actEnvironment.IS_REACT_ACT_ENVIRONMENT;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
  try {
    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' }),
    );
  } finally {
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = wasActEnvironment;
  }
};

const TestHarness = ({ dirty, onLeave }: { dirty: boolean; onLeave: () => void }) => {
  const { confirm, dialogProps } = useDirtyConfirmation();

  return (
    <>
      <button type="button" onClick={() => confirm(dirty, onLeave)}>
        Navigate away
      </button>
      <DirtyConfirmDialog {...dialogProps} />
    </>
  );
};

describe('DirtyConfirmDialog', () => {
  it('runs the pending action immediately when the surface is clean', () => {
    const onLeave = vi.fn();
    render(<TestHarness dirty={false} onLeave={onLeave} />);

    fireEvent.click(screen.getByRole('button', { name: 'Navigate away' }));

    assert.equal(onLeave.mock.calls.length, 1);
    assert.equal(screen.queryByRole('alertdialog'), null);
  });

  it('keeps the pending action behind the Stay action', () => {
    const onLeave = vi.fn();
    render(<TestHarness dirty={true} onLeave={onLeave} />);

    fireEvent.click(screen.getByRole('button', { name: 'Navigate away' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stay' }));

    assert.equal(onLeave.mock.calls.length, 0);
    assert.equal(screen.queryByRole('alertdialog'), null);
  });

  it('runs the pending action from the Leave action', () => {
    const onLeave = vi.fn();
    render(<TestHarness dirty={true} onLeave={onLeave} />);

    fireEvent.click(screen.getByRole('button', { name: 'Navigate away' }));
    const leaveButton = screen.getByRole('button', { name: 'Leave' });

    assert.match(leaveButton.className, /bg-destructive/);
    assert.doesNotMatch(leaveButton.className, /bg-primary/);

    fireEvent.click(leaveButton);

    assert.equal(onLeave.mock.calls.length, 1);
    assert.equal(screen.queryByRole('alertdialog'), null);
  });

  it('closes without leaving when asked again while open', () => {
    const onLeave = vi.fn();
    render(<TestHarness dirty={true} onLeave={onLeave} />);
    // Held on to, as the open confirmation hides everything behind it from role queries.
    const navigateAway = screen.getByRole('button', { name: 'Navigate away' });

    fireEvent.click(navigateAway);
    assert.ok(screen.queryByRole('alertdialog'), 'the confirmation did not open');
    fireEvent.click(navigateAway);

    assert.equal(onLeave.mock.calls.length, 0);
    assert.ok(!screen.queryByRole('alertdialog'), 'the confirmation is still open');
  });

  it('closes on an Escape pressed as soon as it appears over a dialog', async () => {
    const onLeave = vi.fn();
    render(<DialogHarness onLeave={onLeave} />);

    pressEscapeOutsideAct();
    // The confirmation is on screen once React has committed, a microtask later; press again
    // straight away, before anything React schedules for later has run.
    for (let i = 0; i < 10 && !screen.queryByRole('alertdialog'); i++) {
      await Promise.resolve();
    }
    // Messages keep a failure from formatting the whole element, which outlasts the test.
    assert.ok(screen.queryByRole('alertdialog'), 'the confirmation did not open');
    pressEscapeOutsideAct();

    await waitFor(() => {
      assert.ok(!screen.queryByRole('alertdialog'), 'the confirmation is still open');
    });
    assert.ok(screen.queryByRole('dialog', { name: 'Customize' }), 'the dialog closed too');
    assert.equal(onLeave.mock.calls.length, 0);
  });
});
