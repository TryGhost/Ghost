import CustomFieldIcon from '@/shared/member-custom-fields/custom-field-icon';
import {Badge, Button, Command, CommandCheck, CommandGroup, CommandInput, CommandItem, CommandList, Popover, PopoverContent, PopoverTrigger, commandDefaultFilter, inputSurfaceClasses} from '@tryghost/shade/components';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {useRef} from 'react';
import {type MemberCustomFieldCsvColumn} from '@tryghost/admin-x-framework/api/member-custom-fields';

// One list, two sections, so what a column can be imported as is answered by reading rather
// than by trying each kind in turn. The section a field sits in is what tells a native "Name"
// apart from a custom field someone called "Name", and the trigger has to carry that once the
// list is closed.
//
// Marked only where that is in doubt: a custom field whose name a native field already has.
// Naming every row's kind put "Membership field" under nearly the whole table to settle a
// question almost none of those rows raise, and a mark that appears where two things read the
// same is the same answer without the noise. Its own word rather than CUSTOM_GROUP: the
// headings pluralise with a bare `s`, and a badge has less room than a line of its own had.
const NATIVE_GROUP = 'Membership field';
const CUSTOM_GROUP = 'Custom field';
const CUSTOM_BADGE = 'Custom';

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

// "Shipping Address (Address line 1)" -> ["Shipping Address", "(Address line 1)"]. The parts of
// a composite are labelled `${name} (${part})` in memberCustomFieldCsvColumns, so every row of
// one address reads the same until its last few words. Split here, the name is what gives way to
// a narrow column and the part stays whole; truncating the label as one string takes away the
// only thing telling those rows apart. Anything without a bracketed tail has nothing to protect.
function splitPartLabel(label: string): [string, string] {
    const parted = /^(.*) (\([^()]*\))$/.exec(label);
    return parted ? [parted[1], parted[2]] : [label, ''];
}

