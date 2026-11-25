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
  Input,
  Label,
  Skeleton,
  Switch,
} from '@tryghost/shade/components';
import { type Filter, FilterBar } from '@tryghost/shade/patterns';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, formatNumber } from '@tryghost/shade/utils';
import { useId, useMemo, useState } from 'react';
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
    <Stack align="center" className="h-full text-center" gap="sm" justify="center">
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
function MatchingMembersPreview({ filter }: { filter: string | undefined }) {
  const { data, isLoading } = useBrowseMembers({
    searchParams: { filter: filter ?? '', limit: String(PREVIEW_SIZE), order: 'created_at desc' },
    enabled: Boolean(filter),
    placeholderData: keepPreviousData,
    defaultErrorHandler: false,
  });
  const members = filter ? (data?.members ?? []) : [];
  const total = data?.meta?.pagination.total ?? members.length;

  return (
    <Stack gap="sm">
      <Text size="sm" tone="secondary">
        {filter && !isLoading ? (
          <>
            <Text as="span" size="sm" weight="semibold">
              {formatNumber(total)}
            </Text>{' '}
            {total === 1 ? 'member matches' : 'members match'}
          </>
        ) : (
          'Matching members'
        )}
      </Text>
      {/* A set height, so the dialog doesn't move as the conditions change. */}
      <div
        className="h-64 overflow-y-auto rounded-md border border-border"
        data-testid="segment-builder-preview"
      >
        {!filter ? (
          <PreviewMessage icon={<LucideIcon.ListFilter className="size-5 text-muted-foreground" />}>
            Add a filter to see who is in this segment.
          </PreviewMessage>
        ) : isLoading ? (
          <Stack className="p-3" gap="md">
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
          <ul className="flex flex-col">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 last:border-b-0"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar
                    className="size-8 min-w-8"
                    {...memberAvatarProps(member)}
                    src={member.avatar_image}
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{formatMemberName(member)}</span>
                    {member.name && member.email && (
                      <span className="truncate text-sm text-muted-foreground">{member.email}</span>
                    )}
                  </span>
                </span>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {STATUS_LABELS[member.status]}
                </span>
              </li>
            ))}
            {total > members.length && (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                and {formatNumber(total - members.length)} more
              </li>
            )}
          </ul>
        )}
      </div>
    </Stack>
  );
}

interface SegmentBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Conditions to start building from, such as a template's. */
  startFrom?: string;
  /** Whether the dialog asks if the segment is pinned to the sidebar. It is made unpinned either way. */
  withPin?: boolean;
  onCreated?: (segment: Segment) => void;
}

/**
 * Where a segment is made away from the members screen, such as an automation's trigger or a
 * post's recipients: its name, its conditions, built with the members screen's own filter
 * control, and the members they match, listed as the conditions change. The members screen
 * itself has no need of it: there the filters and the list are the page.
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
}: SegmentBuilderDialogProps) {
  const pinId = useId();
  const conditions = useDraftConditions(startFrom);
  const draft = useSaveSegment(onCreated);

  const save = async () => {
    if (await draft.save(conditions.filter)) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !draft.isPending && onOpenChange(next)}>
      <DialogContent className="max-w-2xl" data-testid="segment-builder-dialog">
        <DialogHeader>
          <DialogTitle>New segment</DialogTitle>
        </DialogHeader>
        <Stack gap="lg">
          <Stack gap="xs">
            <Input
              aria-invalid={Boolean(draft.error)}
              aria-label="Segment name"
              maxLength={SEGMENT_NAME_MAX_LENGTH}
              placeholder="Segment name"
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
            {draft.error && (
              <Text className="text-destructive" role="alert" size="xs">
                {draft.error}
              </Text>
            )}
          </Stack>
          <FilterBar className="mt-0">
            <MembersFilters
              filters={conditions.filters}
              multipleActiveSubscriptionsCount={0}
              embedded
              onFiltersChange={conditions.setFilters}
            />
          </FilterBar>
          <MatchingMembersPreview filter={conditions.filter} />
        </Stack>
        <DialogFooter className="sm:items-center sm:justify-between">
          {withPin ? (
            <Inline gap="sm">
              <Switch checked={draft.pinned} id={pinId} onCheckedChange={draft.setPinned} />
              <Label className="font-normal" htmlFor={pinId}>
                Pin in sidebar
              </Label>
            </Inline>
          ) : (
            <span />
          )}
          <Inline gap="sm">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={!draft.canSave(conditions.filter)} onClick={() => void save()}>
              {draft.isPending ? 'Saving…' : 'Save segment'}
            </Button>
          </Inline>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
