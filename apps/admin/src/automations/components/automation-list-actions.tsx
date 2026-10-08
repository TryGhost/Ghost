import { useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  useSetAutomationStatus,
  type AutomationBrowseItem,
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

// TODO(NY-1689) This component is dormant. Soon, we'll add support for "Archive" actions, which will let us show this.
const AutomationListActions = ({ automation }: { automation: AutomationBrowseItem }) => {
  const mutation = useSetAutomationStatus();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pendingStatus, setPendingStatus] = useState<'inactive' | null>(null);

  const confirm = () => {
    if (!pendingStatus || mutation.isPending) {
      return;
    }
    mutation.mutate(
      { id: automation.id, status: pendingStatus },
      {
        onSuccess: () => setPendingStatus(null),
        onError: () => toast.error('Automation couldn’t be saved'),
      },
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
            aria-label={`Actions for ${automation.name}`}
            className="hidden rounded-full"
            size="icon"
            variant="outline"
            hidden
          >
            <LucideIcon.MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {automation.status === 'active' && (
            <DropdownMenuItem
              onSelect={() => {
                mutation.reset();
                setPendingStatus('inactive');
              }}
            >
              <LucideIcon.Power className="size-4" />
              Turn off
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
        onConfirm={confirm}
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
