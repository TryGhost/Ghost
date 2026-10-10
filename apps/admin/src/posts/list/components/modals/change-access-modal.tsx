import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tryghost/shade/components';
import { getAccessModalTitle } from '@/posts/list/post-bulk-modal-copy';
import { getSettingValue, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { Inline, Stack } from '@tryghost/shade/primitives';
import { useBrowseTiers } from '@tryghost/admin-x-framework/api/tiers';
import { useState } from 'react';
import type { PostResource } from '@/posts/list/post-resource';

/**
 * Ported from `gh-psm-visibility-input.js`. "Specific tier(s)" is appended to
 * the fixed three, and picking it reveals the tier picker below.
 */
const VISIBILITIES = [
  { value: 'public', label: 'Public' },
  { value: 'members', label: 'Members only' },
  { value: 'paid', label: 'Paid-members only' },
  { value: 'tiers', label: 'Specific tier(s)' },
];

interface ChangeAccessModalProps {
  resource: PostResource;
  count: number;
  isSingle: boolean;
  /** The single post's current access, when exactly one is selected. */
  currentVisibility?: string;
  /** The single post's current tiers, so the picker opens on them. */
  currentTiers?: { id: string }[];
  isRunning: boolean;
  onConfirm: (access: { visibility: string; tiers: { id: string }[] }) => void;
  onCancel: () => void;
}

/**
 * Bulk "Change access", ported from
 * `apps/ember-admin/app/components/posts-list/modals/edit-posts-access.hbs`.
 *
 * With one post selected it opens on that post's current access; with several
 * it opens on the site default, because there is no single current value to
 * show. Ember does the same, via a throwaway post model it uses only to borrow
 * the validations.
 */
export function ChangeAccessModal({
  resource,
  count,
  isSingle,
  currentVisibility,
  currentTiers,
  isRunning,
  onConfirm,
  onCancel,
}: ChangeAccessModalProps) {
  const { data: settingsData } = useBrowseSettings();
  const defaultVisibility =
    getSettingValue<string>(settingsData?.settings, 'default_content_visibility') ?? 'public';

  const [visibility, setVisibility] = useState(
    isSingle && currentVisibility ? currentVisibility : defaultVisibility,
  );
  // Ember seeds these from the post as well as the visibility, so opening the
  // modal on a tiers-gated post shows the tiers it already has rather than an
  // empty list with a permanently disabled Save.
  const [tierIds, setTierIds] = useState<string[]>(
    isSingle && currentTiers ? currentTiers.map((tier) => tier.id) : [],
  );

  const { data: tiersData } = useBrowseTiers();
  const paidTiers = (tiersData?.tiers ?? []).filter((tier) => tier.type === 'paid' && tier.active);

  // Ember refuses to save "specific tiers" with none chosen.
  const canSave = visibility !== 'tiers' || tierIds.length > 0;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
    >
      <DialogContent data-testid="change-access-modal">
        <DialogHeader>
          <DialogTitle>{getAccessModalTitle({ count, resource, isSingle })}</DialogTitle>
          <DialogDescription>
            Controls who can read the selected{' '}
            {(resource === 'pages' ? 'page' : 'post') + (isSingle ? '' : 's')}.
          </DialogDescription>
        </DialogHeader>

        <Stack gap="md">
          <Select value={visibility} onValueChange={setVisibility}>
            <SelectTrigger aria-label="Access">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISIBILITIES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {visibility === 'tiers' && (
            <Stack gap="sm">
              {paidTiers.map((tier) => (
                <Inline key={tier.id} align="center" gap="sm">
                  <Checkbox
                    checked={tierIds.includes(tier.id)}
                    id={`tier-${tier.id}`}
                    onCheckedChange={(checked) => {
                      setTierIds((current) =>
                        checked ? [...current, tier.id] : current.filter((id) => id !== tier.id),
                      );
                    }}
                  />
                  <label className="text-sm" htmlFor={`tier-${tier.id}`}>
                    {tier.name}
                  </label>
                </Inline>
              ))}
            </Stack>
          )}
        </Stack>

        <DialogFooter>
          <Button disabled={isRunning} variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            disabled={isRunning || !canSave}
            onClick={() => {
              onConfirm({
                visibility,
                tiers: visibility === 'tiers' ? tierIds.map((id) => ({ id })) : [],
              });
            }}
          >
            {isRunning ? 'Saving' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
