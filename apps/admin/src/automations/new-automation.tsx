import { signupTriggerRules } from './utils/trigger-rules';
import React from 'react';
import type {
  AutomationDetail,
  AutomationTriggerRule,
} from '@tryghost/admin-x-framework/api/automations';
import { Button, LoadingIndicator } from '@tryghost/shade/components';
import { DirtyConfirmDialog } from '@tryghost/shade/patterns';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { Background, ReactFlow } from '@xyflow/react';
import AutomationHeader from './components/automation-header';
import { AutomationCanvasControls } from './components/canvas/controls';
import { CANVAS_ZOOM_CONFIG } from './components/canvas/use-canvas-viewport';
import { canvasBackground } from './components/canvas/canvas-background';
import { useVisibleAutomations } from './hooks/use-visible-automations';
import { getNewAutomationName } from './utils/get-new-automation-name';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import { ScreenEntranceContext } from '@/layout/screen-transition';

type PickedTrigger = AutomationTriggerRule['trigger_type'];

const TRIGGER_OPTIONS = [
  [
    'free_signup',
    LucideIcon.UserPlus,
    'Free member signed up',
    'When someone signs up as a free member',
  ],
  [
    'paid_subscription_started',
    LucideIcon.CreditCard,
    'Paid subscription started',
    'When a new or free member starts a paid subscription',
  ],
] as const;

// Remains behind Labs while lifecycle enrollment and execution are being completed.
const SUBSCRIPTION_CHANGED_OPTION = [
  'paid_subscription_changed',
  LucideIcon.ArrowRightLeft,
  'Paid subscription changed',
  "When a member's paid subscription moves to another tier or ends",
] as const;

const TriggerPicker: React.FC<{
  automation: AutomationDetail;
  // `cardTop`: where the card sits, so the editor can open with the trigger in the same place.
  onPick: (trigger: PickedTrigger, cardTop: number) => void;
}> = ({ automation, onPick }) => {
  const { dialogProps } = useUnsavedChangesGuard({ when: true });
  const lifecycleTriggers = useFeatureFlag('automationsLifecycleTriggers');
  const options = lifecycleTriggers
    ? [...TRIGGER_OPTIONS, SUBSCRIPTION_CHANGED_OPTION]
    : TRIGGER_OPTIONS;
  const cardRef = React.useRef<HTMLDivElement>(null);
  return (
    <Stack className="fixed inset-0 z-50 bg-background" gap="none">
      <AutomationHeader
        automation={automation}
        isLoadingAutomation={false}
        isPublishButtonEnabled={false}
        isSaveButtonEnabled={false}
        isTurnOffButtonEnabled={false}
        publishButtonChildren="Publish"
        publishButtonVariant="default"
        saveButtonChildren="Save"
        saveButtonVariant="outline"
        validationFeedback={null}
        onDismissValidationFeedback={() => {}}
        onPublish={() => {}}
        onSave={() => {}}
        onTurnOff={() => {}}
      />
      <Box className="relative min-h-0 flex-1">
        <ReactFlow
          className="[--xy-background-color:var(--preview-canvas)]"
          edges={[]}
          maxZoom={CANVAS_ZOOM_CONFIG.maxZoom}
          minZoom={CANVAS_ZOOM_CONFIG.minZoom}
          nodes={[]}
          proOptions={{ hideAttribution: true }}
        >
          <Background {...canvasBackground} />
          <AutomationCanvasControls />
        </ReactFlow>
        {/* Slightly above center: 40% of the spare height above the card, 60% below. */}
        <Stack align="center" className="pointer-events-none absolute inset-0" gap="none">
          <Box className="min-h-12 flex-[2]" />
          <Stack
            ref={cardRef}
            className="pointer-events-auto w-[400px] max-w-[calc(100%-32px)] rounded-xl border border-border-default bg-surface-elevated p-6 shadow-sm"
            gap="xl"
          >
            <Text weight="semibold">Select a trigger</Text>
            {options.map(([trigger, Icon, title, description]) => (
              <Button
                key={trigger}
                className="-mx-2 h-auto justify-start px-2 text-left whitespace-normal"
                shape="rounded"
                variant="ghost"
                onClick={() => onPick(trigger, cardRef.current?.offsetTop ?? 0)}
              >
                <Inline gap="md">
                  <Inline className="size-9 shrink-0 rounded-md bg-muted" justify="center">
                    <Icon className="size-4" />
                  </Inline>
                  <Stack gap="none">
                    <Text weight="medium">{title}</Text>
                    <Text size="sm" tone="secondary">
                      {description}
                    </Text>
                  </Stack>
                </Inline>
              </Button>
            ))}
          </Stack>
          <Box className="min-h-12 flex-[3]" />
        </Stack>
      </Box>
      <DirtyConfirmDialog {...dialogProps} />
    </Stack>
  );
};

