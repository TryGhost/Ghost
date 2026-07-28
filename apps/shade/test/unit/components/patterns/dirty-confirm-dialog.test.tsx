import assert from 'assert/strict';
import {describe, it, vi} from 'vitest';
import {fireEvent, screen} from '@testing-library/react';

import {DirtyConfirmDialog, useDirtyConfirmation} from '../../../../src/components/patterns/dirty-confirm-dialog';
import {render} from '../../utils/test-utils';

const TestHarness = ({dirty, onLeave}: {dirty: boolean; onLeave: () => void}) => {
    const {confirm, dialogProps} = useDirtyConfirmation();

    return (
        <>
            <button type='button' onClick={() => confirm(dirty, onLeave)}>Navigate away</button>
            <DirtyConfirmDialog {...dialogProps} />
        </>
    );
};

describe('DirtyConfirmDialog', () => {
    it('runs the pending action immediately when the surface is clean', () => {
        const onLeave = vi.fn();
        render(<TestHarness dirty={false} onLeave={onLeave} />);

        fireEvent.click(screen.getByRole('button', {name: 'Navigate away'}));

        assert.equal(onLeave.mock.calls.length, 1);
        assert.equal(screen.queryByRole('alertdialog'), null);
    });

    it('keeps the pending action behind the Stay action', () => {
        const onLeave = vi.fn();
        render(<TestHarness dirty={true} onLeave={onLeave} />);

        fireEvent.click(screen.getByRole('button', {name: 'Navigate away'}));
        fireEvent.click(screen.getByRole('button', {name: 'Stay'}));

        assert.equal(onLeave.mock.calls.length, 0);
        assert.equal(screen.queryByRole('alertdialog'), null);
    });

    it('runs the pending action from the Leave action', () => {
        const onLeave = vi.fn();
        render(<TestHarness dirty={true} onLeave={onLeave} />);

        fireEvent.click(screen.getByRole('button', {name: 'Navigate away'}));
        const leaveButton = screen.getByRole('button', {name: 'Leave'});

        assert.match(leaveButton.className, /bg-destructive/);
        assert.doesNotMatch(leaveButton.className, /bg-primary/);

        fireEvent.click(leaveButton);

        assert.equal(onLeave.mock.calls.length, 1);
        assert.equal(screen.queryByRole('alertdialog'), null);
    });
});
