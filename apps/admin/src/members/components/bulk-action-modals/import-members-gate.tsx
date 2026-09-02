import { ImportMembersModal as BaselineImportMembersModal } from '@/members/components/bulk-action-modals/import-members-modal';
import { ImportMembersModal as RedesignedImportMembersModal } from '@/members/components/bulk-action-modals/import-members/custom-fields/import-members-modal';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import type { ImportResponse } from '@/members/components/bulk-action-modals/import-members/state';

interface ImportMembersGateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (importResponse?: ImportResponse) => void;
  onClose?: (importResponse?: ImportResponse) => void;
}

/**
 * Serves the redesigned members CSV import when the `membersImportRedesign` Labs flag is on,
 * and the import as it shipped otherwise.
 *
 * Two whole implementations rather than one with the flag threaded through it. The mapping step
 * diverges in almost every part — what a row offers, what a row means, what the request carries —
 * and while both lived in one file every change was opt-out: five reached the flag-off path
 * before anyone noticed. Here the baseline is a file this feature never edits, so it cannot
 * regress by being forgotten about.
 *
 * The cost is real and worth stating: a fix to the import has to be applied to both, or knowingly
 * to one, until the flag goes and the baseline is deleted.
 *
 * Custom fields are not this flag's decision. The redesign ships whether or not custom fields
 * exist.
 */
export function ImportMembersGate(props: ImportMembersGateProps) {
  const importRedesignEnabled = useFeatureFlag('membersImportRedesign');

  if (importRedesignEnabled) {
    return <RedesignedImportMembersModal {...props} />;
  }
  return <BaselineImportMembersModal {...props} />;
}

export default ImportMembersGate;
