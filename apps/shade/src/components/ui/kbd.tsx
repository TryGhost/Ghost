import {cn} from '@/lib/utils';

function Kbd({className, ...props}: React.ComponentProps<'kbd'>) {
    return (
        <kbd
            className={cn(
                'pointer-events-none m-0 inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-xs border-none bg-muted px-1 font-sans text-xs font-medium text-muted-foreground shadow-none select-none text-shadow-none',
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
