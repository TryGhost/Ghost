import React, {useEffect, useRef} from 'react';
import {Popover, PopoverContent, PopoverTrigger} from '@tryghost/shade/components';
import {LucideIcon, cn} from '@tryghost/shade/utils';

// A popover list where every row is an icon chip, a title and a description.
//
// This shape keeps recurring in the automations editor — choosing a step to add,
// choosing what triggers the automation — and each place had grown its own
// version, so they drifted. One component instead, because these are the same
// decision wearing different labels: pick one thing from a short, closed set
// where the name alone doesn't tell you what it does. The description is the
// point; a bare label list would be a menu, and a menu is what these were before.
//
// It speaks the node card's vocabulary rather than inventing menu chrome: the
// same icon chip as a card header (muted fill, size-4 glyph) and the same width
// as a field inside a card, so a list opened from a card reads as that card
// continuing rather than as generic UI floating over it.

// A node card is w-[400px] with p-6, so a field inside one is 352px — which is
// also what a Select's dropdown inherits from its trigger. Matching it keeps
// every popover opened from a card on a single width.
export const OPTION_PICKER_WIDTH = 'w-[352px]';

export interface PickerOption<Value extends string> {
    value: Value;
    icon: React.ElementType;
    title: string;
    description: string;
}

const PickerRow = <Value extends string>({option, selected, onSelect}: {
    option: PickerOption<Value>;
    selected: boolean;
    onSelect: (value: Value) => void;
}) => {
    const Icon = option.icon;
    return (
        <button
            // p-4 echoes the card's p-6 without a two-option list turning into a
            // wall — close enough to read as the same family, short enough that
            // the whole set is still one glance.
            className="flex w-full items-center gap-3 rounded-lg p-4 text-left transition-colors hover:bg-interactive-hover focus-visible:bg-interactive-hover focus-visible:outline-none"
            type="button"
            onClick={() => onSelect(option.value)}
        >
            {/* Identical to the node header's chip — same fill, same glyph size —
                so the icon you pick here is the icon you get on the card. */}
            <span className="flex shrink-0 items-center justify-center rounded-md bg-secondary p-2.5 text-foreground">
                <Icon className="size-4" />
            </span>
            <div className="flex min-w-0 flex-col">
                <span className="text-md font-medium">{option.title}</span>
                <span className="text-sm text-muted-foreground">{option.description}</span>
            </div>
            {selected && <LucideIcon.Check className="ml-auto size-4 shrink-0" />}
        </button>
    );
};

interface OptionPickerProps<Value extends string> {
    options: PickerOption<Value>[];
    // Marks the current choice. Set it for pickers that edit a value (the
    // trigger, which always has one); leave it off for pickers that perform an
    // action (adding a step, where nothing is "current").
    value?: Value;
    onSelect: (value: Value) => void;
    // The control the list hangs off.
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    align?: 'start' | 'center' | 'end';
    side?: 'top' | 'bottom' | 'left' | 'right';
    sideOffset?: number;
}

export const OptionPicker = <Value extends string>({
    options,
    value,
    onSelect,
    children,
    open,
    onOpenChange,
    align = 'center',
    side = 'bottom',
    sideOffset = 8
}: OptionPickerProps<Value>) => {
    const triggerRef = useRef<HTMLButtonElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Dismiss on outside pointerdown, in the capture phase.
    //
    // Radix already does this, but for a left click it defers the dismissal to
    // the following `click` rather than acting on `pointerdown`. On a canvas
    // that click never arrives: a mousedown on the pane starts a d3-zoom
    // gesture, and d3 suppresses the trailing click (capture-phase
    // stopImmediatePropagation on the window) so a drag doesn't also fire one.
    // Radix listens in the bubble phase, downstream of that, so it never hears
    // it — and any pointer movement at all during the click is enough.
    //
    // Capturing pointerdown puts us ahead of the suppression. It also means a
    // pan closes the picker as the drag begins, which is the right moment:
    // you've already committed to moving the canvas, not to picking.
    useEffect(() => {
        if (!open) {
            return;
        }
        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node | null;
            if (!target) {
                return;
            }
            // The trigger is excluded because Radix toggles on its click — closing
            // here would let that toggle reopen what the user just dismissed.
            if (contentRef.current?.contains(target) || triggerRef.current?.contains(target)) {
                return;
            }
            onOpenChange(false);
        };
        document.addEventListener('pointerdown', handlePointerDown, true);
        return () => document.removeEventListener('pointerdown', handlePointerDown, true);
    }, [open, onOpenChange]);

    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger ref={triggerRef} asChild>{children}</PopoverTrigger>
            {/* p-2 gutter so a row's hover fill stops short of the popover's own
                edge — the rows carry the padding, the container just frames them.

                updatePositionStrategy="always" is what keeps this pinned on a
                React Flow canvas. Radix positions portalled content with
                floating-ui's autoUpdate, which by default only recomputes on
                scroll and resize — but panning a canvas is neither: it's a CSS
                transform on the viewport, so nothing fires and the popover stays
                behind while its trigger slides away. "always" recomputes every
                animation frame instead, which tracks the transform. */}
            <PopoverContent
                ref={contentRef}
                align={align}
                className={cn('p-2', OPTION_PICKER_WIDTH)}
                side={side}
                sideOffset={sideOffset}
                updatePositionStrategy="always"
            >
                {options.map(option => (
                    <PickerRow
                        key={option.value}
                        option={option}
                        selected={option.value === value}
                        // Picking closes the list — every use of this is a single
                        // choice, so leaving it open would just be a second click.
                        onSelect={(next) => {
                            onOpenChange(false);
                            onSelect(next);
                        }}
                    />
                ))}
            </PopoverContent>
        </Popover>
    );
};
