import assert from 'assert/strict';
import { afterEach, describe, it } from 'vitest';
import { act, render, screen } from '../../utils/test-utils';
import { ShadeApp } from '../../../../src/app';
import { toast } from '../../../../src/components';

describe('toast', () => {
  afterEach(() => {
    act(() => {
      toast.dismiss();
    });
  });

  it('is exported from the components entry', () => {
    assert.equal(typeof toast, 'function');
    assert.equal(typeof toast.success, 'function');
    assert.equal(typeof toast.error, 'function');
  });

  it("shows toasts in ShadeApp's toaster", async () => {
    render(
      <ShadeApp darkMode={false}>
        <p>App</p>
      </ShadeApp>,
    );

    // ShadeApp mounts its Toaster in an effect, so wait for it before toasting.
    await act(async () => {});

    act(() => {
      toast.success('Saved the post');
      toast.error('Could not save');
    });

    assert.ok(await screen.findByText('Saved the post'));
    assert.ok(await screen.findByText('Could not save'));
  });
});
