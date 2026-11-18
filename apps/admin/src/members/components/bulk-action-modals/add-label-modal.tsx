import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@tryghost/shade/components';
import { LabelPicker } from '@/members/label-picker';
import { formatNumber } from '@tryghost/shade/utils';
import { useRef, useState } from 'react';
import {
  LabelAutomationSummary,
  LARGE_LABEL_AUTOMATION_BATCH_SIZE,
  useLabelAutomations,
} from '@/automations/api';
import { Stack } from '@tryghost/shade/primitives';
import { useLabelPicker } from '@/members/hooks/use-label-picker';

interface AddLabelModalProps {
  open: boolean;
  memberCount: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: (labelIds: string[]) => Promise<void>;
}

export function AddLabelModal(props: AddLabelModalProps) {
  return props.open ? <AddLabelModalContent {...props} /> : null;
}

function AddLabelModalContent({
  memberCount,
  onOpenChange,
  onConfirm,
}: Omit<AddLabelModalProps, 'open'>) {
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);

  const picker = useLabelPicker({
    selectedSlugs,
    onSelectionChange: setSelectedSlugs,
  });

  const [isConfirming, setConfirming] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const submissionInFlight = useRef(false);
  const selectedLabels = picker.resolvedSelectedLabels;
  const lookup = useLabelAutomations({ labels: selectedLabels, enabled: true });

  const handleOpenChange = (isOpen: boolean) => {
    if (!submissionInFlight.current) {
      onOpenChange(isOpen);
    }
  };

  const handleConfirm = async () => {
    if (isSubmitting || submissionInFlight.current || lookup.isLoading || lookup.isError) {
      return;
    }
    const labelIds = selectedLabels.map(({ id }) => id);
    if (!labelIds.length) {
      return;
    }
    if (lookup.matches.length && !isConfirming) {
      setConfirming(true);
      return;
    }
    submissionInFlight.current = true;
    setSubmitting(true);
    try {
      await onConfirm(labelIds);
    } finally {
      submissionInFlight.current = false;
      setSubmitting(false);
    }
  };

  let addButtonLabel = 'Add label';
  if (isSubmitting) {
    addButtonLabel = 'Adding...';
  } else if (selectedSlugs.length > 1) {
    addButtonLabel = `Add ${formatNumber(selectedSlugs.length)} labels`;
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="gap-5" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            Add {selectedSlugs.length > 1 ? 'labels' : 'label'} to {formatNumber(memberCount)}{' '}
            {memberCount === 1 ? 'member' : 'members'}
            {isConfirming && '?'}
          </DialogTitle>
        </DialogHeader>

        {isConfirming ? (
          <DialogDescription asChild>
            <Stack className="text-base text-foreground" gap="lg">
              <LabelAutomationSummary
                large={memberCount >= LARGE_LABEL_AUTOMATION_BATCH_SIZE}
                matches={lookup.matches}
                memberCount={memberCount}
              />
            </Stack>
          </DialogDescription>
        ) : (
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
        )}
        {lookup.isError && (
          <Stack gap="sm" role="alert">
            <p>
              Could not check which automations these labels start. Try again before adding labels.
            </p>
            <Button
              disabled={lookup.isLoading}
              variant="outline"
              onClick={() => void lookup.retry()}
            >
              Retry
            </Button>
          </Stack>
        )}

        <DialogFooter>
          <Button
            disabled={isSubmitting}
            variant="outline"
            onClick={() => (isConfirming ? setConfirming(false) : handleOpenChange(false))}
          >
            {isConfirming ? 'Back' : 'Cancel'}
          </Button>
          <Button
            disabled={
              selectedSlugs.length === 0 ||
              selectedLabels.length !== selectedSlugs.length ||
              isSubmitting ||
              lookup.isLoading ||
              lookup.isError
            }
            onClick={() => void handleConfirm()}
          >
            {addButtonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
