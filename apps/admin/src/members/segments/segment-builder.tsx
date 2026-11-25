import MembersFilters from '@/members/components/members-filters';
import { buildMemberFields } from '@/members/member-filter-catalog';
import {
  isPredicateEnabled,
  parseMemberFilter,
  serializeMemberFilters,
} from '@/members/member-filter-query';
import { useCustomFieldDefinitionsIncludingArchived } from '@/shared/member-custom-fields/use-definitions';
import { type Member, useBrowseMembers } from '@tryghost/admin-x-framework/api/members';
import { useBrowseNewsletters } from '@tryghost/admin-x-framework/api/newsletters';
import type { Segment } from '@tryghost/admin-x-framework/api/segments';
import { useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { getSiteTimezone } from '@tryghost/admin-x-framework/utils/get-site-timezone';
import { keepPreviousData } from '@tanstack/react-query';
import {
  Avatar,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  List,
  ListItem,
  ListItemContent,
  Popover,
  PopoverAnchor,
  PopoverContent,
  Skeleton,
  Switch,
} from '@tryghost/shade/components';
import { type Filter, FilterBar } from '@tryghost/shade/patterns';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn, formatNumber } from '@tryghost/shade/utils';
import { type RefObject, useId, useMemo, useState } from 'react';
import { formatMemberName, memberAvatarProps } from '@/members/member-format';
import { SEGMENT_NAME_MAX_LENGTH } from './segment-fields';
import { useSaveSegment } from './use-save-segment';

/**
 * Conditions being put together away from the members screen: the same filters, kept in the
 * component's own state rather than the URL.
 */
function useDraftConditions(initialFilter: string | undefined) {
  const { data: settingsData } = useBrowseSettings({});
  const { data: newslettersData } = useBrowseNewsletters({ searchParams: { limit: '100' } });
  const { data: customFields } = useCustomFieldDefinitionsIncludingArchived();
  const timezone = getSiteTimezone(settingsData?.settings ?? []);
  const newsletters = newslettersData?.newsletters;
  const fields = useMemo(
    () => buildMemberFields({ newsletters, customFields }),
    [newsletters, customFields],
  );
  const [filters, setFilters] = useState<Filter[]>(() =>
    parseMemberFilter(initialFilter, timezone, fields).filter((predicate) =>
      isPredicateEnabled(predicate, fields),
    ),
  );
  const filter = useMemo(
    () =>
      serializeMemberFilters(
        filters.filter((predicate) => isPredicateEnabled(predicate, fields)),
        timezone,
        fields,
      ),
    [filters, timezone, fields],
  );

  return { filters, setFilters, filter };
}

// How many matching members the builder lists. The rest are counted.
const PREVIEW_SIZE = 25;

const STATUS_LABELS: Record<Member['status'], string> = {
  free: 'Free',
  paid: 'Paid',
  comped: 'Complimentary',
  gift: 'Gift',
};

function PreviewMessage({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Stack align="center" className="py-8 text-center" gap="sm" justify="center">
      {icon}
      <Text size="sm" tone="secondary">
        {children}
      </Text>
    </Stack>
  );
}

/**
 * Who the conditions match, as they are built: the count, and the first members as a short
 * list. It stands in for the members screen, which isn't in view wherever this is used.
 */
