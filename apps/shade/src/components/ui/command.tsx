'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  type DialogContentProps,
  DialogTitle,
} from '@/components/ui/dialog';
import { type DialogProps } from '@radix-ui/react-dialog';
import { Command as CommandPrimitive } from 'cmdk';
import { Check, LucideIcon, Search } from 'lucide-react';

function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      className={cn(
        'flex size-full flex-col overflow-hidden rounded-menu bg-transparent text-popover-foreground',
        className,
      )}
      {...props}
    />
  );
}

type CommandDialogProps = Pick<DialogProps, 'open' | 'defaultOpen' | 'onOpenChange' | 'modal'> &
  // The palette owns what the content renders and when it mounts.
  Omit<DialogContentProps, 'title' | 'asChild' | 'forceMount'> & {
    /** The dialog's name for screen readers. It isn't shown. */
    title?: string;
  };

// Where the focus can go back to when a CommandDialog closes, best first: the element that had it
// when the dialog opened, then, as a menu item unmounts with its menu, the button that opened the
// menu, which labels it. A submenu is labelled by an item of its parent menu, so this walks up.
function returnFocusCandidates(element: Element | null): HTMLElement[] {
  const candidates: HTMLElement[] = [];
  let candidate = element;
  while (
    candidate instanceof HTMLElement &&
    candidate !== candidate.ownerDocument.body &&
    !candidates.includes(candidate) &&
    candidates.length < 5
  ) {
    candidates.push(candidate);
    const menuButtonId = candidate.closest('[role="menu"]')?.getAttribute('aria-labelledby');
    candidate = menuButtonId ? candidate.ownerDocument.getElementById(menuButtonId) : null;
  }
  return candidates;
}

const CommandDialog = ({
  children,
  className,
  title = 'Command palette',
  open,
  defaultOpen,
  onOpenChange,
  modal,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: CommandDialogProps) => {
  // There's never a DialogTrigger, so Radix would leave the focus on the page body.
  const returnFocusRef = React.useRef<HTMLElement[]>([]);

  return (
    <Dialog defaultOpen={defaultOpen} modal={modal} open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // The palette has no description. Radix would point at one that isn't there.
        aria-describedby={undefined}
        className={cn('overflow-hidden p-0 shadow-lg', className)}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event);
          if (event.defaultPrevented) {
            return;
          }
          event.preventDefault();
          const candidates = returnFocusRef.current;
          returnFocusRef.current = [];
          // Leave the focus alone if something else has taken it.
          if (document.activeElement && document.activeElement !== document.body) {
            return;
          }
          // A candidate that's gone, or can't take the focus, doesn't.
          for (const candidate of candidates) {
            candidate.focus();
            if (document.activeElement === candidate) {
              break;
            }
          }
        }}
        onOpenAutoFocus={(event) => {
          // This runs before the dialog moves the focus inside.
          returnFocusRef.current = returnFocusCandidates(document.activeElement);
          onOpenAutoFocus?.(event);
        }}
        {...props}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:size-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:size-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
};

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      className="flex items-center border-b border-border px-3"
      {...{ 'cmdk-input-wrapper': '' }}
      data-slot="command-input"
    >
      <Search className="me-2 size-4 shrink-0 opacity-50" />
      <CommandPrimitive.Input
        className={cn(
          'flex h-11 w-full rounded-control bg-transparent py-3 text-(length:--text-control) text-foreground outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    </div>
  );
}

function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      className={cn('max-h-[300px] overflow-x-hidden overflow-y-auto p-1', className)}
      data-slot="command-list"
      {...props}
    />
  );
}

function CommandEmpty({ ...props }: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      className="py-6 text-center text-sm"
      data-slot="command-empty"
      {...props}
    />
  );
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      className={cn(
        'overflow-hidden p-1.5 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground',
        className,
      )}
      data-slot="command-group"
      {...props}
    />
  );
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      className={cn('-mx-1.5 h-px bg-border', className)}
      data-slot="command-separator"
      {...props}
    />
  );
}

function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      className={cn(
        'relative flex cursor-default items-center gap-2 rounded-menu-item px-2 py-1.5 text-(length:--text-control) text-foreground outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-interactive-hover [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
        '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.5px]',
        className,
      )}
      data-slot="command-item"
      {...props}
    />
  );
}

const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn('ms-auto text-xs tracking-widest text-muted-foreground', className)}
      data-slot="command-shortcut"
      {...props}
    />
  );
};

interface ButtonArrowProps extends React.SVGProps<SVGSVGElement> {
  icon?: LucideIcon; // Allows passing any Lucide icon
}

function CommandCheck({ icon: Icon = Check, className, ...props }: ButtonArrowProps) {
  return (
    <Icon
      className={cn('ms-auto size-4 text-primary', className)}
      data-check="true"
      data-slot="command-check"
      {...props}
    />
  );
}

export {
  Command,
  CommandCheck,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
};
