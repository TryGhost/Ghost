// PROTOTYPE ONLY (NY-1750): every trigger card side by side, to compare their patterns.
// Reached at /automations/triggers. Nothing here saves; each card keeps its own local state
// and reads this site's real tiers and labels. Don't merge this page.
//
// Current: the shipped cards. Proposed: one field pattern for every trigger, the "Paid
// subscription changed" From/To field (`TierScopePicker`): type in the field, a single choice
// reads as plain text and closes the list, several choices read as chips.
import React, { useId, useState } from 'react';
import type { AutomationTriggerRule } from '@tryghost/admin-x-framework/api/automations';
import { useBrowseTiers } from '@tryghost/admin-x-framework/api/tiers';
import { Label, Switch } from '@tryghost/shade/components';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import {
  AutomationCard,
  AutomationCardHeader,
} from '@/automations/components/canvas/automation-card';
import { TierScopePicker } from '@/automations/components/canvas/tier-scope-picker';
import { TriggerCard, type TriggerData } from '@/automations/components/canvas/trigger-card';
import {
  buildTriggerRules,
  getTriggerTierIds,
  subscriptionChangedSelectionFromRules,
} from '@/automations/utils/trigger-rules';
import { hasMissingTierSelection } from '@/automations/utils/tier-selection';
import type { LabelSelection } from '@/automations/types';

type TierTriggerType = AutomationTriggerRule['trigger_type'];
type TierQuery = TriggerData['tierQuery'];

// The editor's trigger errors (`getTriggerErrors` in editor.tsx), per card.
const tierTriggerError = (
  triggerType: TierTriggerType,
  rules: readonly AutomationTriggerRule[],
): string | undefined => {
  if (triggerType === 'paid_subscription_changed') {
    return hasMissingTierSelection(subscriptionChangedSelectionFromRules(rules))
      ? 'Select at least one tier.'
      : undefined;
  }
  return rules.length === 0 ? 'Select at least one paid tier.' : undefined;
};

// --- Current ---

const TierTriggerCard: React.FC<{
  triggerType: TierTriggerType;
  initialRules: AutomationTriggerRule[];
  tierQuery: TierQuery;
  showErrors: boolean;
}> = ({ triggerType, initialRules, tierQuery, showErrors }) => {
  const [rules, setRules] = useState<readonly AutomationTriggerRule[]>(initialRules);
  return (
    <TriggerCard
      errorMessage={showErrors ? tierTriggerError(triggerType, rules) : undefined}
      trigger={{
        tierQuery,
        triggerType,
        rules,
        savedTierIds: [],
        onUpdate: (next) => setRules(next.trigger_rules),
      }}
    />
  );
};

const LabelTriggerCard: React.FC<{
  tierQuery: TierQuery;
  showErrors: boolean;
}> = ({ tierQuery, showErrors }) => {
  const [labelSelection, setLabelSelection] = useState<LabelSelection>(null);
  return (
    <TriggerCard
      errorMessage={showErrors && labelSelection === null ? 'Select a label.' : undefined}
      trigger={{
        tierQuery,
        // The same stand-in rule the editor gives this trigger.
        triggerType: 'free_signup',
        rules: buildTriggerRules({ triggerType: 'free_signup' }),
        savedTierIds: [],
        onUpdate: () => {},
        labelSelection: { value: labelSelection, onChange: setLabelSelection },
      }}
    />
  );
};

// --- Proposed ---

// The trigger card's shell (`TriggerCard`), around a proposed field.
const ProposedCard: React.FC<
  React.PropsWithChildren<{
    title: string;
    Icon: React.ComponentType<{ className?: string }>;
    errorMessage?: string;
    errorId: string;
  }>
> = ({ title, Icon, errorMessage, errorId, children }) => (
  <AutomationCard aria-label={title} className="w-[400px]" gap="xl">
    <AutomationCardHeader
      icon={<Icon className="size-4" />}
      iconClassName="p-2.5 text-foreground"
      title={title}
    />
    <Stack className="nowheel" gap="sm">
      {children}
      {errorMessage && (
        <Text as="p" className="text-destructive" id={errorId} role="alert" size="sm">
          {errorMessage}
        </Text>
      )}
    </Stack>
  </AutomationCard>
);

