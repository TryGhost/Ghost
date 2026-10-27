import AutomationNameField from './automation-name-field';
import AutomationStatusBadge from './automation-status-badge';
import React from 'react';
import { useShade } from '@tryghost/shade/app';
import {
  Button,
  type ButtonProps,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
} from '@tryghost/shade/components';
import { Link } from '@tryghost/admin-x-framework';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { useScreenEntrance } from '@/layout/screen-transition';
import { Inline, Text } from '@tryghost/shade/primitives';
import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';

export type AutomationValidationAction = 'publish' | 'save' | 'unpublish';

const validationMessages: Record<AutomationValidationAction, string> = {
  publish: 'Fix all issues to publish this automation.',
  save: 'Fix all issues to save this automation.',
  unpublish: 'Fix all issues to turn off this automation.',
};

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
  validationFeedback: AutomationValidationAction | null;
  onDismissValidationFeedback: () => void;
  onSave: () => void;
  onPublish: () => void;
  onTurnOff: () => void;
  // Makes the title editable when provided
  onNameChange?: (name: string) => void;
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
  validationFeedback,
  onDismissValidationFeedback,
  onSave,
  onPublish,
  onTurnOff,
  onNameChange,
}) => {
  const { isAdmin7 } = useShade();
  const entering = useScreenEntrance();
  const name = automation?.name;
  const status = automation?.status;

  const withValidationFeedback = (
    action: AutomationValidationAction,
    button: React.ReactElement,
  ) => {
    return (
      <Popover
        open={validationFeedback === action}
        onOpenChange={(open) => {
          // Ignore the trigger's request to open; validationFeedback opens it when validation fails.
          // Still allow Escape and outside clicks to dismiss it.
          if (!open) {
            onDismissValidationFeedback();
          }
        }}
      >
        <PopoverTrigger asChild>{button}</PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-72"
          onCloseAutoFocus={(event) => event.preventDefault()}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <Text role="status" size="md">
            {validationMessages[action]}
          </Text>
        </PopoverContent>
      </Popover>
    );
  };

  let statusAction: React.ReactNode;
  switch (status) {
    case undefined:
      statusAction = null;
      break;
    case 'active':
      statusAction = withValidationFeedback(
        'unpublish',
        <Button
          disabled={!isTurnOffButtonEnabled}
          variant={isAdmin7 ? 'ghost' : 'outline'}
          onClick={onTurnOff}
        >
          Turn off
        </Button>,
      );
      break;
    case 'inactive':
    case 'archived':
      statusAction = withValidationFeedback(
        'save',
        <Button
          disabled={!isSaveButtonEnabled}
          variant={isAdmin7 && saveButtonVariant === 'outline' ? 'ghost' : saveButtonVariant}
          onClick={onSave}
        >
          {saveButtonChildren}
        </Button>,
      );
      break;
    default: {
      const _exhaustive: never = status;
      throw new Error(`Unhandled status: ${String(_exhaustive)}`);
    }
  }

  return (
    <header
      className={cn(
        'screen-exit-chrome-top relative z-10 flex h-14 shrink-0 items-center justify-between border-b border-border-default bg-surface-elevated px-4',
        entering && 'screen-enter-from-top',
      )}
    >
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
            {onNameChange && name !== undefined ? (
              <AutomationNameField value={name} onChange={onNameChange} />
            ) : (
              <span className="truncate text-control font-medium">{name}</span>
            )}
            {status && <AutomationStatusBadge status={status} />}
          </>
        )}
      </Inline>
      <Inline className="shrink-0" gap="sm">
        {statusAction}
        {withValidationFeedback(
          'publish',
          <Button
            disabled={!isPublishButtonEnabled}
            variant={publishButtonVariant}
            onClick={onPublish}
          >
            {publishButtonChildren}
          </Button>,
        )}
      </Inline>
    </header>
  );
};

export default AutomationHeader;
