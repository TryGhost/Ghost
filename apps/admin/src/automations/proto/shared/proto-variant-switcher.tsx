import React, {useCallback, useContext, useState} from 'react';
import {Button, DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger} from '@tryghost/shade/components';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {ProtoVariantsContext, readStoredSelections, resolveVariantId, writeStoredSelections} from './proto-variants';
import type {ProtoSlot, ProtoVariantSelections} from './proto-variants';

// The component half of the proto variant system (see proto-variants.ts for
// the slot/selection model): the provider that holds selections and the small
// flask button that flips them.

export const ProtoVariantsProvider: React.FC<{slots: ProtoSlot[]; children: React.ReactNode}> = ({slots, children}) => {
    const [selections, setSelections] = useState<ProtoVariantSelections>(readStoredSelections);

    const select = useCallback((slotId: string, variantId: string) => {
        setSelections((prev) => {
            const next = {...prev, [slotId]: variantId};
            writeStoredSelections(next);
            return next;
        });
    }, []);

    return (
        <ProtoVariantsContext.Provider value={{slots, selections, select}}>
            {children}
        </ProtoVariantsContext.Provider>
    );
};

// The small corner button. Quiet by design — it's researcher chrome, not
// product UI. Opens upward with each slot as a labelled radio group.
export const ProtoVariantSwitcher: React.FC<{className?: string}> = ({className}) => {
    const [open, setOpen] = useState(false);
    const ctx = useContext(ProtoVariantsContext);
    if (!ctx) {
        return null;
    }
    return (
        <div className={cn('absolute right-4 bottom-4 z-30', className)}>
            <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                    <Button aria-label="Prototype variations" className={cn('text-muted-foreground', open && 'bg-muted')} size="icon" variant="ghost">
                        <LucideIcon.FlaskConical strokeWidth={2} />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top">
                    {ctx.slots.map(slot => (
                        <React.Fragment key={slot.id}>
                            <DropdownMenuLabel>{slot.label}</DropdownMenuLabel>
                            <DropdownMenuRadioGroup
                                value={resolveVariantId(slot, ctx.selections)}
                                onValueChange={variantId => ctx.select(slot.id, variantId)}
                            >
                                {slot.variants.map(variant => (
                                    <DropdownMenuRadioItem key={variant.id} value={variant.id}>
                                        {variant.label}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </React.Fragment>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};
