import AutomationNameField from './automation-name-field';
import AutomationStatusBadge from './automation-status-badge';
import React from 'react';
import { useShade } from '@tryghost/shade/app';
import {
  Button,
  type ButtonProps,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import ChangesIndicator from '@/automations/concepts/changes-indicator';
import { EditedLabel } from '@/automations/concepts/modified-dot';
import { isCanvasCardV2, useConcept } from '@/automations/concepts/concept';
import type { PendingChangesKind } from '@/automations/concepts/pending-changes';

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
  // NY-1715 concepts: unsaved or unpublished changes waiting on the buttons here.
  pendingChanges?: PendingChangesKind | null;
  // NY-1715 concept C: the corner only takes the automation live (Publish) or off (Turn off);
  // saving and publishing changes move to the floating changes bar.
  publishOnly?: boolean;
  // NY-1715 concepts E and F: the button that keeps the changes becomes a split button whose
  // menu discards them — Publish changes on a live automation, and in E, Save on one that's off.
  onDiscard?: () => void;
  // NY-1715 concept E: Save is a disabled ghost button with nothing to save, and an outline
  // split button (with onDiscard) once there is.
  saveSplit?: boolean;
  // NY-1715 concept E: Discard all changes is a plain item with the undo arrow, as it can be
  // undone; F keeps the red trash can.
  neutralDiscard?: boolean;
  // NY-1715 concept E: the cards' Unsaved changes marker, for the whole automation, beside
  // the buttons that settle it.
  showsUnsavedMarker?: boolean;
}

// NY-1715 concepts E and F: `button` with a chevron beside it, joined, whose menu discards the
// changes it would keep.
const DiscardSplitButton: React.FC<{
  button: React.ReactElement;
  chevronClassName: string;
  disabled: boolean;
  label: string;
  neutral: boolean;
  variant: ButtonProps['variant'];
  onDiscard: () => void;
}> = ({ button, chevronClassName, disabled, label, neutral, variant, onDiscard }) => (
  <Inline gap="none">
    {button}
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={label}
          className={cn('w-8 rounded-l-none px-0', chevronClassName)}
          disabled={disabled}
          variant={variant}
        >
          <LucideIcon.ChevronDown strokeWidth={2} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className={cn(!neutral && 'text-destructive focus:text-destructive')}
          onSelect={onDiscard}
        >
          {neutral ? (
            <LucideIcon.Undo2 className="size-4" />
          ) : (
            <LucideIcon.Trash2 className="size-4" />
          )}
          {/* E is trying "Undo all changes"; F keeps "Discard all changes". */}
          {neutral ? 'Undo all changes' : 'Discard all changes'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </Inline>
);

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
  pendingChanges = null,
  publishOnly = false,
  onDiscard,
  saveSplit = false,
  neutralDiscard = false,
  showsUnsavedMarker = false,
}) => {
  const { isAdmin7 } = useShade();
  // NY-1715 concept E: shorter publish validation copy.
  const isConceptE = isCanvasCardV2(useConcept());
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
            {isConceptE && action === 'publish'
              ? 'Fix all errors to publish'
              : validationMessages[action]}
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
          variant={isAdmin7 || publishOnly ? 'ghost' : 'outline'}
          onClick={onTurnOff}
        >
          Turn off
        </Button>,
      );
      break;
    case 'inactive':
    case 'archived':
      if (publishOnly) {
        statusAction = null;
        break;
      }
      if (saveSplit) {
        // E: ghost while there's nothing to save, outline once there is (Retry keeps its red).
        const variant =
          saveButtonVariant === 'destructive'
            ? 'destructive'
            : isSaveButtonEnabled
              ? 'outline'
              : 'ghost';
        const saveButton = withValidationFeedback(
          'save',
          <Button
            className={cn(onDiscard && 'rounded-r-none')}
            disabled={!isSaveButtonEnabled}
            variant={variant}
            onClick={onSave}
          >
            {saveButtonChildren}
          </Button>,
        );
        statusAction = onDiscard ? (
          <DiscardSplitButton
            button={saveButton}
            // One line between the halves: Save's own edge. The chevron drops its left edge,
            // both the border (Admin) and the outline shadow (Admin 7, a ring drawn outside the
            // button, clipped away on the left only so its drop shadow stays).
            chevronClassName="border-l-0 [clip-path:inset(-8px_-8px_-8px_0)]"
            disabled={!isSaveButtonEnabled}
            label="More save options"
            neutral={neutralDiscard}
            variant={variant}
            onDiscard={onDiscard}
          />
        ) : (
          saveButton
        );
        break;
      }
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
        {pendingChanges && <ChangesIndicator className="mr-1" kind={pendingChanges} />}
        {showsUnsavedMarker && <EditedLabel className="mr-1" showText />}
        {statusAction}
        {!(publishOnly && status === 'active') &&
          (onDiscard && status === 'active' ? (
            <DiscardSplitButton
              button={withValidationFeedback(
                'publish',
                <Button
                  className="rounded-r-none"
                  disabled={!isPublishButtonEnabled}
                  variant={publishButtonVariant}
                  onClick={onPublish}
                >
                  {publishButtonChildren}
                </Button>,
              )}
              chevronClassName="border-l border-primary-foreground/20"
              disabled={!isPublishButtonEnabled}
              label="More publish options"
              neutral={neutralDiscard}
              variant={publishButtonVariant}
              onDiscard={onDiscard}
            />
          ) : (
            withValidationFeedback(
              'publish',
              <Button
                disabled={!isPublishButtonEnabled}
                variant={publishButtonVariant}
                onClick={onPublish}
              >
                {publishButtonChildren}
              </Button>,
            )
          ))}
      </Inline>
    </header>
  );
};

export default AutomationHeader;