// "Paid subscription started" on the From/To field: "Any paid tier" and the tiers in one list,
// instead of a scope Select that reveals a second tier field.
const ProposedPaidStartedCard: React.FC<{ tierQuery: TierQuery; showErrors: boolean }> = ({
  tierQuery,
  showErrors,
}) => {
  const id = useId();
  // Starts unanswered, like "Paid subscription changed", rather than on "Any paid tier".
  const [rules, setRules] = useState<readonly AutomationTriggerRule[]>([]);
  const value =
    rules[0]?.scope === 'any_paid_tier' ? ('any_paid_tier' as const) : getTriggerTierIds(rules);
  const tiers = tierQuery.data?.tiers ?? [];
  const errorMessage = showErrors
    ? tierTriggerError('paid_subscription_started', rules)
    : undefined;
  return (
    <ProposedCard
      errorId={`${id}-error`}
      errorMessage={errorMessage}
      Icon={LucideIcon.CreditCard}
      title="Paid subscription started"
    >
      <Label className="leading-normal font-normal" htmlFor={`${id}-tiers`}>
        Triggered when a new or free member starts:
      </Label>
      <TierScopePicker<'any_paid_tier'>
        describedBy={errorMessage ? `${id}-error` : undefined}
        emptyMessage={tiers.length === 0 ? 'No paid tiers available.' : 'No tiers found'}
        inputId={`${id}-tiers`}
        inputLabel="Tiers"
        invalid={Boolean(errorMessage)}
        options={tiers}
        placeholder="Select tiers..."
        standalone={{ value: 'any_paid_tier', label: 'Any paid tier' }}
        value={value}
        onChange={(next) =>
          setRules(
            next === 'any_paid_tier'
              ? buildTriggerRules({ triggerType: 'paid_subscription_started', scope: next })
              : buildTriggerRules({
                  triggerType: 'paid_subscription_started',
                  scope: 'specific_paid_tier',
                  tierIds: next,
                }),
          )
        }
      />
    </ProposedCard>
  );
};

// --- Page ---

const Column: React.FC<React.PropsWithChildren<{ name: string }>> = ({ name, children }) => (
  <Stack gap="sm">
    <Text className="font-mono" size="sm" tone="secondary">
      {name}
    </Text>
    {children}
  </Stack>
);

const Section: React.FC<React.PropsWithChildren<{ title: string; description: string }>> = ({
  title,
  description,
  children,
}) => (
  <Stack gap="lg">
    <Stack gap="xs">
      <Text as="h2" size="lg" weight="semibold">
        {title}
      </Text>
      <Text size="md" tone="secondary">
        {description}
      </Text>
    </Stack>
    <Inline align="start" gap="xl" wrap>
      {children}
    </Inline>
  </Stack>
);

const TriggerPatterns: React.FC = () => {
  const id = useId();
  const [showErrors, setShowErrors] = useState(false);
  const {
    data: tierData,
    isLoading,
    isError,
    refetch,
  } = useBrowseTiers({
    searchParams: { filter: 'type:paid', limit: 'all' },
    defaultErrorHandler: false,
  });
  const tierQuery = React.useMemo(
    () => ({ data: tierData, isLoading, isError, refetch }),
    [tierData, isLoading, isError, refetch],
  );

  return (
    // The editor canvas's colour (`--xy-background-color` in automation-canvas.tsx), without its dots.
    <Box className="min-h-full bg-preview-canvas p-10">
      <Stack gap="2xl">
        <Stack gap="lg">
          <Stack gap="xs">
            <Text as="h1" size="xl" weight="semibold">
              Trigger patterns
            </Text>
            <Text size="md" tone="secondary">
              Prototype only. Every trigger card, interactive, with this site&apos;s tiers and
              labels. Nothing saves.
            </Text>
          </Stack>
          <Inline align="center" gap="sm">
            <Switch checked={showErrors} id={`${id}-errors`} onCheckedChange={setShowErrors} />
            <Label htmlFor={`${id}-errors`}>Show validation errors</Label>
          </Inline>
        </Stack>

        <Section description="The trigger cards as they ship today." title="Current">
          <Column name="free_signup">
            <TierTriggerCard
              initialRules={buildTriggerRules({ triggerType: 'free_signup' })}
              showErrors={showErrors}
              tierQuery={tierQuery}
              triggerType="free_signup"
            />
          </Column>
          <Column name="paid_subscription_started">
            <TierTriggerCard
              initialRules={buildTriggerRules({ triggerType: 'paid_subscription_started' })}
              showErrors={showErrors}
              tierQuery={tierQuery}
              triggerType="paid_subscription_started"
            />
          </Column>
          <Column name="paid_subscription_changed">
            <TierTriggerCard
              initialRules={[]}
              showErrors={showErrors}
              tierQuery={tierQuery}
              triggerType="paid_subscription_changed"
            />
          </Column>
          <Column name="member_label_added (NY-1750)">
            <LabelTriggerCard showErrors={showErrors} tierQuery={tierQuery} />
          </Column>
        </Section>

        <Section
          description="One field for every trigger: type in the field, one choice reads as plain text and closes the list, several read as chips."
          title="Proposed"
        >
          <Column name="free_signup (unchanged)">
            <TierTriggerCard
              initialRules={buildTriggerRules({ triggerType: 'free_signup' })}
              showErrors={showErrors}
              tierQuery={tierQuery}
              triggerType="free_signup"
            />
          </Column>
          <Column name="paid_subscription_started">
            <ProposedPaidStartedCard showErrors={showErrors} tierQuery={tierQuery} />
          </Column>
          <Column name="paid_subscription_changed (unchanged)">
            <TierTriggerCard
              initialRules={[]}
              showErrors={showErrors}
              tierQuery={tierQuery}
              triggerType="paid_subscription_changed"
            />
          </Column>
          <Column name="member_label_added (NY-1750)">
            <LabelTriggerCard showErrors={showErrors} tierQuery={tierQuery} />
          </Column>
        </Section>
      </Stack>
    </Box>
  );
};

export default TriggerPatterns;
