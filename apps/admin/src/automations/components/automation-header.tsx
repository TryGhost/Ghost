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
import { LucideIcon } from '@tryghost/shade/utils';
import { Inline, Text } from '@tryghost/shade/primitives';
import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';

export type AutomationValidationAction = 'publish' | 'save' | 'unpublish';

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
  validationFeedbackEnabled?: boolean;
  validationFeedback?: { action: AutomationValidationAction; message: string } | null;
  onDismissValidationFeedback?: () => void;
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
  validationFeedbackEnabled = false,
  validationFeedback,
  onDismissValidationFeedback,
  onSave,
  onPublish,
  onTurnOff,
}) => {
  const { isAdmin7 } = useShade();
  const name = automation?.name;
  const status = automation?.status;

  const withValidationFeedback = (
    action: AutomationValidationAction,
    button: React.ReactElement,
  ) => {
    if (!validationFeedbackEnabled) {
      return button;
    }
    return (
      <Popover
        open={validationFeedback?.action === action}
        onOpenChange={(open) => {
          // Only validation can open this popover; valid actions keep their normal flow.
          if (!open) {
            onDismissValidationFeedback?.();
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
            {validationFeedback?.action === action ? validationFeedback.message : null}
          </Text>
        </PopoverContent>
      </Popover>
    );
  };

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
        {status === 'active' &&
          withValidationFeedback(
            'unpublish',
            <Button disabled={!isTurnOffButtonEnabled} variant="outline" onClick={onTurnOff}>
              Turn off
            </Button>,
          )}
        {status === 'inactive' &&
          withValidationFeedback(
            'save',
            <Button disabled={!isSaveButtonEnabled} variant={saveButtonVariant} onClick={onSave}>
              {saveButtonChildren}
            </Button>,
          )}
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