function MatchingMembersPreview({ filter, compact }: { filter: string; compact?: boolean }) {
  const { data, isLoading } = useBrowseMembers({
    searchParams: { filter, limit: String(PREVIEW_SIZE), order: 'created_at desc' },
    placeholderData: keepPreviousData,
    defaultErrorHandler: false,
  });
  const members = data?.members ?? [];
  const total = data?.meta?.pagination.total ?? members.length;

  return (
    <Stack gap="sm">
      <Text size="sm" tone="secondary">
        {isLoading ? (
          'Matching members'
        ) : (
          <>
            <Text as="span" size="sm" weight="semibold">
              {formatNumber(total)}
            </Text>{' '}
            {total === 1 ? 'member matches' : 'members match'}
          </>
        )}
      </Text>
      {/* As tall as the members it lists, up to a limit past which it scrolls: a few members
          don't leave an empty box under them. */}
      <div
        className={cn(
          'overflow-y-auto rounded-md border border-border',
          compact ? 'max-h-44' : 'max-h-64',
        )}
        data-testid="segment-builder-preview"
      >
        {isLoading ? (
          <Stack className="px-4 py-3" gap="md">
            {Array.from({ length: 4 }, (_, index) => (
              <Inline key={index} gap="md">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-3 w-40" />
              </Inline>
            ))}
          </Stack>
        ) : members.length === 0 ? (
          <PreviewMessage icon={<LucideIcon.Users className="size-5 text-muted-foreground" />}>
            No members match these filters.
          </PreviewMessage>
        ) : (
          // Shade's list rows, as History lists its entries. Nothing here is clickable, so the
          // rows have no hover. A row's highlight layer still reaches 16px past it on each side,
          // so the list keeps 16px inside the scrolling box, or the box scrolls sideways.
          <List className="px-4">
            {members.map((member) => (
              <ListItem key={member.id} hover={false}>
                <ListItemContent className="flex items-center gap-3 py-2">
                  <Avatar
                    className="size-8 min-w-8"
                    {...memberAvatarProps(member)}
                    src={member.avatar_image}
                  />
                  <Stack className="min-w-0 grow" gap="none">
                    <Text as="span" className="truncate" size="sm" weight="medium">
                      {formatMemberName(member)}
                    </Text>
                    {member.name && member.email && (
                      <Text as="span" className="truncate" size="sm" tone="secondary">
                        {member.email}
                      </Text>
                    )}
                  </Stack>
                  <Text as="span" className="shrink-0" size="sm" tone="secondary">
                    {STATUS_LABELS[member.status]}
                  </Text>
                </ListItemContent>
              </ListItem>
            ))}
            {total > members.length && (
              <ListItem hover={false}>
                <ListItemContent className="py-2">
                  <Text as="span" size="sm" tone="secondary">
                    and {formatNumber(total - members.length)} more
                  </Text>
                </ListItemContent>
              </ListItem>
            )}
          </List>
        )}
      </div>
    </Stack>
  );
}

interface SegmentBuilderOptions {
  /** Conditions to start building from, such as a template's. */
  startFrom?: string;
  onCreated?: (segment: Segment) => void;
  /** Called once the segment is saved, to put the builder away. */
  onDone: () => void;
}

/** A segment being built: its name, its conditions, and the save. One per open builder. */
function useSegmentBuilder({ startFrom, onCreated, onDone }: SegmentBuilderOptions) {
  const conditions = useDraftConditions(startFrom);
  const draft = useSaveSegment(onCreated);
  const filterError = draft.filterError(conditions.filter);

  const save = async () => {
    if (await draft.save(conditions.filter)) {
      onDone();
    }
  };

  return {
    conditions,
    draft,
    filterError,
    hasFilters: conditions.filters.length > 0,
    hasError: Boolean(draft.error || filterError),
    /** Whether anything has been entered, which a stray click shouldn't throw away. */
    isDirty: Boolean(draft.name) || conditions.filters.length > 0,
    save,
  };
}

type SegmentBuilder = ReturnType<typeof useSegmentBuilder>;

/**
 * The builder's fields, whatever it is shown in: the name, the conditions, and the members they
 * match, listed once there is a filter.
 */
interface SegmentBuilderFormProps {
  builder: SegmentBuilder;
  /** A shorter list of members, for the popover. */
  compact?: boolean;
}

