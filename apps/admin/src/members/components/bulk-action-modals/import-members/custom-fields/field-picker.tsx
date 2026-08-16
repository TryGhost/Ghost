import CustomFieldIcon from '@/shared/member-custom-fields/custom-field-icon';
import {Button, Command, CommandCheck, CommandGroup, CommandInput, CommandItem, CommandList, Popover, PopoverContent, PopoverTrigger, inputSurfaceClasses} from '@tryghost/shade/components';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {useRef} from 'react';
import {type MemberCustomFieldCsvColumn} from '@tryghost/admin-x-framework/api/member-custom-fields';

// One list, two sections, so what a column can be imported as is answered by reading rather
// than by trying each kind in turn. The section a field sits in is what tells a native "Name"
// apart from a custom field someone called "Name", so the trigger repeats it once chosen.
const NATIVE_GROUP = 'Membership field';
const CUSTOM_GROUP = 'Custom field';

// Icons for the native targets. Written here rather than taken from somewhere shared because
// nothing shared exists: the members filter picker hand-writes its own switch, and analytics
// its own inline. Custom fields do have a registry, which is why they use CustomFieldIcon
// below instead of appearing here — a new field type gets its icon from that one place.
const NATIVE_ICONS: Record<string, typeof LucideIcon.Type> = {
    email: LucideIcon.Mail,
    name: LucideIcon.User,
    note: LucideIcon.StickyNote,
    subscribed_to_emails: LucideIcon.Send,
    stripe_customer_id: LucideIcon.CreditCard,
    // A comp, in the sense a venue means it: paid access granted rather than bought. Gift is
    // taken, and would be the wrong reading anyway — gift_id is an actual gift someone sent.
    complimentary_plan: LucideIcon.Ticket,
    labels: LucideIcon.Tag,
    created_at: LucideIcon.Calendar,
    gift_id: LucideIcon.Gift,
    import_tier: LucideIcon.Star
};

function NativeIcon({value, className}: {value: string; className?: string}) {
    const Icon = NATIVE_ICONS[value] ?? LucideIcon.Type;
    return <Icon className={className} />;
}

interface FieldPickerProps {
    className?: string;
    columnKey: string;
    value: string | null;
    disabled?: boolean;
    invalid?: boolean;
    fieldMappings: {label: string; value: string}[];
    customFieldMappings: MemberCustomFieldCsvColumn[];
    // Open and search are the caller's, not this component's: creating a composite has to
    // reopen this row's picker filtered to the field it just made, so which picker is open and
    // what it is filtered by have to be sayable from outside.
    open: boolean;
    search: string;
    onOpenChange: (open: boolean) => void;
    onSearchChange: (search: string) => void;
    onSelect: (target: string) => void;
    onCreateField: () => void;
    triggerRef: (node: HTMLElement | null) => void;
}

