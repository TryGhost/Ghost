import { LabelAutomationNames, LabelAutomationRows, type LabelAutomationMatch, type useMemberLabelAutomations } from '@/automations/api';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@tryghost/shade/components';
import { formatNumber } from '@tryghost/shade/utils';
import { Stack } from '@tryghost/shade/primitives';
import type { ReactNode } from 'react';

type Lookup = ReturnType<typeof useMemberLabelAutomations>;

interface MemberLabelAutomationSummaryProps {
  matches: LabelAutomationMatch[];
}

function MemberLabelAutomationSummary({ matches }: MemberLabelAutomationSummaryProps) {
  if (!matches.length) {
    return null;
  }
  if (matches.length === 1) {
    const { label, automations } = matches[0];
    return (
      <p>
        Adding <strong>{label.name}</strong> also starts{' '}
        <LabelAutomationNames automations={automations} /> for <strong>this member</strong>.
      </p>
    );
  }
  const count = new Set(matches.flatMap(({ automations }) => automations.map(({ id }) => id))).size;
  return (
    <Stack gap="lg">
      <p>
        Saving also starts {formatNumber(count)} {count === 1 ? 'automation' : 'automations'} for
        this member.
      </p>
      <LabelAutomationRows matches={matches} showAddPrefix />
    </Stack>
  );
}

interface MemberLabelAutomationDialogProps {
  open: boolean;
  lookup: Lookup;
  isSaving: boolean;
  confirmLabel: ReactNode;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function MemberLabelAutomationDialog({
  open,
  lookup,
  isSaving,
  confirmLabel,
  onOpenChange,
  onConfirm,
}: MemberLabelAutomationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5">
        <DialogHeader>
          <DialogTitle>Save changes?</DialogTitle>
        </DialogHeader>
        <DialogDescription asChild>
          <Stack className="text-base text-foreground" gap="lg">
            <MemberLabelAutomationSummary matches={lookup.matches} />
          </Stack>
        </DialogDescription>
        <DialogFooter>
          <Button disabled={isSaving} variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={isSaving || lookup.isLoading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
