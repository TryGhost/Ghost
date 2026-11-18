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
import {
  LeadMagnetBulkBanner,
  LeadMagnetBulkConfirm,
  LeadMagnetBulkNote,
  useLeadMagnetBulkConfirmNeeded,
  useLeadMagnetBulkMatches,
} from '@/automations/api';

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

  // PROTOTYPE ONLY (NY-1750): with the dialog pattern, Add label first changes this dialog to a
  // confirmation step when a picked label starts an automation. Back returns to the picker.
  const leadMagnetMatches = useLeadMagnetBulkMatches(picker.labels, selectedSlugs);
  const leadMagnetConfirmNeeded = useLeadMagnetBulkConfirmNeeded(leadMagnetMatches);
  const [isConfirming, setConfirming] = useState(false);
  // Closing goes back to the picker, reset while rendering rather than in an effect.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) {
      setConfirming(false);
    }
  }
  const handleAddClick = () => {
    if (leadMagnetConfirmNeeded && !isConfirming) {
      setConfirming(true);
      return;
    }
    handleConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-5" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            Add label to {formatNumber(memberCount)} {memberCount === 1 ? 'member' : 'members'}
            {isConfirming && '?'}
          </DialogTitle>
        </DialogHeader>

        {/* PROTOTYPE ONLY (NY-1750) */}
        {isConfirming ? (
          <div className="text-base">
            <LeadMagnetBulkConfirm
              matches={leadMagnetMatches}
              memberCount={memberCount}
              source="bulk"
            />
          </div>
        ) : (
          <LeadMagnetBulkBanner
            matches={leadMagnetMatches}
            memberCount={memberCount}
            source="bulk"
          />
        )}

        <Stack className={isConfirming ? 'hidden' : undefined} gap="sm">
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
          <Button
            variant="outline"
            onClick={() => (isConfirming ? setConfirming(false) : handleOpenChange(false))}
          >
            {isConfirming ? 'Back' : 'Cancel'}
          </Button>
          <Button disabled={selectedSlugs.length === 0 || isLoading} onClick={handleAddClick}>
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
