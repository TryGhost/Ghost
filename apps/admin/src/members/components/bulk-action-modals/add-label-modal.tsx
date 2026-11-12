import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@tryghost/shade/components';
import { LabelPicker } from '@/members/label-picker';
import { formatNumber } from '@tryghost/shade/utils';
import { useCallback, useState } from 'react';
import { useLabelPicker } from '@/members/hooks/use-label-picker';
import { Stack } from '@tryghost/shade/primitives';
// PROTOTYPE ONLY (NY-1750): which label automations this starts. Don't merge.
import { LeadMagnetBulkNote } from '@/automations/api';

interface AddLabelModalProps {
  open: boolean;
  memberCount: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: (labelIds: string[]) => void;
  isLoading?: boolean;
}

export function AddLabelModal({
  open,
  memberCount,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: AddLabelModalProps) {
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);

  const picker = useLabelPicker({
    selectedSlugs,
    onSelectionChange: setSelectedSlugs,
  });

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        setSelectedSlugs([]);
      }
      onOpenChange(isOpen);
    },
    [onOpenChange],
  );

  const handleConfirm = () => {
    const labelIds = picker.labels.filter((l) => selectedSlugs.includes(l.slug)).map((l) => l.id);
    if (labelIds.length > 0) {
      onConfirm(labelIds);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-5" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            Add label to {formatNumber(memberCount)} {memberCount === 1 ? 'member' : 'members'}
          </DialogTitle>
        </DialogHeader>

        <Stack gap="sm">
          <LabelPicker
            isCreating={picker.isCreating}
            labels={picker.labels}
            optionSource={picker.optionSource}
            resolvedSelectedLabels={picker.resolvedSelectedLabels}
            selectedSlugs={selectedSlugs}
            onCreate={picker.createLabel}
            onDelete={picker.deleteLabel}
            onEdit={picker.editLabel}
            onToggle={picker.toggleLabel}
          />
          {/* PROTOTYPE ONLY (NY-1750) */}
          <LeadMagnetBulkNote
            labels={picker.labels}
            memberCount={memberCount}
            selectedSlugs={selectedSlugs}
            source="bulk"
          />
        </Stack>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={selectedSlugs.length === 0 || isLoading} onClick={handleConfirm}>
            {isLoading
              ? 'Adding...'
              : selectedSlugs.length > 1
                ? `Add ${formatNumber(selectedSlugs.length)} labels`
                : 'Add label'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