function SegmentBuilderForm({ builder, compact }: SegmentBuilderFormProps) {
  const nameId = useId();
  const { conditions, draft, filterError, hasFilters, save } = builder;

  return (
    <FieldGroup className="gap-5">
      {/* A label, as the custom field form has: once a name is typed, a placeholder no longer
          says what the field is. */}
      <Field data-invalid={Boolean(draft.error) || undefined}>
        <FieldLabel htmlFor={nameId}>Name</FieldLabel>
        <Input
          aria-invalid={Boolean(draft.error) || undefined}
          autoComplete="off"
          id={nameId}
          maxLength={SEGMENT_NAME_MAX_LENGTH}
          placeholder="Enter segment name"
          value={draft.name}
          autoFocus
          onChange={(event) => draft.setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void save();
            }
          }}
        />
        {draft.error && <FieldError>{draft.error}</FieldError>}
      </Field>
      <Field data-invalid={Boolean(filterError) || undefined}>
        {/* The bar is there before any filter, unlike on the members screen. Alone under the
            name, a bare Filter button was too faint to find, and the bar marks where the filters
            will go. Until it holds one its padding is slight, so it is close to the name field's
            height while the button's hover still has room around it. */}
        <FilterBar
          className={cn('mt-0 transition-[padding] duration-200 ease-out', !hasFilters && 'p-1!')}
        >
          <MembersFilters
            filters={conditions.filters}
            multipleActiveSubscriptionsCount={0}
            embedded
            onFiltersChange={conditions.setFilters}
          />
        </FilterBar>
        {filterError && <FieldError>{filterError}</FieldError>}
      </Field>
      {/* Nothing is listed until there is a filter: an empty list would be the largest thing
          in the builder, and draw the eye away from the one step there is to take. The list
          opens downwards. Closed, it gives back the gap the group put above it. */}
      <div
        className={cn(
          'grid transition-[grid-template-rows,margin] duration-200 ease-out',
          conditions.filter ? 'grid-rows-[1fr]' : '-mt-5 grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          {conditions.filter && (
            <MatchingMembersPreview compact={compact} filter={conditions.filter} />
          )}
        </div>
      </div>
    </FieldGroup>
  );
}

interface SegmentBuilderActionsProps {
  builder: SegmentBuilder;
  /** Whether the builder asks if the segment is pinned to the sidebar. */
  withPin: boolean;
  size?: 'sm';
  onCancel: () => void;
}

/** The builder's pin switch, where the place asks for it, and its buttons. */
function SegmentBuilderActions({ builder, withPin, size, onCancel }: SegmentBuilderActionsProps) {
  const pinId = useId();
  const { draft, hasError, hasFilters, save } = builder;

  return (
    <Inline className="w-full" gap="md" justify="between">
      {/* Offered once there is a filter, with the list of who matches: before that there is
          no segment yet to pin, and the builder asks only for what it needs. */}
      {withPin && hasFilters ? (
        <Field className="w-auto" orientation="horizontal">
          <Switch checked={draft.pinned} id={pinId} onCheckedChange={draft.setPinned} />
          <FieldLabel className="font-normal" htmlFor={pinId}>
            Pin to sidebar
          </FieldLabel>
        </Field>
      ) : (
        <span />
      )}
      <Inline gap="sm">
        <Button disabled={draft.isPending} size={size} variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={draft.isPending}
          size={size}
          variant={hasError ? 'destructive' : 'default'}
          onClick={() => void save()}
        >
          {draft.isPending ? 'Saving…' : hasError ? 'Retry' : 'Save'}
        </Button>
      </Inline>
    </Inline>
  );
}

interface SegmentBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Conditions to start building from, such as a template's. */
  startFrom?: string;
  /** Whether the builder asks if the segment is pinned to the sidebar. It is made unpinned either way. */
  withPin?: boolean;
  onCreated?: (segment: Segment) => void;
}

/**
 * Where a segment is made away from the members screen, such as an automation's trigger or a
 * post's recipients: its name, its conditions, built with the members screen's own filter
 * control, and the members they match, listed as the conditions change. The members screen
 * itself has no need of it: there the filters and the list are the page.
 *
 * This is the builder as a dialog. `SegmentBuilderPopover` is the same builder hung from a
 * control.
 *
 * A segment is made unpinned. A place can offer the sidebar switch (`withPin`), as a custom field
 * made in passing is staff-only unless the place asks who can see it.
 */
