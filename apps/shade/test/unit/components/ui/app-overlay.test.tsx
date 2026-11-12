import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
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

/** An app's overlay, as the app SDK gives one: an element, and the holds dialogs take on it. */
function fakeOverlay(initiallyAvailable = true) {
  let available = initiallyAvailable;
  const container = document.createElement('div');
  container.setAttribute('data-testid', 'overlay');
  document.body.append(container);
  const holds: {
    tint: AppOverlayTint;
    element: HTMLElement;
    open: boolean[];
    released: boolean;
    refused: () => void;
  }[] = [];
  const overlay: AppOverlay = {
    container: () => (available ? container : undefined),
    hold: (tint, element, refused): AppOverlayHold => {
      const hold = { tint, element, open: [] as boolean[], released: false, refused };
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
  });

  afterEach(() => {
    fake.container.remove();
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

  it('leaves a sheet on any side but the right in the page, where Admin can’t show it', async () => {
    render(
      <ShadeApp darkMode={false} overlay={fake.overlay}>
        <Sheet open>
          <SheetContent data-testid="sheet" side="left">
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

  it('moves to the page when Admin refuses to show the overlay, until it next opens', async () => {
    render(
      <ShadeApp darkMode={false} overlay={fake.overlay}>
        <ProbeDialog />
      </ShadeApp>,
    );
    fireEvent.click(screen.getByText('Open'));
    expect(fake.container.contains(await screen.findByTestId('dialog'))).toBe(true);

    act(() => fake.holds[0].refused());

    await waitFor(() => expect(fake.holds[0].released).toBe(true));
    const dialog = screen.getByTestId('dialog');
    expect(fake.container.contains(dialog)).toBe(false);
    expect(dialog.getAttribute('data-state')).toBe('open');
    // With its own tint, as Admin draws none.
    const backdrop = document.querySelector<HTMLElement>('[data-state="open"].fixed.inset-0');
    expect(backdrop?.style.background).toBe('');
    expect(fake.holds.length).toBe(1);

    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByTestId('dialog')).toBeNull());
    fireEvent.click(screen.getByText('Open'));

    expect(fake.container.contains(await screen.findByTestId('dialog'))).toBe(true);
    expect(fake.holds.length).toBe(2);
  });

  it('shows a tooltip in a dialog in the overlay, whose input arrives in the overlay’s document', async () => {
    // The overlay is another document, in a frame Admin has focused, so the page's window blurred.
    const frame = document.createElement('iframe');
    document.body.append(frame);
    const overlayDocument = frame.contentDocument as Document;
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
    frame.remove();
    vi.unstubAllGlobals();
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
    vi.restoreAllMocks();
  });
});
