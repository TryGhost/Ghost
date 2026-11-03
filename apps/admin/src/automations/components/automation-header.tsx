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
import type { EditorChrome } from './types';
import { CHROME_EASE } from './canvas/automation-sidebar';

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
  chrome: EditorChrome;
  sidebar: { available: boolean; open: boolean; animated: boolean };
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
  chrome,
  sidebar,
  onNameChange,
}) => {
  const { controlShape } = useShade();
  const floating = chrome === 'floating';
  // Floating over the canvas, ghost controls need a surface to read as buttons.
  const floatingSurface = floating ? 'bg-surface-elevated' : undefined;
  const sidebarMotion =
    sidebar.animated && `duration-300 ${CHROME_EASE} motion-reduce:transition-none`;
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
          className={floatingSurface}
          disabled={!isTurnOffButtonEnabled}
          variant="ghost"
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
          className={saveButtonVariant === 'outline' ? floatingSurface : undefined}
          disabled={!isSaveButtonEnabled}
          variant={saveButtonVariant === 'outline' ? 'ghost' : saveButtonVariant}
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

  const backButton = (
    <Button className={floatingSurface} size="icon" variant="ghost" asChild>
      <Link aria-label="Back to automations" to="/automations">
        <LucideIcon.ArrowLeft strokeWidth={2} />
      </Link>
    </Button>
  );

  const actions = (
    <>
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
    </>
  );

  if (floating) {
    return (
      <header
        className={cn(
          'screen-exit-chrome-top pointer-events-none absolute inset-x-0 top-0 z-30 h-0',
          entering && 'screen-enter-from-top',
        )}
      >
        <Inline className="pointer-events-auto absolute top-5 left-6 max-w-[50%] min-w-0" gap="sm">
          {backButton}
          {isLoadingAutomation ? (
            <Skeleton className="h-5 w-40" />
          ) : (
            <>
              {onNameChange && name !== undefined ? (
                <AutomationNameField value={name} surface onChange={onNameChange} />
              ) : (
                <span
                  className={cn(
                    'flex h-(--control-height) min-w-0 items-center bg-surface-elevated',
                    'px-3',
                    controlShape === 'pill' ? 'rounded-full' : 'rounded-control',
                  )}
                >
                  <span className="min-w-0 truncate text-control font-medium">{name}</span>
                </span>
              )}
              {status && <AutomationStatusBadge status={status} />}
            </>
          )}
        </Inline>
        {/* Keeps clear of the sidebar card, sliding with it, and of the toggle. */}
        <Inline
          className={cn(
            'pointer-events-auto absolute top-5 shrink-0',
            sidebarMotion && `transition-[right] ${sidebarMotion}`,
            !sidebar.available ? 'right-6' : sidebar.open ? 'right-[496px]' : 'right-16',
          )}
          gap="sm"
        >
          {actions}
        </Inline>
      </header>
    );
  }

  return (
    <header
      className={cn(
        'screen-exit-chrome-top relative z-10 flex h-14 shrink-0 items-center justify-between border-b border-border-default bg-surface-elevated px-4',
        entering && 'screen-enter-from-top',
      )}
    >
      <Inline className="min-w-0" gap="sm">
        {backButton}
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
        {actions}
        {/* The sidebar toggle's footprint while it sits over this row. */}
        {chrome === 'docked' && sidebar.available && (
          <span
            aria-hidden="true"
            className={cn(
              'shrink-0',
              sidebarMotion && `transition-[width,margin] ${sidebarMotion}`,
              sidebar.open ? '-ml-2 w-0' : 'w-(--control-height)',
            )}
          />
        )}
      </Inline>
    </header>
  );
};

export default AutomationHeader;
