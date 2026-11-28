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
import { useHandleError } from '@tryghost/admin-x-framework/hooks';
import {
  LabelAutomationNames,
  LabelAutomationRows,
  type LabelAutomationMatch,
  LARGE_LABEL_AUTOMATION_BATCH_SIZE,
  useLabelAutomations,
} from '@/automations/api';
import { Stack } from '@tryghost/shade/primitives';
import { useLabelPicker } from '@/members/hooks/use-label-picker';

interface BulkLabelAutomationSummaryProps {
  matches: LabelAutomationMatch[];
  large: boolean;
  memberCount: number;
}

function BulkLabelAutomationSummary({
  matches,
  large,
  memberCount,
}: BulkLabelAutomationSummaryProps) {
  if (!matches.length) {
    return null;
  }
  const caveat = large ? ' With this many members, it can take longer to process.' : '';
  const target = memberCount === 1 ? 'this member' : 'these members';
  if (matches.length === 1) {
    const { label, automations } = matches[0];
    return (
      <p>
        Adding <strong>{label.name}</strong> also starts{' '}
        <LabelAutomationNames automations={automations} /> for {target}.{caveat}
      </p>
    );
  }
  const count = new Set(matches.flatMap(({ automations }) => automations.map(({ id }) => id))).size;
  return (
    <Stack gap="lg">
      <p>
        Adding these labels also starts {formatNumber(count)}{' '}
        {count === 1 ? 'automation' : 'automations'} for {target}.{caveat}
      </p>
      <LabelAutomationRows matches={matches} showAddPrefix />
    </Stack>
  );
}

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
  const handleError = useHandleError();
  const selectedLabels = picker.resolvedSelectedLabels;
  const lookup = useLabelAutomations({ labels: selectedLabels, enabled: true });

  const handleOpenChange = (isOpen: boolean) => {
    if (!submissionInFlight.current) {
      onOpenChange(isOpen);
    }
  };

  const handleConfirm = async () => {
    if (submissionInFlight.current || selectedLabels.length !== selectedSlugs.length) {
      return;
    }
    const labelIds = selectedLabels.map(({ id }) => id);
    if (!labelIds.length) {
      return;
    }
    submissionInFlight.current = true;
    setSubmitting(true);
    try {
      const matches = await lookup.check();
      if (matches.length && !isConfirming) {
        setConfirming(true);
        return;
      }
      await onConfirm(labelIds);
    } catch (error) {
      handleError(error);
    } finally {
      submissionInFlight.current = false;
      setSubmitting(false);
    }
  };

  let addButtonLabel = 'Add label';
  if (selectedSlugs.length > 1) {
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
              <BulkLabelAutomationSummary
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
              isSubmitting
            }
            loading={isSubmitting || lookup.isLoading}
            onClick={() => void handleConfirm()}
          >
            {addButtonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
