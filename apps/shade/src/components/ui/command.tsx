'use client';

import React from 'react';
import {cn} from '@/lib/utils';
import {Dialog, DialogContent, DialogTitle} from '@/components/ui/dialog';
import {type DialogProps} from '@radix-ui/react-dialog';
import {Command as CommandPrimitive} from 'cmdk';
import {Check, LucideIcon, Search} from 'lucide-react';

function Command({className, ...props}: React.ComponentProps<typeof CommandPrimitive>) {
    return (
        <CommandPrimitive
            className={cn(
                'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
                className
            )}
            {...props}
        />
    );
}

type CommandDialogProps = DialogProps & { className?: string };

const CommandDialog = ({children, className, ...props}: CommandDialogProps) => {
    return (
        <Dialog {...props}>
            <DialogContent className={cn('overflow-hidden p-0 shadow-lg', className)}>
                <DialogTitle className="hidden" />
                <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:size-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:size-5">
                    {children}
                </Command>
            </DialogContent>
        </Dialog>
    );
};

function CommandInput({className, ...props}: React.ComponentProps<typeof CommandPrimitive.Input>) {
    return (
        <div className="flex items-center border-b border-border px-3" {...{'cmdk-input-wrapper': ''}} data-slot="command-input">
            <Search className="me-2 size-4 shrink-0 opacity-50" />
            <CommandPrimitive.Input
                className={cn(
                    'flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-hidden text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
                    className
                )}
                {...props}
            />
        </div>
    );
}

function CommandList({className, ...props}: React.ComponentProps<typeof CommandPrimitive.List>) {
    return (
        <CommandPrimitive.List
            className={cn('max-h-[300px] p-1 overflow-y-auto overflow-x-hidden', className)}
            data-slot="command-list"
            {...props}
        />
    );
}

function CommandEmpty({...props}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
    return <CommandPrimitive.Empty className="py-6 text-center text-sm" data-slot="command-empty" {...props} />;
}

function CommandGroup({className, ...props}: React.ComponentProps<typeof CommandPrimitive.Group>) {
    return (
        <CommandPrimitive.Group
            className={cn(
                'overflow-hidden p-1.5 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground',
                className
            )}
            data-slot="command-group"
            {...props}
        />
    );
}

function CommandSeparator({className, ...props}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
    return (
        <CommandPrimitive.Separator
            className={cn('-mx-1.5 h-px bg-border', className)}
            data-slot="command-separator"
            {...props}
        />
    );
}

function CommandItem({className, ...props}: React.ComponentProps<typeof CommandPrimitive.Item>) {
    return (
        <CommandPrimitive.Item
            className={cn(
                'relative flex text-foreground cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-hidden data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
                '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.5px]',
                className
            )}
            data-slot="command-item"
            {...props}
        />
    );
}

const CommandShortcut = ({className, ...props}: React.HTMLAttributes<HTMLSpanElement>) => {
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

function CommandCheck({icon: Icon = Check, className, ...props}: ButtonArrowProps) {
    return (
        <Icon
            className={cn('size-4 ms-auto text-primary', className)}
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
    CommandShortcut
};