// Case and surrounding space are no help in telling two of these apart on sight, so a name that
// differs only by them counts as the same name.
function sameLabel(a: string, b: string): boolean {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// Scored over the label alone, which the list's items carry as their one keyword. Identity is the
// target instead, and cmdk scores an item's value and its keywords as one joined string — so with
// the target in there, "custom" reached every namespaced column, and a match was free to run from
// one into the other: `subscribed_to_emails` and its own label together hold a c-u-s-t-o-m that
// neither holds by itself. Naming what to search leaves the target doing nothing but telling two
// fields of the same name apart.
function scoreByLabel(_target: string, query: string, keywords?: string[]): number {
    return commandDefaultFilter((keywords ?? []).join(' '), query);
}

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
    const [labelHead, labelTail] = splitPartLabel(selected?.label ?? '');
    // Against what this picker is offering rather than the whole native set, since Tier is only
    // among them on a site with tiers to import onto — where it is not offered, a custom field
    // called "Tier" is the only "Tier" in the list and has nothing to be told apart from.
    const ambiguous = selectedCustom !== undefined
        && fieldMappings.some(native => sameLabel(native.label, selectedCustom.label));

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
                    // selection — the whole point of the label below — would never be read.
                    // Every custom field names its kind here, not only the ones the badge marks.
                    // The badge is spent narrowly because it costs room in a column that has none
                    // to spare; a name read aloud costs nothing, so there is no reason to hold it
                    // back from the rest. Spelled out in full, since "Custom" alone names nothing.
                    aria-label={selected ? `Field for ${columnKey}, ${selected.label}${selectedCustom ? `, ${CUSTOM_GROUP}` : ''}` : `Field for ${columnKey}, not chosen`}
                    className={cn(
                        // px-2 rather than the combobox recipe's px-3: at the 32px control height a
                        // 16px icon sits 8px off the top and bottom, and the same 8px at the start
                        // squares that off. It is what the list's own items are set to, so the
                        // icon does not move sideways as the popover opens under it.
                        'h-(--control-height) w-full scroll-my-8 justify-start gap-2 px-2 font-normal',
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
                    {/* Flat and inline, the way these same icons sit inside the list below. The
                        tile they used to sit in was answering to the second line of text: two
                        lines give a loose glyph nothing to be centred against, and the tile both
                        gave it somewhere to sit and held the row's height open. With one line
                        left, neither job remains, and the control comes back to the height every
                        other one in Shade stands at.

                        Empty still carries a mark of its own, so the names down the column all
                        start in the same place whether a row is filled or not. An outline reads
                        as a slot still to fill rather than as a thing with no icon. */}
                    <span className={cn('flex shrink-0 items-center', disabled && 'opacity-60')}>
                        {selectedCustom && <CustomFieldIcon className="size-4 text-foreground" type={selectedCustom.type} />}
                        {selectedNative && <NativeIcon className="size-4 text-foreground" value={selectedNative.value} />}
                        {!selected && <span className="size-4 rounded-sm border border-dashed border-border-strong" />}
                    </span>
                    {selected ? (
                        // The badge sits against the end of the control rather than trailing the
                        // name, so it holds the same place on every row it appears on instead of
                        // one that moves with the length of the label. flex-1 on the label is what
                        // puts it there.
                        <>
                            <span className={cn('flex min-w-0 flex-1 items-baseline text-left text-sm font-medium', disabled && 'opacity-60')}>
                                {/* Both give way, the name far sooner: shrink is a ratio, so a name
                                    set to shrink hundreds of times faster is spent down to nothing
                                    before the part it belongs to loses a character. What it cannot
                                    be is unshrinkable — a part with nowhere to give runs out of the
                                    control instead of truncating, which is what a narrow screen
                                    does to an address. Nothing is lost with the name gone: the
                                    column it maps from is named in full one cell to the left. */}
                                <span className="min-w-0 shrink-[999] truncate">{labelHead}</span>
                                {/* The space belongs to the text rather than to a gap between the
                                    two boxes: read out, copied, or asserted on, this is one label
                                    and it reads as one. Held by whitespace-pre, which is what stops
                                    a space at the start of a box being dropped. */}
                                {labelTail && <span className="min-w-0 truncate whitespace-pre">{` ${labelTail}`}</span>}
                            </span>
                            {/* Dropped on a narrow screen, where it is taking width from a label
                                that has none to give. Worth being plain about the trade: it only
                                appears where it is the one thing telling two same-named fields
                                apart, so this gives that up exactly where it was earning its keep,
                                and the name it makes room for is the more useful half of the row.
                                The kind survives in the accessible name and in the open list. */}
                            {ambiguous && <Badge className={cn('ms-2 shrink-0 max-md:hidden', disabled && 'opacity-60')} variant="secondary">{CUSTOM_BADGE}</Badge>}
                        </>
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
                <Command className="min-h-0" filter={scoreByLabel}>
                    <CommandInput className="h-(--control-height) shrink-0" placeholder="Search fields..." value={search} onValueChange={onSearchChange} />
                    {/* Shade's own max-height stands; only the shrinking is added. flex-1 with
                        min-h-0 lets the list give up height to the available-height cap on the
                        content above, which is what keeps a row near the bottom of the dialog
                        from opening a list that runs off the screen. */}
                    <CommandList className="min-h-0 flex-1">
                        {/* Keyed by the target rather than by the label, because a site can call a
                            custom field "Name" and then two items carry the same label. cmdk holds
                            the highlighted item as a value and marks every item equal to it, so a
                            shared label is one item to it: both rows light up, and the one Enter
                            takes is whichever the DOM has first — always the native one, whichever
                            was arrowed to. The targets are already distinct, namespaced apart as
                            `name` and `custom_fields.name`, so they are what identity is taken
                            from, and the label moves to keywords, which is what scoreByLabel reads
                            so that search still answers to the name on the row. */}
                        <CommandGroup heading={`${NATIVE_GROUP}s`}>
                            {fieldMappings.map(field => (
                                <CommandItem key={field.value} keywords={[field.label]} value={field.value} onSelect={() => choose(field.value)}>
                                    <NativeIcon value={field.value} />
                                    <span className="truncate">{field.label}</span>
                                    {value === field.value && <CommandCheck />}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        <CommandGroup heading={`${CUSTOM_GROUP}s`}>
                            {customFieldMappings.map(field => (
                                <CommandItem key={field.value} keywords={[field.label]} value={field.value} onSelect={() => choose(field.value)}>
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