export function SegmentBuilderDialog({
  open,
  onOpenChange,
  startFrom,
  withPin = false,
  onCreated,
}: SegmentBuilderProps) {
  const builder = useSegmentBuilder({ startFrom, onCreated, onDone: () => onOpenChange(false) });
  // As in the popover: kept while it holds something or is saving. A click outside or Escape
  // would throw the segment away, and Cancel is the one way to do that.
  const keepOpen = builder.isDirty || builder.draft.isPending;

  return (
    <Dialog open={open} onOpenChange={(next) => !builder.draft.isPending && onOpenChange(next)}>
      {/* Small until there is a filter, then wide enough for the filters and the members they
          match. Small is the width of Admin's other create dialogs, a custom field's or a
          newsletter's (SettingsModal's "sm"). The dialog's own timing animates the change, as it
          does in the members import. */}
      <DialogContent
        className={cn(
          'transition-[max-width] ease-out',
          builder.hasFilters ? 'max-w-2xl' : 'max-w-[480px]',
        )}
        data-testid="segment-builder-dialog"
        onEscapeKeyDown={(event) => {
          if (keepOpen) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (keepOpen) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>New segment</DialogTitle>
        </DialogHeader>
        <SegmentBuilderForm builder={builder} />
        <DialogFooter>
          <SegmentBuilderActions
            builder={builder}
            withPin={withPin}
            onCancel={() => onOpenChange(false)}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SegmentBuilderPopoverProps extends SegmentBuilderProps {
  /** What the popover hangs from: the picker or button a segment is being made for. */
  anchorRef: RefObject<HTMLElement>;
  /**
   * Which edge of that control the popover lines up with, and so which way it grows as it
   * widens for its filters. Centred by default, so it grows to both sides at once. A control at
   * the edge of its row can line it up with that edge instead.
   */
  align?: 'start' | 'center' | 'end';
}

function SegmentBuilderPopoverContent({
  onOpenChange,
  startFrom,
  withPin = false,
  align = 'center',
  onCreated,
}: Omit<SegmentBuilderPopoverProps, 'open' | 'anchorRef'>) {
  const builder = useSegmentBuilder({ startFrom, onCreated, onDone: () => onOpenChange(false) });
  // Kept while it holds something or is saving: a click outside or Escape would throw the
  // segment away, and Cancel is the one way to do that.
  const keepOpen = builder.isDirty || builder.draft.isPending;

  return (
    <PopoverContent
      align={align}
      aria-label="New segment"
      // As wide as the custom field form's popover until there is a filter, then wide enough
      // for a filter's three parts on one line.
      className={cn(
        'max-h-(--radix-popover-content-available-height) max-w-[calc(100vw-32px)] overflow-y-auto transition-[width] duration-200 ease-out',
        builder.hasFilters ? 'w-[600px]' : 'w-[360px]',
      )}
      collisionPadding={16}
      data-testid="segment-builder-popover"
      sideOffset={8}
      onEscapeKeyDown={(event) => {
        if (keepOpen) {
          event.preventDefault();
        }
      }}
      // Opened as a picker closes, which hands focus back to its own button. That is not the
      // publisher leaving the form.
      onFocusOutside={(event) => event.preventDefault()}
      onPointerDownOutside={(event) => {
        if (keepOpen) {
          event.preventDefault();
        }
      }}
    >
      <Stack gap="lg">
        <SegmentBuilderForm builder={builder} compact />
        <SegmentBuilderActions
          builder={builder}
          size="sm"
          withPin={withPin}
          onCancel={() => onOpenChange(false)}
        />
      </Stack>
    </PopoverContent>
  );
}

/**
 * The segment builder hung from a control, as the custom field form is from its picker: for a
 * place that is choosing a segment and finds it needs a new one, where a dialog would take over
 * the screen for a small step. It holds the same fields as the dialog, with a shorter list.
 *
 * Once something is entered it stays open until it is saved or cancelled.
 */
export function SegmentBuilderPopover({ open, anchorRef, ...props }: SegmentBuilderPopoverProps) {
  return (
    // Modal, as the custom field form's popover is: what is behind it holds still while it is
    // open, so it can't be scrolled away from the control it belongs to.
    <Popover open={open} modal onOpenChange={props.onOpenChange}>
      <PopoverAnchor virtualRef={anchorRef} />
      {open && <SegmentBuilderPopoverContent {...props} />}
    </Popover>
  );
}