const NewAutomationLoading: React.FC = () => {
  return (
    <Stack align="center" className="delayed-fade-in fixed inset-0" justify="center" role="status">
      <LoadingIndicator size="lg" />
      <span className="sr-only">Loading automation</span>
    </Stack>
  );
};

type NewAutomationProps = {
  children: (creation: {
    automation: AutomationDetail;
    triggerType: PickedTrigger;
    // Where the picker's card was when the trigger was selected.
    triggerTop?: number;
  }) => React.ReactNode;
};

const NewAutomationSession: React.FC<
  NewAutomationProps & {
    automations: Parameters<typeof getNewAutomationName>[0];
    stripeEnabled: boolean;
    isStripeReady: boolean;
  }
> = ({ children, automations, stripeEnabled, isStripeReady }) => {
  const [initialAutomation, setInitialAutomation] = React.useState<AutomationDetail | null>(null);
  // Where the trigger was picked, once it has been.
  const [triggerTop, setTriggerTop] = React.useState<number | null>(null);
  const [triggerType, setTriggerType] = React.useState<PickedTrigger>('free_signup');
  if (!initialAutomation) {
    if (isStripeReady) {
      setInitialAutomation({
        id: '',
        name: getNewAutomationName(automations),
        description: '',
        status: 'inactive',
        created_at: '',
        updated_at: '',
        actions: [],
        edges: [],
        trigger_rules: stripeEnabled ? [] : signupTriggerRules('free_signup'),
      });
    }
    return <NewAutomationLoading />;
  }
  if (stripeEnabled && triggerTop === null) {
    return (
      <TriggerPicker
        automation={initialAutomation}
        onPick={(trigger, cardTop) => {
          setTriggerTop(cardTop);
          setTriggerType(trigger);
          setInitialAutomation({
            ...initialAutomation,
            trigger_rules:
              trigger === 'paid_subscription_changed' ? [] : signupTriggerRules(trigger),
          });
        }}
      />
    );
  }
  // The picker's header already played the screen's entrance; the editor's
  // header replacing it shouldn't play it a second time in the same visit.
  return triggerTop !== null ? (
    <ScreenEntranceContext.Provider value={false}>
      {children({ automation: initialAutomation, triggerType, triggerTop })}
    </ScreenEntranceContext.Provider>
  ) : (
    children({ automation: initialAutomation, triggerType })
  );
};

const NewAutomation: React.FC<NewAutomationProps> = ({ children }) => {
  const { allAutomations, stripeEnabled, isStripeReady, isLoading, isError, error } =
    useVisibleAutomations();
  if (isError && !allAutomations) {
    throw error instanceof Error ? error : new Error('Failed to load automations');
  }
  if (isLoading || !allAutomations) {
    return <NewAutomationLoading />;
  }
  return (
    <NewAutomationSession
      automations={allAutomations}
      isStripeReady={isStripeReady}
      stripeEnabled={stripeEnabled}
    >
      {children}
    </NewAutomationSession>
  );
};

export default NewAutomation;
