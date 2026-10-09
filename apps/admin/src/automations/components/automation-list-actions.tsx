import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import {
  useSetAutomationStatus,
  type AutomationBrowseItem,
  type AutomationStatus,
} from '@tryghost/admin-x-framework/api/automations';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';
import AutomationStatusDialog from './automation-status-dialog';

const AutomationListActions = ({ automation }: { automation: AutomationBrowseItem }) => {
  const mutation = useSetAutomationStatus();
  const archiveEnabled = useFeatureFlag('automationsArchive');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pendingStatus, setPendingStatus] = useState<'inactive' | null>(null);

  const changeStatus = (status: AutomationStatus) => {
    if (mutation.isPending) {
      return;
    }
    mutation.mutate(
      { id: automation.id, status },
      {
        onSuccess: () => setPendingStatus(null),
        onError: () => toast.error('Automation couldn’t be saved'),
      },
    );
  };

  if (automation.status !== 'active' && !archiveEnabled) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
            aria-label={`Actions for ${automation.name}`}
            className="border border-control-border shadow-none enabled:active:shadow-none enabled:aria-expanded:shadow-none"
            disabled={mutation.isPending}
            variant="outline"
          >
            <LucideIcon.MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {automation.status === 'active' && (
            <DropdownMenuItem
              disabled={mutation.isPending}
              onSelect={() => {
                mutation.reset();
                setPendingStatus('inactive');
              }}
            >
              <LucideIcon.Power className="size-4" />
              Turn off
            </DropdownMenuItem>
          )}
          {archiveEnabled && (
            <DropdownMenuItem
              disabled={mutation.isPending}
              onSelect={() =>
                changeStatus(automation.status === 'archived' ? 'inactive' : 'archived')
              }
            >
              {automation.status === 'archived' ? (
                <LucideIcon.ArchiveRestore className="size-4" />
              ) : (
                <LucideIcon.Archive className="size-4" />
              )}
              {automation.status === 'archived' ? 'Unarchive' : 'Archive'}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <AutomationStatusDialog
        isError={mutation.isError}
        isPending={mutation.isPending}
        open={pendingStatus !== null}
        status="inactive"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
        }}
        onConfirm={() => pendingStatus && changeStatus(pendingStatus)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingStatus(null);
          }
        }}
      />
    </>
  );
};

export default AutomationListActions;
