import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { AppOverlay, AppOverlayHold, AppOverlayTint } from '../../../../src/lib/app-overlay';
import ShadeApp from '../../../../src/shade-app';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../../../../src/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '../../../../src/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '../../../../src/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from '../../../../src/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../src/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../src/components/ui/tooltip';
import { render } from '../../utils/test-utils';

const setSafeArea = (document: Document, inset: string | undefined) => {
  for (const side of ['top', 'right', 'bottom', 'left']) {
    const name = `--ghost-safe-area-inset-${side}`;
    if (inset === undefined) {
      document.documentElement.style.removeProperty(name);
    } else {
      document.documentElement.style.setProperty(name, inset);
    }
  }
};

/**
 * An app's overlay, as the app SDK gives one: an element, and the holds dialogs take on it. The
 * SDK has set the safe area by the time it gives one.
 */
function fakeOverlay(initiallyAvailable = true) {
  setSafeArea(document, '0px');
  let available = initiallyAvailable;
  const container = document.createElement('div');
  container.setAttribute('data-testid', 'overlay');
  document.body.append(container);
  const holds: {
    tint: AppOverlayTint;
    element: HTMLElement;
    open: boolean[];
    released: boolean;
  }[] = [];
  const overlay: AppOverlay = {
    container: () => (available ? container : undefined),
    hold: (tint, element): AppOverlayHold => {
      const hold = { tint, element, open: [] as boolean[], released: false };
      holds.push(hold);
      return {
        setOpen: (open) => hold.open.push(open),
        release: () => {
          hold.released = true;
        },
      };
    },
  };
  return {
    overlay,
    container,
    holds,
    makeAvailable: () => {
      available = true;
    },
  };
}

function ProbeDialog({ modal }: { modal?: boolean }) {
  return (
    <Dialog modal={modal}>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent data-testid="dialog">
        <DialogTitle>Title</DialogTitle>
        <DialogDescription>Description</DialogDescription>
        <Popover>
          <PopoverTrigger>More</PopoverTrigger>
          <PopoverContent data-testid="popover">Popover</PopoverContent>
        </Popover>
      </DialogContent>
    </Dialog>
  );
}

