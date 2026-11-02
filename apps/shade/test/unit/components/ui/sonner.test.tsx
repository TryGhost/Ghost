import { afterEach, describe, expect, it } from 'vitest';
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
    expect(toast).toBeTypeOf('function');
    expect(toast.success).toBeTypeOf('function');
    expect(toast.error).toBeTypeOf('function');
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

    expect(await screen.findByText('Saved the post')).toBeTruthy();
    expect(await screen.findByText('Could not save')).toBeTruthy();
  });
});
