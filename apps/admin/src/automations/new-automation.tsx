import React from 'react';
import { Navigate } from '@tryghost/admin-x-framework';
import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { Button, LoadingIndicator } from '@tryghost/shade/components';
import { DirtyConfirmDialog } from '@tryghost/shade/patterns';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { Background, ReactFlow } from '@xyflow/react';
import AutomationHeader from './components/automation-header';
import { AutomationCanvasControls } from './components/canvas/controls';
import { AutomationCanvasSkeleton } from './components/canvas/canvas-skeleton';
import { CANVAS_ZOOM_CONFIG } from './components/canvas/use-canvas-viewport';
import { canvasBackground } from './components/canvas/canvas-background';
import { useVisibleAutomations } from './hooks/use-visible-automations';
import { getNewAutomationName } from './utils/get-new-automation-name';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';

const TriggerPicker: React.FC<{
  automation: AutomationDetail;
  onPick: (scope: 'free' | 'all_paid') => void;
}> = ({ automation, onPick }) => {
  const { dialogProps } = useUnsavedChangesGuard({ when: true });
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
        validationFeedbackEnabled={false}
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
        <Stack align="center" className="pointer-events-none absolute inset-0" justify="center">
          <Stack
            className="pointer-events-auto w-[400px] max-w-[calc(100%-32px)] rounded-xl border border-border-default bg-surface-elevated p-6 shadow-sm"
            gap="xl"
          >
            <Text weight="semibold">Select a trigger</Text>
            {(
              [
                [
                  'free',
                  LucideIcon.UserPlus,
                  'Member signs up',
                  'When someone signs up as a free member',
                ],
                [
                  'all_paid',
                  LucideIcon.CreditCard,
                  'Paid subscription starts',
                  'When someone signs up as a paid member or upgrades',
                ],
              ] as const
            ).map(([scope, Icon, title, description]) => (
              <Button
                key={scope}
                className="-mx-2 h-auto justify-start px-2 text-left whitespace-normal"
                shape="rounded"
                variant="ghost"
                onClick={() => onPick(scope)}
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
        </Stack>
      </Box>
      <DirtyConfirmDialog {...dialogProps} />
    </Stack>
  );
};

const NewAutomationLoading: React.FC = () => {
  const screenTransitions = useFeatureFlag('admin7ScreenTransitions');
  if (!screenTransitions) {
    return <LoadingIndicator size="lg" />;
  }
  return (
    <Stack className="fixed inset-0 z-50 bg-background" gap="none">
      <AutomationHeader
        automation={undefined}
        isLoadingAutomation={true}
        isPublishButtonEnabled={false}
        isSaveButtonEnabled={false}
        isTurnOffButtonEnabled={false}
        publishButtonChildren="Publish"
        publishButtonVariant="default"
        saveButtonChildren="Save"
        saveButtonVariant="outline"
        validationFeedback={null}
        validationFeedbackEnabled={false}
        onDismissValidationFeedback={() => {}}
        onPublish={() => {}}
        onSave={() => {}}
        onTurnOff={() => {}}
      />
      <AutomationCanvasSkeleton />
    </Stack>
  );
};

type NewAutomationProps = {
  children: (automation: AutomationDetail) => React.ReactNode;
};

const NewAutomationSession: React.FC<
  NewAutomationProps & {
    automations: Parameters<typeof getNewAutomationName>[0];
    stripeEnabled: boolean;
    isStripeReady: boolean;
  }
> = ({ children, automations, stripeEnabled, isStripeReady }) => {
  const [initialAutomation, setInitialAutomation] = React.useState<AutomationDetail | null>(null);
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
        trigger_tier_scope: stripeEnabled ? null : 'free',
        trigger_tier_ids: null,
      });
    }
    return <NewAutomationLoading />;
  }
  if (initialAutomation.trigger_tier_scope === null) {
    return (
      <TriggerPicker
        automation={initialAutomation}
        onPick={(scope) =>
          setInitialAutomation({
            ...initialAutomation,
            trigger_tier_scope: scope,
          })
        }
      />
    );
  }
  return children(initialAutomation);
};

const NewAutomation: React.FC<NewAutomationProps> = ({ children }) => {
  const { allAutomations, stripeEnabled, isStripeReady, isLoading, isError, error } =
    useVisibleAutomations();
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
    >
      {children}
    </NewAutomationSession>
  );
};

export default NewAutomation;
