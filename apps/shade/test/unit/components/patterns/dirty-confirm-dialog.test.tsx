import assert from 'assert/strict';
import { describe, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';

import { Dialog, DialogContent, DialogTitle } from '../../../../src/components/ui/dialog';
import { DirtyConfirmDialog } from '../../../../src/components/patterns/dirty-confirm-dialog';
import { useDirtyConfirmation } from '../../../../src/components/patterns/use-dirty-confirmation';
import { render } from '../../utils/test-utils';

// A dialog that asks for confirmation instead of closing on Escape, like Admin's email design
// modal. It's where a quick second Escape can reach the wrong dialog (see useDirtyConfirmation).
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

// Presses Escape the way a browser delivers it. Testing Library's fireEvent wraps the event in
// act(), which runs every pending render and effect before it returns. By the next line, Radix
// would already route Escape to the confirmation, so the bug could never show. Outside act(),
// React defers effects as it does in a browser, and a second press can land before they run.
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
    // Found before the confirmation opens: once it's open, everything behind it is aria-hidden,
    // so getByRole can no longer find the button.
    const navigateAway = screen.getByRole('button', { name: 'Navigate away' });

    fireEvent.click(navigateAway);
    assert.ok(screen.queryByRole('alertdialog'), 'the confirmation did not open');
    // Stands in for a dismissal that reaches the page behind the open confirmation.
    fireEvent.click(navigateAway);

    assert.equal(onLeave.mock.calls.length, 0);
    assert.ok(!screen.queryByRole('alertdialog'), 'the confirmation is still open');
  });

  it('closes on an Escape pressed as soon as it appears over a dialog', async () => {
    const onLeave = vi.fn();
    render(<DialogHarness onLeave={onLeave} />);

    pressEscapeOutsideAct();
    // Wait only until the confirmation is on screen, which takes a few microtasks, then press
    // again at once. Waiting longer, with waitFor for example, would let Radix's effects run.
    // The second press would then go straight to the confirmation, and the test would pass
    // without the fix.
    for (let i = 0; i < 10 && !screen.queryByRole('alertdialog'); i++) {
      await Promise.resolve();
    }
    // These assertions all carry a message. Without one, a failing assert formats the jsdom
    // element for its error. That's slow enough to crash the Vitest worker, which hides the
    // actual failure.
    assert.ok(screen.queryByRole('alertdialog'), 'the confirmation did not open');
    pressEscapeOutsideAct();

    await waitFor(() => {
      assert.ok(!screen.queryByRole('alertdialog'), 'the confirmation is still open');
    });
    assert.ok(screen.queryByRole('dialog', { name: 'Customize' }), 'the dialog closed too');
    assert.equal(onLeave.mock.calls.length, 0);
  });
});
