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
  // SHAPING PROTOTYPE ONLY: the run being reviewed, in Docked and Floating.
  run?: AutomationHeaderRun;
}

type AutomationHeaderRun = { id: string; memberName: string; onClose: () => void };

// SHAPING PROTOTYPE ONLY: entering a run review, the status and actions fade up and out,
// then the member chip fades up into their place. Leaving plays it in reverse.
const REVIEW_STEP_MS = 150;
const reviewMotion =
  'transition-[opacity,translate] duration-150 ease-out motion-reduce:transition-none';
// The status and actions: out first when reviewing starts, back in second when it ends.
const editingOnly = (reviewing: boolean) =>
  cn(reviewMotion, reviewing ? 'pointer-events-none -translate-y-1 opacity-0' : 'delay-150');
// The member chip: in second, from just below, and out first, back down.
const reviewingOnly = (reviewing: boolean) =>
  cn(
    reviewMotion,
    reviewing
      ? 'delay-150 starting:translate-y-1 starting:opacity-0'
      : 'pointer-events-none translate-y-1 opacity-0',
  );
// Hides whatever has faded out from keyboard and screen readers too.
const inertWhen = (hidden: boolean) => (element: HTMLElement | null) => {
  if (element) {
    element.inert = hidden;
  }
};

// SHAPING PROTOTYPE ONLY: while a run is reviewed, its member stands in for the status
// and closes the review.
const RunChip: React.FC<{ run: AutomationHeaderRun }> = ({ run }) => {
  const button = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    button.current?.focus({ preventScroll: true });
  }, [run.id]);
  return (
    <Button
      ref={button}
      aria-label="Back to editing"
      className="max-w-full min-w-0 bg-surface-elevated"
      title={`Run ${run.id}`}
      variant="outline"
      onClick={run.onClose}
    >
      <LucideIcon.X aria-hidden="true" className="shrink-0" />
      <span className="truncate">{run.memberName}</span>
    </Button>
  );
};

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
  run,
}) => {
  const { controlShape } = useShade();
  const floating = chrome === 'floating';
  const reviewing = Boolean(run);
  // The chip stays until it has faded out after the review closes.
  const [shownRun, setShownRun] = React.useState(run);
  if (run && run !== shownRun) {
    setShownRun(run);
  }
  React.useEffect(() => {
    if (run) {
      return;
    }
    const timer = window.setTimeout(() => setShownRun(undefined), REVIEW_STEP_MS * 2);
    return () => window.clearTimeout(timer);
  }, [run]);
  // Floating over the canvas, ghost controls need a surface to read as buttons.
  const floatingSurface = floating ? 'bg-surface-elevated' : undefined;
  const sidebarMotion =
    sidebar.animated && `duration-300 ${CHROME_EASE} motion-reduce:transition-none`;
  const entering = useScreenEntrance();
  const name = automation?.name;
  const status = automation?.status;
  // The status and chip share one spot beside the title.
  const statusSlot = (
    <span className="inline-grid min-w-0 grid-cols-[minmax(0,auto)] items-center [&>*]:col-start-1 [&>*]:row-start-1">
      {status && (
        <span ref={inertWhen(reviewing)} className={editingOnly(reviewing)}>
          <AutomationStatusBadge status={status} />
        </span>
      )}
      {shownRun && (
        <span ref={inertWhen(!reviewing)} className={cn('min-w-0', reviewingOnly(reviewing))}>
          <RunChip run={shownRun} />
        </span>
      )}
    </span>
  );

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
        {/* 32px from the edges, matching the sidebar card's content. */}
        <Inline className="pointer-events-auto absolute top-8 left-8 max-w-[50%] min-w-0" gap="sm">
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
              {statusSlot}
            </>
          )}
        </Inline>
        {/* Keeps 32px clear of the sidebar card, sliding with it, and one gap clear of
            the toggle. The card's left edge is 472px in (480px less its 8px inset). */}
        <Inline
          className={cn(
            'pointer-events-auto absolute top-8 shrink-0',
            sidebarMotion && `transition-[right] ${sidebarMotion}`,
            !sidebar.available ? 'right-8' : sidebar.open ? 'right-[504px]' : 'right-18',
          )}
          gap="sm"
        >
          <Inline ref={inertWhen(reviewing)} className={editingOnly(reviewing)} gap="sm">
            {actions}
          </Inline>
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
            {statusSlot}
          </>
        )}
      </Inline>
      <Inline className="shrink-0" gap="sm">
        <Inline ref={inertWhen(reviewing)} className={editingOnly(reviewing)} gap="sm">
          {actions}
        </Inline>
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
