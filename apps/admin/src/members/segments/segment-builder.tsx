import MembersFilters from '@/members/components/members-filters';
import { buildMemberFields } from '@/members/member-filter-catalog';
import {
  isPredicateEnabled,
  parseMemberFilter,
  serializeMemberFilters,
} from '@/members/member-filter-query';
import { useCustomFieldDefinitionsIncludingArchived } from '@/shared/member-custom-fields/use-definitions';
import { useBrowseNewsletters } from '@tryghost/admin-x-framework/api/newsletters';
import type { Segment } from '@tryghost/admin-x-framework/api/segments';
import { useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { getSiteTimezone } from '@tryghost/admin-x-framework/utils/get-site-timezone';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
} from '@tryghost/shade/components';
import { type Filter } from '@tryghost/shade/patterns';
import { Stack } from '@tryghost/shade/primitives';
import { useMemo, useState } from 'react';
import { MatchingMembers, SegmentFields } from './segment-fields';
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

interface SegmentBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Conditions to start building from, such as a template's. */
  startFrom?: string;
  /** Whether the dialog asks if the segment shows in the sidebar. It is made unpinned either way. */
  withPin?: boolean;
  onCreated?: (segment: Segment) => void;
}

/**
 * Where a segment is made away from the members screen, such as the segments list or an
 * automation's trigger: its conditions, built in place with the members screen's own filter
 * control, how many members they match, and its name. The members screen itself saves the
 * filters it is showing from a popover instead, since the members matched are already in view.
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
            <Label>Conditions</Label>
            <Stack
              className="rounded-md border border-border p-2"
              data-testid="segment-builder-conditions"
              gap="sm"
            >
              <MembersFilters
                filters={conditions.filters}
                multipleActiveSubscriptionsCount={0}
                embedded
                onFiltersChange={conditions.setFilters}
              />
            </Stack>
            <MatchingMembers filter={conditions.filter} />
          </Stack>
          <SegmentFields
            error={draft.error}
            name={draft.name}
            pin={withPin ? { pinned: draft.pinned, onChange: draft.setPinned } : undefined}
            onNameChange={draft.setName}
            onSubmit={() => void save()}
          />
        </Stack>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!draft.canSave(conditions.filter)} onClick={() => void save()}>
            {draft.isPending ? 'Saving…' : 'Save segment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
