import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';

import { DirtyConfirmDialog } from '../../../../src/components/patterns/dirty-confirm-dialog';
import { useDirtyConfirmation } from '../../../../src/components/patterns/use-dirty-confirmation';
import { render } from '../../utils/test-utils';

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

    expect(onLeave.mock.calls.length).toBe(1);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('keeps the pending action behind the Stay action', () => {
    const onLeave = vi.fn();
    render(<TestHarness dirty={true} onLeave={onLeave} />);

    fireEvent.click(screen.getByRole('button', { name: 'Navigate away' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stay' }));

    expect(onLeave.mock.calls.length).toBe(0);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('runs the pending action from the Leave action', () => {
    const onLeave = vi.fn();
    render(<TestHarness dirty={true} onLeave={onLeave} />);

    fireEvent.click(screen.getByRole('button', { name: 'Navigate away' }));
    const leaveButton = screen.getByRole('button', { name: 'Leave' });

    expect(leaveButton.className).toMatch(/bg-destructive/);
    expect(leaveButton.className).not.toMatch(/bg-primary/);

    fireEvent.click(leaveButton);

    expect(onLeave.mock.calls.length).toBe(1);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});
