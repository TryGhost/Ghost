import React from 'react';
import { Navigate } from '@tryghost/admin-x-framework';
import type {
  AutomationDetail,
  AutomationTrigger,
} from '@tryghost/admin-x-framework/api/automations';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { Button, LoadingIndicator } from '@tryghost/shade/components';
import { DirtyConfirmDialog } from '@tryghost/shade/patterns';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { Background, ReactFlow } from '@xyflow/react';
import AutomationHeader from './components/automation-header';
import { AutomationCanvasControls } from './components/canvas/controls';
import { CANVAS_ZOOM_CONFIG } from './components/canvas/use-canvas-viewport';
import { canvasBackground } from './components/canvas/canvas-background';
import { useVisibleAutomations } from './hooks/use-visible-automations';
import { getNewAutomationName } from './utils/get-new-automation-name';
import { labelTrigger, membershipTrigger, withTrigger } from './utils/trigger';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import { ScreenEntranceContext } from '@/layout/screen-transition';

type TriggerOption = {
  key: string;
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  trigger: AutomationTrigger;
};

const getTriggerOptions = ({
  stripeEnabled,
  supportsTriggerTypes,
}: {
  stripeEnabled: boolean;
  supportsTriggerTypes: boolean;
}): TriggerOption[] => [
  {
    key: 'free',
    Icon: LucideIcon.UserPlus,
    title: 'Free member signed up',
    description: 'When someone signs up as a free member',
    trigger: membershipTrigger(
      { trigger_tier_scope: 'free', trigger_tier_ids: null },
      supportsTriggerTypes,
    ),
  },
  ...(stripeEnabled
    ? [
        {
          key: 'all_paid',
          Icon: LucideIcon.CreditCard,
          title: 'Paid subscription started',
          description: 'When a new or free member starts a paid subscription',
          trigger: membershipTrigger(
            { trigger_tier_scope: 'all_paid', trigger_tier_ids: null },
            supportsTriggerTypes,
          ),
        },
      ]
    : []),
  ...(supportsTriggerTypes
    ? [
        {
          key: 'label_added',
          Icon: LucideIcon.Tag,
          title: 'Label added',
          description: 'When a label is added to a member',
          trigger: labelTrigger([]),
        },
      ]
    : []),
];

const TriggerPicker: React.FC<{
  automation: AutomationDetail;
  options: readonly TriggerOption[];
  // `cardTop`: where the card sits, so the editor can open with the trigger in the same place.
  onPick: (trigger: AutomationTrigger, cardTop: number) => void;
}> = ({ automation, options, onPick }) => {
  const { dialogProps } = useUnsavedChangesGuard({ when: true });
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
            {options.map(({ key, Icon, title, description, trigger }) => (
              <Button
                key={key}
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
  // `triggerTop`: where the picker's card was, when a trigger was picked on it.
  children: (automation: AutomationDetail, triggerTop?: number) => React.ReactNode;
};

const NewAutomationSession: React.FC<
  NewAutomationProps & {
    automations: Parameters<typeof getNewAutomationName>[0];
    stripeEnabled: boolean;
    isStripeReady: boolean;
    supportsTriggerTypes: boolean;
  }
> = ({ children, automations, stripeEnabled, isStripeReady, supportsTriggerTypes }) => {
  const [initialAutomation, setInitialAutomation] = React.useState<AutomationDetail | null>(null);
  // Fixed with the draft, so a later settings refresh can't swap the choices under the picker.
  const [triggerOptions, setTriggerOptions] = React.useState<TriggerOption[]>([]);
  const [isPickingTrigger, setIsPickingTrigger] = React.useState(false);
  // Where the trigger was picked, once it has been.
  const [triggerTop, setTriggerTop] = React.useState<number | null>(null);
  if (!initialAutomation) {
    if (isStripeReady) {
      const options = getTriggerOptions({ stripeEnabled, supportsTriggerTypes });
      setTriggerOptions(options);
      // With a single choice there is nothing to pick.
      setIsPickingTrigger(options.length > 1);
      setInitialAutomation({
        id: '',
        name: getNewAutomationName(automations),
        description: '',
        status: 'inactive',
        created_at: '',
        updated_at: '',
        actions: [],
        edges: [],
        ...options[0].trigger,
      });
    }
    return <NewAutomationLoading />;
  }
  if (isPickingTrigger) {
    return (
      <TriggerPicker
        automation={initialAutomation}
        options={triggerOptions}
        onPick={(trigger, cardTop) => {
          setTriggerTop(cardTop);
          setIsPickingTrigger(false);
          setInitialAutomation(withTrigger(initialAutomation, trigger));
        }}
      />
    );
  }
  // The picker's header already played the screen's entrance; the editor's
  // header replacing it shouldn't play it a second time in the same visit.
  return triggerTop !== null ? (
    <ScreenEntranceContext.Provider value={false}>
      {children(initialAutomation, triggerTop)}
    </ScreenEntranceContext.Provider>
  ) : (
    children(initialAutomation)
  );
};

const NewAutomation: React.FC<NewAutomationProps> = ({ children }) => {
  const {
    allAutomations,
    stripeEnabled,
    isStripeReady,
    supportsTriggerTypes,
    isLoading,
    isError,
    error,
  } = useVisibleAutomations();
  const enabled = useFeatureFlag('automationsPerTier');
  if (!enabled) {
    return <Navigate to="/automations" replace />;
  }
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
      supportsTriggerTypes={supportsTriggerTypes}
    >
      {children}
    </NewAutomationSession>
  );
};

export default NewAutomation;
