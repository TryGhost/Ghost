import AutomationStatusBadge from './automation-status-badge';
import React from 'react';
import { useShade } from '@tryghost/shade/app';
import { Button, type ButtonProps, Skeleton } from '@tryghost/shade/components';
import { Link } from '@tryghost/admin-x-framework';
import { LucideIcon } from '@tryghost/shade/utils';
import { Inline } from '@tryghost/shade/primitives';
import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';

export type AutomationRequestState = 'idle' | 'loading' | 'error';

interface AutomationHeaderProps {
  automation: AutomationDetail | undefined;
  isLoadingAutomation: boolean;
  isSaveButtonEnabled: boolean;
  isPublishButtonEnabled: boolean;
  saveButtonVariant: ButtonProps['variant'];
  publishButtonVariant: ButtonProps['variant'];
  isTurnOffButtonEnabled: boolean;
  saveButtonChildren: React.ReactNode;
  publishButtonChildren: React.ReactNode;
  onSave: () => void;
  onPublish: () => void;
  onTurnOff: () => void;
}

const AutomationHeader: React.FC<AutomationHeaderProps> = ({
  automation,
  isLoadingAutomation,
  isSaveButtonEnabled,
  isPublishButtonEnabled,
  saveButtonVariant,
  publishButtonVariant,
  isTurnOffButtonEnabled,
  saveButtonChildren,
  publishButtonChildren,
  onSave,
  onPublish,
  onTurnOff,
}) => {
  const { isAdmin7 } = useShade();
  const name = automation?.name;
  const status = automation?.status;

  return (
    <header className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b border-border-default bg-surface-elevated px-4">
      <Inline className="min-w-0" gap="sm">
        <Button size={isAdmin7 ? 'icon' : undefined} variant="ghost" asChild>
          <Link aria-label="Back to automations" to="/automations">
            <LucideIcon.ArrowLeft strokeWidth={2} />
          </Link>
        </Button>
        {isLoadingAutomation ? (
          <Skeleton className="h-5 w-40" />
        ) : (
          <>
            <span className="truncate text-lg font-semibold">{name}</span>
            {status && <AutomationStatusBadge status={status} />}
          </>
        )}
      </Inline>
      <Inline className="shrink-0" gap="sm">
        {status === 'active' && (
          <Button disabled={!isTurnOffButtonEnabled} variant="outline" onClick={onTurnOff}>
            Turn off
          </Button>
        )}
        {status === 'inactive' && (
          <Button disabled={!isSaveButtonEnabled} variant={saveButtonVariant} onClick={onSave}>
            {saveButtonChildren}
          </Button>
        )}
        <Button
          disabled={!isPublishButtonEnabled}
          variant={publishButtonVariant}
          onClick={onPublish}
        >
          {publishButtonChildren}
        </Button>
      </Inline>
    </header>
  );
};

export default AutomationHeader;
