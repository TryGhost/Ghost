import CustomFieldIcon from '@/shared/member-custom-fields/custom-field-icon';
import {
  Badge,
  Button,
  Command,
  CommandCheck,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  commandDefaultFilter,
  inputSurfaceClasses,
} from '@tryghost/shade/components';
import {
  FIELD_SOURCES,
  FIELD_SOURCE_ORDER,
  type FieldTarget,
} from '@/members/components/bulk-action-modals/import-members/custom-fields/field-targets';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { useRef } from 'react';

const MEMBERSHIP_ICONS: Record<string, typeof LucideIcon.Type> = {
  email: LucideIcon.Mail,
  name: LucideIcon.User,
  note: LucideIcon.StickyNote,
  subscribed_to_emails: LucideIcon.Send,
  stripe_customer_id: LucideIcon.CreditCard,
  // A comp, as a venue means it: gift_id is an actual gift someone sent.
  complimentary_plan: LucideIcon.Ticket,
  labels: LucideIcon.Tag,
  created_at: LucideIcon.Calendar,
  gift_id: LucideIcon.Gift,
  import_tier: LucideIcon.Star,
};

function unknownSourceIcon(_source: never, className?: string) {
  return <LucideIcon.Type className={className} />;
}

function TargetIcon({ target, className }: { target: FieldTarget; className?: string }) {
  switch (target.source) {
    case 'membership': {
      const Icon = MEMBERSHIP_ICONS[target.value] ?? LucideIcon.Type;
      return <Icon className={className} />;
    }
    case 'custom':
      return <CustomFieldIcon className={className} type={target.type} />;
    default:
      return unknownSourceIcon(target, className);
  }
}

// cmdk scores an item's value and keywords as one joined string, and a match may run from one
// into the other: with the target as identity, `subscribed_to_emails` and its label together
// hold a c-u-s-t-o-m that neither holds alone. Scored over the keyword — the label — only.
function scoreByLabel(_target: string, query: string, keywords?: string[]): number {
  return commandDefaultFilter((keywords ?? []).join(' '), query);
}

interface FieldPickerProps {
  className?: string;
  columnKey: string;
  value: string | null;
  disabled?: boolean;
  invalid?: boolean;
  targets: FieldTarget[];
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
  targets,
  open,
  search,
  onOpenChange,
  onSearchChange,
  onSelect,
  onCreateField,
  triggerRef,
}: FieldPickerProps) {
  // Choosing to add a field replaces this list with a form, and the form's first input should
  // hold the focus rather than the button that opened the list. Two things are in the way, and
  // both are the modal popover doing its job: it hands focus back to the trigger on close, and
  // its focus trap stays alive through the exit animation — so a form mounted alongside it has
  // its autoFocus pulled straight back inside. Both are dealt with at teardown, below.
  const openingCreateForm = useRef(false);

  const selected = targets.find((target) => target.value === value);
  const badge = selected?.contested ? FIELD_SOURCES[selected.source].badge : null;
  const ariaKind = selected ? FIELD_SOURCES[selected.source].ariaKind : null;

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
          aria-label={
            selected
              ? `Field for ${columnKey}, ${selected.label}${ariaKind ? `, ${ariaKind}` : ''}`
              : `Field for ${columnKey}, not chosen`
          }
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
            disabled && 'cursor-not-allowed hover:bg-transparent',
          )}
          role="combobox"
          variant="outline"
        >
          <span className={cn('flex shrink-0 items-center', disabled && 'opacity-60')}>
            {selected && <TargetIcon className="size-4 text-foreground" target={selected} />}
            {!selected && (
              <span className="size-4 rounded-sm border border-dashed border-border-strong" />
            )}
          </span>
          {selected ? (
            // flex-1 on the label is what holds the badge against the end of the
            // control, so it sits in the same place on every row it appears on.
            <>
              <span
                className={cn(
                  'flex min-w-0 flex-1 items-baseline text-left text-sm font-medium',
                  disabled && 'opacity-60',
                )}
              >
                {/* Every row of one address reads the same until the part, so the
                                    part is what has to survive a narrow column. Shrink is a ratio:
                                    at 999 the name is spent to nothing before the part loses a
                                    character. Not unshrinkable, or the part runs out of the
                                    control rather than truncating. */}
                <span className="min-w-0 shrink-[999] truncate">{selected.fieldName}</span>
                {/* whitespace-pre, or the leading space is dropped and the label
                                    reads as two. */}
                {selected.partLabel && (
                  <span className="min-w-0 truncate whitespace-pre">{` (${selected.partLabel})`}</span>
                )}
              </span>
              {/* Dropped where the label has no width to give; the kind survives in
                                the accessible name and in the open list. */}
              {badge && (
                <Badge
                  className={cn('ms-2 shrink-0 max-md:hidden', disabled && 'opacity-60')}
                  variant="secondary"
                >
                  {badge}
                </Badge>
              )}
            </>
          ) : (
            <span
              className={cn(
                'min-w-0 truncate text-sm text-muted-foreground',
                disabled && 'opacity-60',
              )}
            >
              Select field
            </span>
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
          <CommandInput
            className="h-(--control-height) shrink-0"
            placeholder="Search fields..."
            value={search}
            onValueChange={onSearchChange}
          />
          {/* Shade's own max-height stands; only the shrinking is added. flex-1 with
                        min-h-0 lets the list give up height to the available-height cap on the
                        content above, which is what keeps a row near the bottom of the dialog
                        from opening a list that runs off the screen. */}
          <CommandList className="min-h-0 flex-1">
            {/* A site can name a custom field "Name", and cmdk treats every item
                            equal to the highlighted value as the same item: both would light up,
                            and Enter would take whichever the DOM had first. Identity is the
                            target, which is namespaced and so already distinct; the label moves
                            to keywords for scoreByLabel. */}
            {FIELD_SOURCE_ORDER.map((source) => (
              <CommandGroup key={source} heading={FIELD_SOURCES[source].heading}>
                {targets
                  .filter((target) => target.source === source)
                  .map((target) => (
                    <CommandItem
                      key={target.value}
                      keywords={[target.label]}
                      value={target.value}
                      onSelect={() => choose(target.value)}
                    >
                      <TargetIcon target={target} />
                      <span className="truncate">{target.label}</span>
                      {value === target.value && <CommandCheck />}
                    </CommandItem>
                  ))}
              </CommandGroup>
            ))}
            {/* Its own group because cmdk hands forceMount down to every item in a
                            group, so among the fields it would have pinned all of them. Search
                            finding nothing is the strongest signal the field does not exist yet,
                            which is why nothing else stands in for an empty state. */}
            <CommandGroup forceMount>
              {/* A publisher can name a field "New field", so the colour is what
                                sets this apart from one. */}
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