describe('a dialog in an app’s overlay', () => {
  let fake: ReturnType<typeof fakeOverlay>;

  beforeEach(() => {
    fake = fakeOverlay();
    // jsdom has none. A sheet's close button scrolls into view as it takes focus in an app.
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    fake.container.remove();
    setSafeArea(document, undefined);
    document.querySelectorAll('iframe').forEach((frame) => frame.remove());
    vi.unstubAllGlobals();
  });

  it('renders in the overlay, holds it while open, and lets Admin’s tint show through', async () => {
    render(
      <ShadeApp darkMode={false} overlay={fake.overlay}>
        <ProbeDialog />
      </ShadeApp>,
    );

    fireEvent.click(screen.getByText('Open'));

    const dialog = await screen.findByTestId('dialog');
    expect(fake.container.contains(dialog)).toBe(true);
    const backdrop = fake.container.querySelector<HTMLElement>('[data-state="open"].fixed.inset-0');
    expect(backdrop?.style.background).toBe('transparent');
    expect(fake.holds.length).toBe(1);
    expect(fake.holds[0].tint).toBe('dialog');
    expect(fake.holds[0].element).toBe(dialog);
    expect(fake.holds[0].open).toEqual([true]);

    fireEvent.keyDown(dialog, { key: 'Escape' });

    // Released once it unmounts. With a closing animation, which jsdom doesn't run, it reports
    // that it's closing first.
    await waitFor(() => expect(fake.holds[0].released).toBe(true));
  });

  it('renders content a dialog in the overlay portals, such as a popover, in the overlay too', async () => {
    render(
      <ShadeApp darkMode={false} overlay={fake.overlay}>
        <ProbeDialog />
      </ShadeApp>,
    );
    fireEvent.click(screen.getByText('Open'));
    await screen.findByTestId('dialog');

    await act(async () => {
      fireEvent.pointerDown(screen.getByText('More'), { button: 0, pointerType: 'mouse' });
      fireEvent.click(screen.getByText('More'));
    });

    const popover = await screen.findByTestId('popover');
    expect(fake.container.contains(popover)).toBe(true);
  });

  it('renders what a menu in it portals itself, such as a submenu, in the overlay too', async () => {
    render(
      <ShadeApp darkMode={false} overlay={fake.overlay}>
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent data-testid="dialog">
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Description</DialogDescription>
            <DropdownMenu modal={false} open>
              <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
              <DropdownMenuPortal>
                <div data-testid="submenu">Submenu</div>
              </DropdownMenuPortal>
            </DropdownMenu>
          </DialogContent>
        </Dialog>
      </ShadeApp>,
    );
    fireEvent.click(screen.getByText('Open'));

    const submenu = await screen.findByTestId('submenu');
    expect(fake.container.contains(submenu)).toBe(true);
  });

  it('holds the overlay with a sheet’s tint for a sheet', async () => {
    render(
      <ShadeApp darkMode={false} overlay={fake.overlay}>
        <Sheet open>
          <SheetContent data-testid="sheet">
            <SheetTitle>Settings</SheetTitle>
            <SheetDescription>Description</SheetDescription>
          </SheetContent>
        </Sheet>
      </ShadeApp>,
    );

    const sheet = await screen.findByTestId('sheet');
    expect(fake.container.contains(sheet)).toBe(true);
    expect(fake.holds[0].tint).toBe('sheet');
  });

  it('moves a sheet that stops being modal while open to the page, with its popovers', async () => {
    const Probe = ({ modal }: { modal: boolean }) => (
      <ShadeApp darkMode={false} overlay={fake.overlay}>
        <Sheet modal={modal} open>
          <SheetContent data-testid="sheet">
            <SheetTitle>Settings</SheetTitle>
            <SheetDescription>Description</SheetDescription>
            <Popover>
              <PopoverTrigger>More</PopoverTrigger>
              <PopoverContent data-testid="popover">Popover</PopoverContent>
            </Popover>
          </SheetContent>
        </Sheet>
      </ShadeApp>
    );
    const { rerender } = render(<Probe modal />);
    expect(fake.container.contains(await screen.findByTestId('sheet'))).toBe(true);

    rerender(<Probe modal={false} />);

    const sheet = await screen.findByTestId('sheet');
    expect(fake.container.contains(sheet)).toBe(false);
    expect(fake.holds[0].released).toBe(true);
    expect(fake.holds.length).toBe(1);
    // A sheet that isn't modal has no backdrop, Admin's or its own.
    expect(document.querySelector('[data-state="open"].fixed.inset-0')).toBeNull();
    await act(async () => {
      fireEvent.pointerDown(screen.getByText('More'), { button: 0, pointerType: 'mouse' });
      fireEvent.click(screen.getByText('More'));
    });
    expect(fake.container.contains(await screen.findByTestId('popover'))).toBe(false);
  });

  it('gives a dialog’s role and hold to the element an `asChild` content renders', async () => {
    render(
      <ShadeApp darkMode={false} overlay={fake.overlay}>
        <Dialog open>
          <DialogContent asChild>
            <section data-testid="dialog">
              <DialogTitle>Title</DialogTitle>
              <DialogDescription>Description</DialogDescription>
            </section>
          </DialogContent>
        </Dialog>
        <AlertDialog open>
          <AlertDialogContent asChild>
            <section data-testid="alert">
              <AlertDialogTitle>Title</AlertDialogTitle>
              <AlertDialogDescription>Description</AlertDialogDescription>
            </section>
          </AlertDialogContent>
        </AlertDialog>
      </ShadeApp>,
    );

    const dialog = await screen.findByTestId('dialog');
    const alert = await screen.findByTestId('alert');
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(alert.getAttribute('role')).toBe('alertdialog');
    expect(fake.container.contains(dialog)).toBe(true);
    expect(fake.container.contains(alert)).toBe(true);
    expect(fake.holds.map((hold) => hold.element)).toEqual(expect.arrayContaining([dialog, alert]));
  });

  it('leaves a non-modal dialog in the page, which stays usable around it', async () => {
    render(
      <ShadeApp darkMode={false} overlay={fake.overlay}>
        <ProbeDialog modal={false} />
      </ShadeApp>,
    );

    fireEvent.click(screen.getByText('Open'));

    const dialog = await screen.findByTestId('dialog');
    expect(fake.container.contains(dialog)).toBe(false);
    expect(fake.holds.length).toBe(0);
  });

  it('leaves a non-modal sheet in the page too', async () => {
    render(
      <ShadeApp darkMode={false} overlay={fake.overlay}>
        <Sheet modal={false} open>
          <SheetContent data-testid="sheet">
            <SheetTitle>Settings</SheetTitle>
            <SheetDescription>Description</SheetDescription>
          </SheetContent>
        </Sheet>
      </ShadeApp>,
    );

    const sheet = await screen.findByTestId('sheet');
    expect(fake.container.contains(sheet)).toBe(false);
    expect(fake.holds.length).toBe(0);
  });

  it('renders a non-modal sheet opened from a dialog in the overlay in the overlay too', async () => {
    render(
      <ShadeApp darkMode={false} overlay={fake.overlay}>
        <Dialog open>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Description</DialogDescription>
            <Sheet modal={false} open>
              <SheetContent data-testid="sheet">
                <SheetTitle>Settings</SheetTitle>
                <SheetDescription>Description</SheetDescription>
              </SheetContent>
            </Sheet>
          </DialogContent>
        </Dialog>
      </ShadeApp>,
    );

    const sheet = await screen.findByTestId('sheet');
    expect(fake.container.contains(sheet)).toBe(true);
    // Only the dialog holds the overlay.
    expect(fake.holds.map((hold) => hold.tint)).toEqual(['dialog']);
  });

  it('stays in the page once open there, even if the overlay becomes available', async () => {
    fake.container.remove();
    fake = fakeOverlay(false);
    function Rerendering() {
      const [count, setCount] = React.useState(0);
      return (
        <Dialog defaultOpen>
          <DialogContent data-testid="dialog">
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Description</DialogDescription>
            <button type="button" onClick={() => setCount(count + 1)}>
              Clicked {count}
            </button>
          </DialogContent>
        </Dialog>
      );
    }
    render(
      <ShadeApp darkMode={false} overlay={fake.overlay}>
        <Rerendering />
      </ShadeApp>,
    );
    const dialog = await screen.findByTestId('dialog');

    fake.makeAvailable();
    fireEvent.click(screen.getByText('Clicked 0'));

    await screen.findByText('Clicked 1');
    expect(screen.getByTestId('dialog')).toBe(dialog);
    expect(fake.container.contains(dialog)).toBe(false);
    expect(fake.holds.length).toBe(0);
  });

  it('renders a dialog in Radix’s own root in the overlay too', async () => {
    render(
      <ShadeApp darkMode={false} overlay={fake.overlay}>
        <DialogPrimitive.Root>
          <DialogPrimitive.Trigger>Open</DialogPrimitive.Trigger>
          <DialogContent data-testid="dialog">
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Description</DialogDescription>
          </DialogContent>
        </DialogPrimitive.Root>
      </ShadeApp>,
    );

    fireEvent.click(screen.getByText('Open'));

    expect(fake.container.contains(await screen.findByTestId('dialog'))).toBe(true);
    expect(fake.holds.map((hold) => hold.open)).toEqual([[true]]);
  });

  /** Opens a dialog in an overlay in another document, as an app's is, with a tooltip in it. */
  async function tooltipInOverlayFrame() {
    // The overlay is in a frame Admin has focused, so the page's window blurred.
    const frame = document.createElement('iframe');
    document.body.append(frame);
    const overlayDocument = frame.contentDocument as Document;
    setSafeArea(overlayDocument, '0px');
    fake.container.remove();
    overlayDocument.body.append(fake.container);
    vi.stubGlobal('PointerEvent', MouseEvent);
    render(
      <ShadeApp darkMode={false} overlay={fake.overlay}>
        <Dialog open>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Description</DialogDescription>
            <Tooltip delayDuration={0}>
              <TooltipTrigger>Info</TooltipTrigger>
              <TooltipContent>More about this</TooltipContent>
            </Tooltip>
          </DialogContent>
        </Dialog>
      </ShadeApp>,
    );
    const trigger = await waitFor(() => {
      const found = [...fake.container.querySelectorAll('button')].find(
        (button) => button.textContent === 'Info',
      );
      expect(found).toBeDefined();
      return found as HTMLElement;
    });

    act(() => {
      window.dispatchEvent(new Event('blur'));
    });
    fireEvent.pointerMove(trigger, { pointerType: 'mouse' });
    await waitFor(() => expect(fake.container.textContent).toContain('More about this'));
    return { frame, trigger };
  }

  it('shows a tooltip in a dialog in the overlay, whose input arrives in the overlay’s document', async () => {
    await tooltipInOverlayFrame();
  });

  it('closes a tooltip in a dialog in the overlay as the overlay’s window loses focus', async () => {
    const { frame } = await tooltipInOverlayFrame();

    act(() => {
      frame.contentWindow!.dispatchEvent(new Event('blur'));
    });

    await waitFor(() => expect(fake.container.textContent).not.toContain('More about this'));
  });

  it('closes a tooltip in a dialog in the overlay as the dialog scrolls', async () => {
    const { trigger } = await tooltipInOverlayFrame();

    act(() => {
      trigger.closest('[role=dialog]')!.dispatchEvent(new Event('scroll'));
    });

    await waitFor(() => expect(fake.container.textContent).not.toContain('More about this'));
  });

  it('gives the dialog’s content to a new ref passed while it’s open, and takes it from the old one', async () => {
    const first = React.createRef<HTMLDivElement>();
    const second = React.createRef<HTMLDivElement>();
    const Probe = ({ contentRef }: { contentRef: React.Ref<HTMLDivElement> }) => (
      <ShadeApp darkMode={false} overlay={fake.overlay}>
        <Dialog defaultOpen>
          <DialogContent ref={contentRef} data-testid="dialog">
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Description</DialogDescription>
          </DialogContent>
        </Dialog>
      </ShadeApp>
    );
    const { rerender } = render(<Probe contentRef={first} />);
    const dialog = await screen.findByTestId('dialog');
    expect(first.current).toBe(dialog);

    rerender(<Probe contentRef={second} />);

    expect(first.current).toBeNull();
    expect(second.current).toBe(dialog);
    // Still the one hold: the content didn't detach.
    expect(fake.holds.length).toBe(1);
    expect(fake.holds[0].released).toBe(false);
  });

  it('calls a new callback ref only while the dialog’s content is mounted, as React would', async () => {
    const calls: string[] = [];
    const Probe = ({ open }: { open: boolean }) => (
      <ShadeApp darkMode={false} overlay={fake.overlay}>
        <Dialog open={open}>
          <DialogContent ref={(element) => calls.push(element ? 'element' : 'null')}>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Description</DialogDescription>
          </DialogContent>
        </Dialog>
      </ShadeApp>
    );
    const { rerender } = render(<Probe open={false} />);

    // A new inline ref on each render, while closed.
    rerender(<Probe open={false} />);
    rerender(<Probe open={false} />);
    expect(calls).toEqual([]);

    rerender(<Probe open />);
    await screen.findByRole('dialog');
    expect(calls).toEqual(['element']);
  });

  it('renders in the page when the overlay has nowhere to render, and takes no hold', async () => {
    fake.container.remove();
    fake = fakeOverlay(false);
    render(
      <ShadeApp darkMode={false} overlay={fake.overlay}>
        <ProbeDialog />
      </ShadeApp>,
    );

    fireEvent.click(screen.getByText('Open'));

    const dialog = await screen.findByTestId('dialog');
    expect(fake.container.contains(dialog)).toBe(false);
    expect(fake.holds.length).toBe(0);
  });
});
