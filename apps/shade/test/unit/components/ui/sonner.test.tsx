import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '../../utils/test-utils';
import { ShadeApp } from '../../../../src/app';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  toast,
} from '../../../../src/components';

describe('toast', () => {
  beforeEach(() => {
    // jsdom has no setPointerCapture.
    HTMLElement.prototype.setPointerCapture = vi.fn();
  });

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

  it("keeps toasts inside a Ghost app's safe area, clear of Admin's chrome", async () => {
    render(
      <ShadeApp darkMode={false}>
        <p>App</p>
      </ShadeApp>,
    );
    await act(async () => {});

    act(() => {
      toast.success('Saved the post');
    });
    await screen.findByText('Saved the post');

    const toaster = document.querySelector<HTMLElement>('[data-sonner-toaster]')!;
    expect(toaster.style.getPropertyValue('--offset-bottom')).toBe(
      'calc(24px + var(--ghost-safe-area-inset-bottom, 0px))',
    );
    expect(toaster.style.getPropertyValue('--offset-left')).toBe(
      'calc(24px + var(--ghost-safe-area-inset-left, 0px))',
    );
    expect(toaster.style.getPropertyValue('--mobile-offset-bottom')).toBe(
      'calc(16px + var(--ghost-safe-area-inset-bottom, 0px))',
    );
  });

  it('takes presses above a modal dialog, where Radix turns off pointer events on the body', async () => {
    render(
      <ShadeApp darkMode={false}>
        <p>App</p>
      </ShadeApp>,
    );
    await act(async () => {});

    act(() => {
      toast.success('Saved the post');
    });
    await screen.findByText('Saved the post');

    expect(document.querySelector('[data-sonner-toaster]')!.classList).toContain(
      'pointer-events-auto',
    );
  });

  it.each(['dialog', 'sheet'])(
    'leaves a %s open when a toast above it is pressed',
    async (kind) => {
      const onOpenChange = vi.fn();
      render(
        <ShadeApp darkMode={false}>
          {kind === 'dialog' ? (
            <Dialog open onOpenChange={onOpenChange}>
              <DialogContent>
                <DialogTitle>Title</DialogTitle>
                <DialogDescription>Description</DialogDescription>
              </DialogContent>
            </Dialog>
          ) : (
            <Sheet open onOpenChange={onOpenChange}>
              <SheetContent>
                <SheetTitle>Title</SheetTitle>
                <SheetDescription>Description</SheetDescription>
              </SheetContent>
            </Sheet>
          )}
        </ShadeApp>,
      );
      await act(async () => {});
      act(() => {
        toast.success('Saved the post', { action: { label: 'Undo', onClick: () => {} } });
      });
      const undo = await screen.findByText('Undo');
      // Radix starts listening for outside presses on the next tick.
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });

      fireEvent.pointerDown(undo, { button: 0 });
      fireEvent.click(undo);
      fireEvent.focusIn(undo);
      expect(onOpenChange).not.toHaveBeenCalled();

      fireEvent.pointerDown(document.body, { button: 0 });
      fireEvent.click(document.body);
      expect(onOpenChange.mock.calls).toEqual([[false]]);
    },
  );
});