export function FieldPicker({
    className,
    columnKey,
    value,
    disabled,
    invalid,
    fieldMappings,
    customFieldMappings,
    open,
    search,
    onOpenChange,
    onSearchChange,
    onSelect,
    onCreateField,
    triggerRef
}: FieldPickerProps) {
    // Choosing to add a field replaces this list with a form, and the form's first input should
    // hold the focus rather than the button that opened the list. Two things are in the way, and
    // both are the modal popover doing its job: it hands focus back to the trigger on close, and
    // its focus trap stays alive through the exit animation — so a form mounted alongside it has
    // its autoFocus pulled straight back inside. Both are dealt with at teardown, below.
    const openingCreateForm = useRef(false);

    const selectedCustom = customFieldMappings.find(field => field.value === value);
    const selectedNative = fieldMappings.find(field => field.value === value);
    const selected = selectedCustom ?? selectedNative;

    const choose = (target: string) => {
        onOpenChange(false);
        onSelect(target);
    };

    return (
        <Popover
            open={open}
            // The table lives in a Dialog, whose react-remove-scroll only lets its own subtree
            // scroll — and this content is portalled to the body, outside it, so the wheel was
            // being swallowed while clicks still worked. Modal gives the popover its own scroll
            // manager, which allows the list it owns.
            modal
            onOpenChange={(next) => {
                // aria-disabled leaves the trigger live, so the refusal happens here rather
                // than in the DOM: it can be hovered and focused, and it does not open.
                if (disabled) {
                    return;
                }
                onOpenChange(next);
            }}
        >
            <PopoverTrigger asChild>
                {/* aria-disabled rather than the disabled attribute, which Shade pairs with
                    pointer-events-none — and an element taking no pointer events can show no
                    cursor, so there was nothing to say "not this row" on hover. Live, it keeps
                    the cursor and stays reachable by keyboard; onOpenChange does the refusing.

                    The fade is gentler than the button's own 50% because the border has to
                    survive it: at 50% on a greyed row the control read as absent. */}
                <Button
                    ref={triggerRef}
                    aria-disabled={disabled || undefined}
                    aria-invalid={invalid || undefined}
                    // Names the column and what it is mapped to. A bare "Field for <column>"
                    // would replace the trigger's own text in the accessible name, so the
                    // selection — the whole point of the two lines below — would never be read.
                    aria-label={selected ? `Field for ${columnKey}, ${selected.label}` : `Field for ${columnKey}, not chosen`}
                    className={cn(
                        'h-auto w-full scroll-my-8 justify-start gap-2 px-2.5 py-1.5 font-normal',
                        className,
                        // Button's outline hover (bg-button-hover) is what the Select trigger this
                        // replaced used too, so hovering weighs what it always did. Only the text
                        // shift is dropped: Button tints it on hover and the Select trigger did
                        // not.
                        'hover:text-current',
                        // Button has no invalid state of its own — the recipe the Select trigger
                        // this replaced was built from does, and a row the import was refused
                        // over has to look refused. Ring included, since the border alone is a
                        // hairline on a greyed row.
                        inputSurfaceClasses.invalidSelf,
                        'aria-[invalid=true]:ring-2',
                        // Not opacity on the control: that fades the border with everything else,
                        // and the border is the one part that has to stay drawn. The contents
                        // carry the fade instead, just below.
                        // Nothing to point at on a row that is out of the import, so no hover.
                        disabled && 'cursor-not-allowed hover:bg-transparent'
                    )}
                    role="combobox"
                    variant="outline"
                >
                    {/* Blocked rather than bare, the way the font pickers show a chosen face: next
                        to two lines of text a loose glyph reads as debris, and the tile gives it
                        somewhere to sit. Only here — inside the list the icons sit against a
                        single line and stay flat, as the filter picker has them.

                        The tile is what sets the control's height, so an empty row is exactly as
                        tall as a chosen one without a blank line held open to do it. Empty is an
                        outline: a slot still to fill, not a thing with no icon. */}
                    <span className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-md',
                        // Filled is the font picker's tile exactly (global-settings.tsx:53), at the
                        // size a table row can carry rather than its 48px: same border token, same
                        // elevated surface, same shadow.
                        selected && 'border border-border-default bg-surface-elevated shadow-xs',
                        disabled && 'opacity-60'
                    )}>
                        {selectedCustom && <CustomFieldIcon className="size-4 text-foreground" type={selectedCustom.type} />}
                        {selectedNative && <NativeIcon className="size-4 text-foreground" value={selectedNative.value} />}
                        {/* Inside the slot rather than filling it: an empty dashed outline reads
                            larger than a filled tile of the same size, since the border is the
                            whole shape and there is nothing inside to give it a middle. Drawn
                            smaller, the two look the same size — and the slot around it keeps its
                            32px, so a row does not change height as columns go in and out. */}
                        {!selected && <span className="size-7 rounded-md border border-dashed border-border-strong" />}
                    </span>
                    {selected ? (
                        // The field first, then which list it came from — without that second line
                        // a custom field named like a native one is indistinguishable once the
                        // list is closed.
                        <span className={cn('flex min-w-0 flex-col items-start text-left leading-tight', disabled && 'opacity-60')}>
                            <span className="w-full truncate text-sm font-medium">{selected.label}</span>
                            <span className="text-2xs text-muted-foreground">{selectedCustom ? CUSTOM_GROUP : NATIVE_GROUP}</span>
                        </span>
                    ) : (
                        <span className={cn('min-w-0 truncate text-sm text-muted-foreground', disabled && 'opacity-60')}>Select field</span>
                    )}
                    <LucideIcon.ChevronDown className="ms-auto size-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            {/* Sized and spaced as the members filter picker is (members-filters.tsx:156,
                filters.tsx:2636), rather than to its own taste: it is the same control doing the
                same job a few screens away, and two dialects of it is one too many.

                Bounded to the room Radix says it has rather than to a number of its own: a row
                near the bottom of a tall table has little of it, and a fixed height there runs
                off the screen with the list still scrolling inside. A column so the search box
                keeps its height and the list takes what is left. */}
            <PopoverContent
                align="start"
                className="flex max-h-(--radix-popover-content-available-height) w-(--radix-popover-trigger-width) min-w-64 flex-col p-0"
                collisionPadding={16}
                onCloseAutoFocus={(event) => {
                    if (!openingCreateForm.current) {
                        return;
                    }
                    openingCreateForm.current = false;
                    // Don't return focus to the trigger, and only now open the form: this fires
                    // as the trap releases, so the form mounts with nothing left to fight.
                    event.preventDefault();
                    onCreateField();
                }}
            >
                <Command className="min-h-0">
                    <CommandInput className="h-(--control-height) shrink-0" placeholder="Search fields..." value={search} onValueChange={onSearchChange} />
                    {/* Shade's own max-height stands; only the shrinking is added. flex-1 with
                        min-h-0 lets the list give up height to the available-height cap on the
                        content above, which is what keeps a row near the bottom of the dialog
                        from opening a list that runs off the screen. */}
                    <CommandList className="min-h-0 flex-1">
                        <CommandGroup heading={`${NATIVE_GROUP}s`}>
                            {fieldMappings.map(field => (
                                <CommandItem key={field.value} value={field.label} onSelect={() => choose(field.value)}>
                                    <NativeIcon value={field.value} />
                                    <span className="truncate">{field.label}</span>
                                    {value === field.value && <CommandCheck />}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        <CommandGroup heading={`${CUSTOM_GROUP}s`}>
                            {customFieldMappings.map(field => (
                                <CommandItem key={field.value} value={field.label} onSelect={() => choose(field.value)}>
                                    <CustomFieldIcon type={field.type} />
                                    <span className="truncate">{field.label}</span>
                                    {value === field.value && <CommandCheck />}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        {/* Its own group so it is the one thing search cannot take away: cmdk
                            hands a group's forceMount down to every item in it, so leaving this
                            among the fields would have pinned all of them too. A search matching
                            no field is the strongest signal there is that the field wanted does
                            not exist yet, and the answer to that is the way to make one — which
                            is why there is no empty state behind it. */}
                        <CommandGroup forceMount>
                            {/* With a plus, mirroring the label picker below this table. A
                                publisher can name a field something like "New field", so the
                                colour is what sets this apart from one. */}
                            <CommandItem
                                className="font-semibold text-green"
                                value="Add custom field"
                                forceMount
                                onSelect={() => {
                                    openingCreateForm.current = true;
                                    onOpenChange(false);
                                }}
                            >
                                <LucideIcon.Plus />
                                <span>Add custom field</span>
                            </CommandItem>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
