import {cn} from '@/lib/utils';

function Kbd({className, ...props}: React.ComponentProps<'kbd'>) {
    return (
        <kbd
            className={cn(
                'bg-muted text-muted-foreground pointer-events-none inline-flex h-5 w-fit min-w-5 select-none items-center justify-center gap-1 rounded-sm px-1 font-sans text-xs font-medium m-0 shadow-none border-none text-shadow-none',
                '[&_svg:not([class*=\'size-\'])]:size-3',
                '[[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10',
                className
            )}
            data-slot="kbd"
            {...props}
        />
    );
}

function KbdGroup({className, ...props}: React.ComponentProps<'div'>) {
    return (
        <kbd
            className={cn('inline-flex items-center gap-1', className)}
            data-slot="kbd-group"
            {...props}
        />
    );
}

export {Kbd, KbdGroup};
