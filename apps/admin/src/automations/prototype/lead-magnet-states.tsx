// PROTOTYPE ONLY (NY-1750): every lead magnet state on one page, each with the case it covers and
// the UI for it, so they can be accounted for before refinement. Reached at
// /automations/lead-magnet-states. Nothing saves, and the labels and counts are made up. Don't merge
// this page.
import React, { useId, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Label,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@tryghost/shade/components';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn, formatNumber } from '@tryghost/shade/utils';
import { useParams } from '@tryghost/admin-x-framework';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useBrowseTiers } from '@tryghost/admin-x-framework/api/tiers';
import {
  AutomationCard,
  AutomationCardHeader,
} from '@/automations/components/canvas/automation-card';
import { TierScopePicker } from '@/automations/components/canvas/tier-scope-picker';
import { TriggerCard, type TriggerData } from '@/automations/components/canvas/trigger-card';
import { buildTriggerRules } from '@/automations/utils/trigger-rules';
import type { LabelSelection } from '@/automations/types';
import {
  ImportMappingPreview,
  LabelPicker,
  MemberDetailForm,
  canCreateLabel,
  useLabelPicker,
} from '@/members/api';
import { TriggerPickerCard } from '@/automations/components/trigger-picker-card';
import { LabelTriggerMessage } from '@/automations/components/automation-status-dialog';
import {
  FREE_SIGNUP_OPTION,
  LABEL_ADDED_OPTION,
  PAID_STARTED_OPTION,
  SUBSCRIPTION_CHANGED_OPTION,
} from '@/automations/utils/trigger-options';
import { LeadMagnetSaveDialog } from './lead-magnets-dialog';
import { LeadMagnetDeleteBlockedDescription } from './lead-magnets-delete-dialog';
import {
  LeadMagnetBulkNoteText,
  LeadMagnetHintLine,
  LeadMagnetHintName,
  LeadMagnetMemberNoteText,
} from './lead-magnets-bulk-note';
import {
  LeadMagnetAnimatedBanner,
  LeadMagnetBannerFrame,
  LeadMagnetReveal,
} from './lead-magnets-banner';
import { BULK_NOTE_THRESHOLD } from './lead-magnets';
import { LeadMagnetBulkBannerText, LeadMagnetBulkConfirmText } from './lead-magnets-bulk-patterns';
import { PageHeader } from '@tryghost/shade/patterns';
import { toast } from 'sonner';

// --- Page structure ---

// An example: its name above the UI, or, with a `description`, the name and scenario on the left
// and the UI on the right (trying this on Trigger states first): 240px, a 64px gap, then the UI.
const Column: React.FC<
  React.PropsWithChildren<{ name: string; description?: string; stacked?: boolean }>
> = ({ name, description, stacked, children }) => {
  if (stacked) {
    // Title (and description) above, so a wide example gets the full width.
    return (
      <Stack gap="lg">
        <Stack className="max-w-2xl" gap="xs">
          <Text size="md" weight="medium">
            {name}
          </Text>
          {description && (
            <Text size="sm" tone="secondary">
              {description}
            </Text>
          )}
        </Stack>
        {children}
      </Stack>
    );
  }
  return description ? (
    <Box className="grid grid-cols-[240px_minmax(0,1fr)] items-start gap-16">
      <Stack gap="xs">
        <Text size="md" weight="medium">
          {name}
        </Text>
        <Text size="sm" tone="secondary">
          {description}
        </Text>
      </Stack>
      {children}
    </Box>
  ) : (
    <Stack gap="sm">
      <Text className="font-mono text-[10px]" size="sm" tone="secondary">
        {name}
      </Text>
      {children}
    </Stack>
  );
};

const State: React.FC<
  React.PropsWithChildren<{
    title: string;
    // Where in Admin this interaction lives, under the title.
    location?: string;
    useCase?: React.ReactNode;
    openQuestion?: React.ReactNode;
  }>
> = ({ title, location, useCase, openQuestion, children }) => (
  // Twice Shade's lg and 2xl gaps: 40px around the separator, 64px between examples.
  <Stack className="gap-10" gap="none">
    <Stack className="max-w-2xl" gap="xs">
      <Text as="h2" size="2xl" weight="semibold">
        {title}
      </Text>
      {location && (
        <Text size="sm" tone="secondary">
          {location}
        </Text>
      )}
      {useCase && (
        <Text size="md" tone="secondary">
          {useCase}
        </Text>
      )}
      {openQuestion && (
        <Text size="md" tone="secondary">
          <strong>Open question:</strong> {openQuestion}
        </Text>
      )}
    </Stack>
    <Separator />
    {/* Examples stacked, one under another. */}
    <Stack className="gap-16" gap="none">
      {children}
    </Stack>
  </Stack>
);

// The trigger card's shell (`TriggerCard`), around a state's field.
const TriggerShell: React.FC<
  React.PropsWithChildren<{ title: string; Icon: React.ComponentType<{ className?: string }> }>
> = ({ title, Icon, children }) => (
  <AutomationCard aria-label={title} className="w-[400px]" gap="xl">
    <AutomationCardHeader
      icon={<Icon className="size-4" />}
      iconClassName="p-2.5 text-foreground"
      title={title}
    />
    {children}
  </AutomationCard>
);

// Opens a real dialog from the page, as the editor's header would.
const DialogPreview: React.FC<{
  buttonLabel: string;
  children: (open: boolean, setOpen: (open: boolean) => void) => React.ReactNode;
}> = ({ buttonLabel, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button className="self-start" variant="outline" onClick={() => setOpen(true)}>
        {buttonLabel}
      </Button>
      {children(open, setOpen)}
    </>
  );
};

// --- 1. Trigger states ---

// The trigger's choice, disabled while the automation is active.
const LockedTriggerField: React.FC<{ fieldLabel: string; value: string }> = ({
  fieldLabel,
  value,
}) => {
  const id = useId();
  return (
    <Stack gap="sm">
      <Label className="leading-normal font-normal" htmlFor={`${id}-value`}>
        {fieldLabel}
      </Label>
      <InputGroup data-disabled="true">
        <InputGroupInput
          aria-describedby={`${id}-hint`}
          id={`${id}-value`}
          value={value}
          disabled
        />
        <InputGroupAddon align="inline-end">
          <LucideIcon.Lock />
        </InputGroupAddon>
      </InputGroup>
      <Text as="p" id={`${id}-hint`} size="sm" tone="secondary">
        Turn off automation to edit trigger
      </Text>
    </Stack>
  );
};

// A dialog laid out in place, styled as Shade's AlertDialogContent, so several can be compared
// side by side. A real AlertDialog is modal, so only one can be open at a time.
// `children` is the description under the title; `body` sits below it, as a dialog's form does.
const DialogCard: React.FC<
  React.PropsWithChildren<{
    title: string;
    actionLabel: string;
    cancelLabel?: string;
    body?: React.ReactNode;
    onAction?: () => void;
    onCancel?: () => void;
  }>
> = ({ title, actionLabel, cancelLabel = 'Cancel', body, onAction, onCancel, children }) => (
  <Box
    aria-label={title}
    className="grid w-[512px] gap-6 rounded-lg bg-surface-elevated-2 p-6 shadow-lg"
    role="group"
  >
    <AlertDialogHeader>
      <h3 className="text-xl font-semibold in-data-[admin7-design=true]:font-title">{title}</h3>
      {children && <div className="text-base">{children}</div>}
    </AlertDialogHeader>
    {body}
    <AlertDialogFooter>
      <Button variant="outline" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button onClick={onAction}>{actionLabel}</Button>
    </AlertDialogFooter>
  </Box>
);

// Stands in for the action itself, which this page doesn't run.
const notRun = (what: string) => toast(`Prototype: ${what}`);

// "Turn off automation?" with the number of members it removes, and that nobody starts while it's off.
const ProposedTurnOffCard: React.FC<{ inProgressCount: number }> = ({ inProgressCount }) => (
  <DialogCard actionLabel="Turn off" title="Turn off automation?">
    <p>
      {inProgressCount > 0 && (
        <>
          <strong>{formatNumber(inProgressCount)}</strong>{' '}
          {inProgressCount === 1 ? 'member' : 'members'} in progress will be removed.{' '}
        </>
      )}
      No members will start the automation while it&apos;s off.
    </p>
  </DialogCard>
);

// No label on this site has this slug, so the card reads it as a deleted label.
const DELETED_LABEL_SLUG = 'prototype-deleted-label';

// The real label trigger card, starting on `initialLabel`. Picking a label clears the error, as
// in the editor.
const LabelTriggerState: React.FC<{
  tierQuery: TriggerData['tierQuery'];
  initialLabel: LabelSelection;
  deletedName?: string;
  errorMessage?: string;
}> = ({ tierQuery, initialLabel, deletedName, errorMessage }) => {
  const [labelSelection, setLabelSelection] = useState<LabelSelection>(initialLabel);
  return (
    <TriggerCard
      errorMessage={labelSelection === initialLabel ? errorMessage : undefined}
      trigger={{
        tierQuery,
        // The same stand-in rule the editor gives this trigger.
        triggerType: 'free_signup',
        rules: buildTriggerRules({ triggerType: 'free_signup' }),
        savedTierIds: [],
        onUpdate: () => {},
        labelSelection: { value: labelSelection, onChange: setLabelSelection, deletedName },
      }}
    />
  );
};

const TriggerStatesState: React.FC = () => {
  const { data, isLoading, isError, refetch } = useBrowseTiers({
    searchParams: { filter: 'type:paid', limit: 'all' },
    defaultErrorHandler: false,
  });
  const tierQuery = React.useMemo(
    () => ({ data, isLoading, isError, refetch }),
    [data, isLoading, isError, refetch],
  );
  // Tabs, as on the other pages; a hint under the cases with something to click.
  const cases: { name: string; hint?: string; render: () => React.ReactNode }[] = [
    {
      name: 'Picker',
      render: () => (
        <TriggerPickerCard
          options={[
            FREE_SIGNUP_OPTION,
            PAID_STARTED_OPTION,
            SUBSCRIPTION_CHANGED_OPTION,
            LABEL_ADDED_OPTION,
          ]}
          onPick={() => {}}
        />
      ),
    },
    {
      name: 'Set up',
      render: () => <LabelTriggerState initialLabel={null} tierQuery={tierQuery} />,
    },
    {
      name: 'Locked',
      render: () => (
        <TriggerShell Icon={LucideIcon.Tag} title="Label added">
          <LockedTriggerField
            fieldLabel="Triggered when this label is added to a member:"
            value="Lead magnet"
          />
        </TriggerShell>
      ),
    },
    {
      name: 'Label missing',
      hint: 'Pick a label to clear the error',
      render: () => (
        <LabelTriggerState
          errorMessage="Select a label"
          initialLabel={null}
          tierQuery={tierQuery}
        />
      ),
    },
    {
      name: 'Label deleted',
      hint: 'Pick a different label to clear the error',
      render: () => (
        <LabelTriggerState
          deletedName="Spring ebook"
          errorMessage="Select a different label"
          initialLabel={DELETED_LABEL_SLUG}
          tierQuery={tierQuery}
        />
      ),
    },
  ];
  return (
    <State location="Automation editor" title="Trigger">
      <CaseSwitcher cases={cases}>
        {({ hint, render }) => (
          // 40px, twice Shade's lg, so the hint reads apart from the UI.
          <Stack className="gap-10" gap="none">
            {render()}
            {hint && (
              <Text className="italic" size="sm" tone="secondary">
                {hint}
              </Text>
            )}
          </Stack>
        )}
      </CaseSwitcher>
    </State>
  );
};

// --- 2. Turn off automation ---

// The editor's Publish confirmation (automation-status-dialog.tsx), with the real message for a
// Label added trigger: it names the label, and says members who already have it won't start.
// Tabs, as on the other dialog pages.
// Default is today's copy, for every other trigger; memberCount null marks it.
const START_AUTOMATION_CASES: { name: string; memberCount: number | null }[] = [
  { name: 'Default', memberCount: null },
  { name: 'Label in use', memberCount: 1240 },
  { name: 'Empty label', memberCount: 0 },
];

const StartAutomationState: React.FC = () => (
  <State location="Automation editor, Publish" title="Start automation">
    <CaseSwitcher cases={START_AUTOMATION_CASES}>
      {({ memberCount }) => (
        <DialogCard actionLabel="Publish" title="Start your automation?">
          {memberCount === null ? (
            <p>
              Once published, your automation goes live. Any member who meets the trigger will be
              enrolled automatically.
            </p>
          ) : (
            <LabelTriggerMessage labelTrigger={{ name: 'Lead magnet', memberCount }} />
          )}
        </DialogCard>
      )}
    </CaseSwitcher>
  </State>
);

const TurnOffState: React.FC = () => (
  <State location="Automation editor" title="Turn off">
    {/* The copy in automation-status-dialog.tsx today. */}
    <Column description="What turning off says today, for every automation." name="Existing">
      <DialogCard actionLabel="Turn off" title="Turn off automation?">
        <p>
          Your automation will no longer run, and any members currently in progress will be removed.
        </p>
      </DialogCard>
    </Column>
    <Column
      description="Says how many members are removed, and that nobody starts while it's off."
      name="Proposed: Active members"
    >
      <ProposedTurnOffCard inProgressCount={12} />
    </Column>
    <Column
      description="With nobody in progress, it only says that nobody starts while it's off."
      name="Proposed: None in progress"
    >
      <ProposedTurnOffCard inProgressCount={0} />
    </Column>
  </State>
);

// --- 3. Delete a label in use ---

type FakeLabel = { id: string; name: string; slug: string };

// Made-up labels, so nothing on this site can be deleted from this page.
const FAKE_LABELS: FakeLabel[] = [
  { id: 'free-trial', name: 'Free trial', slug: 'free-trial' },
  { id: 'lead-magnet', name: 'Lead magnet', slug: 'lead-magnet' },
  { id: 'spring-ebook', name: 'Spring ebook', slug: 'spring-ebook' },
  { id: 'vip', name: 'VIP', slug: 'vip' },
];

// Which made-up automation triggers on each label, and whether it's active.
const LABEL_AUTOMATIONS: Record<string, { name: string; active: boolean }> = {
  'lead-magnet': { name: 'Free guide delivery', active: true },
  'spring-ebook': { name: 'Spring ebook series', active: false },
};

// The label picker's options, all loaded at once.
const staticOptionSource = (labels: FakeLabel[]) => ({
  options: labels.map((label) => ({ value: label.slug, label: label.name })),
  isInitialLoad: false,
  isSearching: false,
  isLoadingMore: false,
  hasMore: false,
  loadMore: () => {},
  shouldClientFilter: true,
});

// The Admin API refuses the delete, and the picker shows why.
const DeleteBlockedDialog: React.FC<{
  blocked: { labelName: string; automationName: string } | null;
  onClose: () => void;
}> = ({ blocked, onClose }) => (
  <AlertDialog open={blocked !== null} onOpenChange={(open) => !open && onClose()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Can&apos;t delete label</AlertDialogTitle>
        <AlertDialogDescription>
          <LeadMagnetDeleteBlockedDescription
            automationName={blocked?.automationName ?? ''}
            labelName={blocked?.labelName ?? ''}
          />
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Close</AlertDialogCancel>
        {/* Would open the automation's editor; here it only closes. */}
        <AlertDialogAction onClick={onClose}>Go to automation</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

// The members label picker, on made-up labels. Its pencil opens the edit row with Delete.
const FakeLabelField: React.FC = () => {
  const [labels, setLabels] = useState(FAKE_LABELS);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [blocked, setBlocked] = useState<{ labelName: string; automationName: string } | null>(
    null,
  );
  const optionSource = React.useMemo(() => staticOptionSource(labels), [labels]);

  return (
    // In the members list's Add label dialog, for context: the picker most people delete from.
    <DialogCard
      actionLabel="Add label"
      body={
        <>
          <LabelPicker
            // Opens on Lead magnet's edit row, so Delete is one click away.
            initialEditingId={ACTIVE_LABEL}
            labels={labels}
            optionSource={optionSource}
            selectedSlugs={selectedSlugs}
            onDelete={(id) => {
              const label = labels.find((l) => l.id === id);
              setLabels((current) => current.filter((l) => l.id !== id));
              setSelectedSlugs((current) => current.filter((slug) => slug !== label?.slug));
              return Promise.resolve();
            }}
            // Blocked on the first Delete click, before the inline "Delete label?" confirm.
            onDeleteClick={(id) => {
              const label = labels.find((l) => l.id === id);
              const automation = label && LABEL_AUTOMATIONS[label.slug];
              if (label && automation?.active) {
                setBlocked({ labelName: label.name, automationName: automation.name });
                return true;
              }
              return false;
            }}
            onEdit={(id, name) => {
              setLabels((current) => current.map((l) => (l.id === id ? { ...l, name } : l)));
              return Promise.resolve();
            }}
            onToggle={(slug) =>
              setSelectedSlugs((current) =>
                current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
              )
            }
          />
          {/* The picker closes on any pointerdown outside it, and the dialog is portalled outside.
          React events bubble through portals, so stopping them here keeps the dropdown open
          behind the dialog and after it closes. `contents` adds no box to the card. */}
          <div className="contents" onPointerDown={(event) => event.stopPropagation()}>
            <DeleteBlockedDialog blocked={blocked} onClose={() => setBlocked(null)} />
          </div>
        </>
      }
      title="Add label to 48 members"
    />
  );
};

// As on the other dialog pages: the UI, and a hint under it to click through. The picker opens
// on Lead magnet's edit row, whose automation is on, so Delete brings up the real "Can't delete
// label" dialog; Spring ebook's is off, so it deletes as normal.
const DeleteLabelState: React.FC = () => (
  <State
    location="Any label picker: Member profile, Members index filter and bulk actions, Members import"
    title="Delete label"
  >
    {/* 40px, twice Shade's lg. The open dropdown hangs about 100px below the dialog, so the
        hint sits under the room it takes (pb-24) rather than behind it. */}
    <Stack className="gap-10" gap="none">
      <Box className="pb-24">
        <FakeLabelField />
      </Box>
      <Text className="italic" size="sm" tone="secondary">
        Click Delete to see response
      </Text>
    </Stack>
  </State>
);

// --- 4. Label warning on the member page ---

// Where this member stands with the active automation on "Lead magnet".
type MemberHistory = 'never' | 'in_progress' | 'done';

const ACTIVE_LABEL = 'lead-magnet';
const ACTIVE_AUTOMATION = LABEL_AUTOMATIONS[ACTIVE_LABEL].name;

// What saving does to this member, for the note under Labels.
const labelNote = (
  initialSlugs: string[],
  selectedSlugs: string[],
  history: MemberHistory,
): React.ReactNode => {
  const adds = !initialSlugs.includes(ACTIVE_LABEL) && selectedSlugs.includes(ACTIVE_LABEL);
  const removes = initialSlugs.includes(ACTIVE_LABEL) && !selectedSlugs.includes(ACTIVE_LABEL);
  if (adds && history === 'never') {
    return (
      <>
        Saving starts <strong>{ACTIVE_AUTOMATION}</strong> for this member
      </>
    );
  }
  if (adds) {
    return (
      <>
        This member has already been through <strong>{ACTIVE_AUTOMATION}</strong> and won&apos;t
        start it again
      </>
    );
  }
  if (removes && history === 'in_progress') {
    return (
      <>
        Saving removes this member from <strong>{ACTIVE_AUTOMATION}</strong>
      </>
    );
  }
  return null;
};

// The member form's Labels field (`MemberLabelsField`): the real label picker, on made-up labels,
// with the proposed note under it. Nothing saves.
const MemberLabelsDemo: React.FC<{ initialSlugs: string[]; history: MemberHistory }> = ({
  initialSlugs,
  history,
}) => {
  const id = useId();
  const [selectedSlugs, setSelectedSlugs] = useState(initialSlugs);
  const optionSource = React.useMemo(() => staticOptionSource(FAKE_LABELS), []);
  const note = labelNote(initialSlugs, selectedSlugs, history);
  return (
    <AutomationCard className="w-[400px]" gap="sm" role={undefined}>
      <Label id={`${id}-label`}>Labels</Label>
      <LabelPicker
        labels={FAKE_LABELS}
        optionSource={optionSource}
        placeholder=""
        selectedSlugs={selectedSlugs}
        onToggle={(slug) =>
          setSelectedSlugs((current) =>
            current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
          )
        }
      />
      {note && (
        <Text as="p" size="sm" tone="secondary">
          {note}
        </Text>
      )}
    </AutomationCard>
  );
};

// The alternative: ask on Save instead of a note under the field.
const StartForMemberDialog: React.FC<{ open: boolean; onOpenChange: (open: boolean) => void }> = ({
  open,
  onOpenChange,
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Start automation for this member?</AlertDialogTitle>
        <AlertDialogDescription>
          Adding the <strong>Lead magnet</strong> label starts the active automation{' '}
          <strong>{ACTIVE_AUTOMATION}</strong> for this member.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <Button onClick={() => onOpenChange(false)}>Save</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

const MemberPageState: React.FC = () => (
  <State location="Member profile" title="Label warning on the member page">
    <Column name="New or existing member: add Lead magnet">
      <MemberLabelsDemo history="never" initialSlugs={['vip']} />
    </Column>
    <Column name="Already been through it: add Lead magnet">
      <MemberLabelsDemo history="done" initialSlugs={['vip']} />
    </Column>
    <Column name="In progress: remove Lead magnet">
      <MemberLabelsDemo history="in_progress" initialSlugs={['lead-magnet', 'vip']} />
    </Column>
    <Column name="Alternative: ask on Save">
      <DialogPreview buttonLabel="Open dialog">
        {(open, setOpen) => <StartForMemberDialog open={open} onOpenChange={setOpen} />}
      </DialogPreview>
    </Column>
  </State>
);

// --- Member page: save dialog or note ---

// Emily already has VIP and is partway through VIP onboarding. Each case changes her labels.
// Made-up labels and automations, so nothing on this site changes.
const MEMBER_NAME = 'Emily Chen';
const MEMBER_SAVED_SLUGS = ['vip'];
const MEMBER_LABEL_AUTOMATIONS: Record<string, string[]> = {
  'lead-magnet': [LABEL_AUTOMATIONS['lead-magnet'].name],
  'free-trial': ['Trial nurture'],
  'spring-ebook': ['Spring ebook series', 'Spring sale reminders'],
  vip: ['VIP onboarding'],
};
// Emily's labels as she's saved, in each case.
const MEMBER_CASES = [
  { name: 'No change', labels: [...MEMBER_SAVED_SLUGS] },
  { name: '1 label added', labels: ['lead-magnet', 'vip'] },
  { name: '2 labels added', labels: ['lead-magnet', 'free-trial', 'vip'] },
  { name: '1 label, 2 automations', labels: ['spring-ebook', 'vip'] },
  { name: '1 label removed', labels: [] },
  { name: '1 added, 1 removed', labels: ['lead-magnet'] },
];

// The dialog concept's cases: labels added only.
// The dialog's cases: Emily's labels with one or two automation labels added, unsaved. A label
// starting two automations is an edge case: its rows stack the same way.
// "Table" tries the dialog's rows as a two-column table instead of arrows (Peter, 2026-11-17).
const MEMBER_DIALOG_CASES: { name: string; labels: string[]; layout?: 'arrows' | 'table' }[] = [
  { name: 'Single label', labels: ['lead-magnet', 'vip'] },
  { name: 'Multiple labels', labels: ['lead-magnet', 'free-trial', 'vip'] },
  { name: 'Table', labels: ['lead-magnet', 'free-trial', 'vip'], layout: 'table' },
];

// What saving starts and stops for Emily with these labels.
const memberChanges = (selectedSlugs: string[]) => {
  const toAutomations = (slugs: string[]) =>
    slugs.flatMap((slug) =>
      (MEMBER_LABEL_AUTOMATIONS[slug] ?? []).map((name) => ({ id: name, name, labelSlug: slug })),
    );
  return {
    starts: toAutomations(selectedSlugs.filter((slug) => !MEMBER_SAVED_SLUGS.includes(slug))),
    ends: toAutomations(MEMBER_SAVED_SLUGS.filter((slug) => !selectedSlugs.includes(slug))),
  };
};

const labelName = (slug: string) => FAKE_LABELS.find((label) => label.slug === slug)?.name ?? slug;
const toMemberLabels = (slugs: string[]) => slugs.map((slug) => ({ slug, name: labelName(slug) }));

type MemberDraft = React.ComponentProps<typeof MemberDetailForm>['draft'];

// The member page's Details card: the real form, in the page's card, with made-up labels.
const MemberDetailsCard: React.FC<{
  draft: MemberDraft;
  onChange: (draft: MemberDraft) => void;
  labelsHint?: React.ReactNode;
}> = ({ draft, onChange, labelsHint }) => {
  const admin7Design = useFeatureFlag('admin7Design');
  const optionSource = React.useMemo(() => staticOptionSource(FAKE_LABELS), []);
  const selectedSlugs = draft.labels.map((label) => label.slug);
  return (
    <Stack gap="sm">
      {admin7Design && (
        <Text as="h3" className="section-heading" size="md" weight="semibold">
          Details
        </Text>
      )}
      <Card variant={admin7Design ? 'ruled' : 'outline'}>
        <CardContent className={admin7Design ? undefined : 'p-6'}>
          <MemberDetailForm
            draft={draft}
            labelsField={
              <LabelPicker
                labels={FAKE_LABELS}
                optionSource={optionSource}
                placeholder=""
                selectedSlugs={selectedSlugs}
                onToggle={(slug) =>
                  onChange({ ...draft, labels: toMemberLabels(toggleSlug(selectedSlugs, slug)) })
                }
              />
            }
            labelsHint={labelsHint}
            onChange={(patch) => onChange({ ...draft, ...patch })}
          />
        </CardContent>
      </Card>
    </Stack>
  );
};

// Option B: the Details card with the note under Labels, framed like the dialogs so it reads as
// one pattern. Change Emily's labels and the note follows.
const MemberNoteDemo: React.FC<{ labels: string[] }> = ({ labels }) => {
  const [draft, setDraft] = useState<MemberDraft>({
    name: MEMBER_NAME,
    email: 'emily@example.com',
    note: '',
    labels: toMemberLabels(labels),
    newsletters: [],
  });
  const { starts, ends } = memberChanges(draft.labels.map((label) => label.slug));
  return (
    <Box className="rounded-lg bg-surface-elevated-2 p-8 shadow-lg">
      <MemberDetailsCard
        draft={draft}
        labelsHint={
          <LeadMagnetMemberNoteText
            memberName={draft.name}
            removals={ends.map(({ name }) => name)}
            starts={starts.map(({ name, labelSlug }) => ({
              labelName: labelName(labelSlug),
              automationName: name,
            }))}
          />
        }
        onChange={setDraft}
      />
    </Box>
  );
};

// The top of the member page: its header with Save, the banner, and the Details card, built from
// the real components on made-up data. Change Emily's labels and the banner opens and closes.
// Without the banner, Save can open the Save dialog instead.
const MemberPageExcerpt: React.FC<{
  labels: string[];
  showBanner?: boolean;
  onSave?: (changes: ReturnType<typeof memberChanges>) => void;
}> = ({ labels, showBanner = true, onSave }) => {
  const [draft, setDraft] = useState<MemberDraft>({
    name: MEMBER_NAME,
    email: 'emily@example.com',
    note: '',
    labels: toMemberLabels(labels),
    newsletters: [],
  });
  // Picking another state swaps in its labels without remounting, so the banner animates.
  const [shownLabels, setShownLabels] = useState(labels);
  if (labels !== shownLabels) {
    setShownLabels(labels);
    setDraft({ ...draft, labels: toMemberLabels(labels) });
  }
  const changes = memberChanges(draft.labels.map((label) => label.slug));
  return (
    <Box className="rounded-lg bg-surface-elevated-2 p-8 shadow-lg">
      {/* gap-5, as in the member page's header, which the banner's animation expects. */}
      <Stack gap="lg">
        <PageHeader blurredBackground={false} sticky={false}>
          <PageHeader.Left>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink>Members</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{draft.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </PageHeader.Left>
          <PageHeader.Actions>
            <PageHeader.ActionGroup>
              <PageHeader.ActionGroup.Primary>
                <Button className="min-w-16" onClick={() => onSave?.(changes)}>
                  Save
                </Button>
              </PageHeader.ActionGroup.Primary>
            </PageHeader.ActionGroup>
          </PageHeader.Actions>
        </PageHeader>
        {showBanner && (
          <LeadMagnetAnimatedBanner
            changes={changes}
            labelNames={Object.fromEntries(FAKE_LABELS.map(({ slug, name }) => [slug, name]))}
          />
        )}
        <MemberDetailsCard draft={draft} onChange={setDraft} />
      </Stack>
    </Box>
  );
};

// One example, with tabs that switch it between the cases. Remounts the example on each switch,
// so it starts from that case, unless keepMounted: then the example gets the new case and can
// animate the change.
function CaseSwitcher<C extends { name: string }>({
  cases,
  keepMounted = false,
  children,
}: {
  cases: readonly C[];
  keepMounted?: boolean;
  children: (current: C) => React.ReactNode;
}) {
  const [currentName, setCurrentName] = useState(cases[0].name);
  const current = cases.find(({ name }) => name === currentName) ?? cases[0];
  return (
    <Stack gap="lg">
      <Tabs value={current.name} variant="button-sm" onValueChange={setCurrentName}>
        <TabsList className="flex-wrap">
          {cases.map(({ name }) => (
            <TabsTrigger
              key={name}
              // Selected in the primary button's colours, so the current state stands out.
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:hover:bg-primary/90"
              value={name}
            >
              {name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <React.Fragment key={keepMounted ? undefined : current.name}>
        {children(current)}
      </React.Fragment>
    </Stack>
  );
}

// The member page with its labels changed; Save opens the real Save dialog when a label added
// starts an automation, and otherwise stands in for saving. Removals say nothing (Peter,
// 2026-11-17).
const MemberSaveFlow: React.FC<{ labels: string[]; layout?: 'arrows' | 'table' }> = ({
  labels,
  layout,
}) => {
  const [dialogChanges, setDialogChanges] = useState<ReturnType<typeof memberChanges> | null>(null);
  return (
    <>
      <MemberPageExcerpt
        labels={labels}
        showBanner={false}
        onSave={(changes) =>
          changes.starts.length > 0 ? setDialogChanges(changes) : notRun("Emily wasn't saved")
        }
      />
      <LeadMagnetSaveDialog
        changes={dialogChanges ?? { starts: [], ends: [] }}
        labelNames={Object.fromEntries(FAKE_LABELS.map(({ slug, name }) => [slug, name]))}
        layout={layout}
        open={dialogChanges !== null}
        onConfirm={() => {
          setDialogChanges(null);
          notRun("Emily wasn't saved");
        }}
        onOpenChange={(open) => !open && setDialogChanges(null)}
      />
    </>
  );
};

const MemberSaveDialogState: React.FC = () => (
  <State location="Member profile" title="Member update">
    <CaseSwitcher cases={MEMBER_DIALOG_CASES}>
      {({ labels, layout }) => (
        // 40px, twice Shade's lg, so the hint reads apart from the page.
        <Stack className="gap-10" gap="none">
          <MemberSaveFlow labels={labels} layout={layout} />
          <Text className="italic" size="sm" tone="secondary">
            Click Save to see the confirmation.
          </Text>
        </Stack>
      )}
    </CaseSwitcher>
  </State>
);

// The member page's other concepts, archived for the demo (2026-11-17).
const MemberUpdateAlternatives: React.FC = () => (
  <State location="Member profile" title="Member update: banner and hint">
    <Column name="Banner" stacked>
      <CaseSwitcher cases={MEMBER_CASES} keepMounted>
        {({ labels }) => <MemberPageExcerpt labels={labels} />}
      </CaseSwitcher>
    </Column>
    <Separator />
    <Column name="Hint" stacked>
      <CaseSwitcher cases={MEMBER_CASES}>
        {({ labels }) => <MemberNoteDemo labels={labels} />}
      </CaseSwitcher>
    </Column>
  </State>
);

// --- 5. Bulk remove a label ---

const BULK_MEMBER_COUNT = 1240;

// The members list's "Remove label" bulk action (`RemoveLabelModal`), laid out in place, on
// made-up labels, with the proposed note. Nothing is removed.
const BulkRemoveCard: React.FC<{ inProgressCount: number }> = ({ inProgressCount }) => {
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([ACTIVE_LABEL]);
  const optionSource = React.useMemo(() => staticOptionSource(FAKE_LABELS), []);
  const leaving = selectedSlugs.includes(ACTIVE_LABEL) && inProgressCount > 0;
  return (
    <DialogCard
      actionLabel={
        selectedSlugs.length > 1
          ? `Remove ${formatNumber(selectedSlugs.length)} labels`
          : 'Remove label'
      }
      body={
        <Stack gap="sm">
          <LabelPicker
            labels={FAKE_LABELS}
            optionSource={optionSource}
            selectedSlugs={selectedSlugs}
            onToggle={(slug) => setSelectedSlugs((current) => toggleSlug(current, slug))}
          />
          {leaving && (
            <LeadMagnetHintLine>
              {formatNumber(inProgressCount)} of these{' '}
              {inProgressCount === 1 ? 'member is' : 'members are'} in the{' '}
              <LeadMagnetHintName>{ACTIVE_AUTOMATION}</LeadMagnetHintName> automation and will be
              removed from it
            </LeadMagnetHintLine>
          )}
        </Stack>
      }
      title={`Remove label from ${formatNumber(BULK_MEMBER_COUNT)} members`}
    />
  );
};

const BulkRemoveState: React.FC = () => (
  <State location="Members index, bulk actions" title="Bulk remove label">
    <Column
      description="Removing a label from members who are in its automation ends it for them. The note says how many."
      name="Active members"
    >
      <BulkRemoveCard inProgressCount={12} />
    </Column>
    <Column
      description="Nobody selected is in the automation, so the dialog is as it is today."
      name="None in progress"
    >
      <BulkRemoveCard inProgressCount={0} />
    </Column>
  </State>
);

// --- Alternatives: limit the trigger to signup ---
// If bulk label adds can't be made fast enough, each of these only starts on signup.

// The label trigger's field (`LabelAddedPicker` in trigger-card.tsx), on this site's real labels.
const SingleLabelField: React.FC<{ inputId: string; describedBy?: string }> = ({
  inputId,
  describedBy,
}) => {
  const [value, setValue] = useState<LabelSelection>(null);
  const selectedSlugs = React.useMemo(() => (value === null ? [] : [value]), [value]);
  const picker = useLabelPicker({
    selectedSlugs,
    onSelectionChange: (slugs) => setValue(slugs.at(-1) ?? null),
  });
  const { isInitialLoad, hasMore, isLoadingMore, loadMore, onSearchChange } = picker.optionSource;
  const options = React.useMemo(
    () =>
      picker.labels
        .map((label) => ({ id: label.slug, name: label.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [picker.labels],
  );
  return (
    <TierScopePicker<never>
      createRow={{
        offer: (term) => !picker.isCreating && canCreateLabel(picker.labels, term),
        label: (term) => `Create "${term}"`,
        onCreate: (term) => {
          picker
            .createLabel(term)
            .then((label) => label && setValue(label.slug))
            .catch(() => {
              // Already reported via toast.
            });
        },
      }}
      describedBy={describedBy}
      emptyMessage="No labels found"
      inputId={inputId}
      inputLabel="Label"
      notice={isInitialLoad ? <Text size="md">Loading labels...</Text> : undefined}
      options={options}
      optionsHeading="Labels"
      placeholder="Search or create a label..."
      value={selectedSlugs}
      single
      onChange={(next) => setValue(typeof next === 'string' ? null : (next[0] ?? null))}
      onEndReached={() => {
        if (hasMore && !isLoadingMore) {
          loadMore();
        }
      }}
      onSearchChange={onSearchChange}
    />
  );
};

// A1: its own trigger, next to "Free member signed up" and "Paid subscription started".
const SignedUpWithLabelCard: React.FC = () => {
  const id = useId();
  return (
    <TriggerShell Icon={LucideIcon.UserPlus} title="Member signed up with label">
      <Stack gap="sm">
        <Label className="leading-normal font-normal" htmlFor={`${id}-label`}>
          Triggered when someone signs up with this label:
        </Label>
        <SingleLabelField inputId={`${id}-label`} />
      </Stack>
    </TriggerShell>
  );
};

// A3: the label trigger as it is, with its beta limit as a hint or behind Learn more.
// `separateHint` moves the hint out of the field, as its own element.
const LabelAddedBetaCard: React.FC<{ hint?: React.ReactNode; separateHint?: boolean }> = ({
  hint,
  separateHint = false,
}) => {
  const id = useId();
  return (
    <TriggerShell Icon={LucideIcon.Tag} title="Label added">
      <Stack gap="sm">
        <Label className="leading-normal font-normal" htmlFor={`${id}-label`}>
          Triggered when this label is added to a member:
        </Label>
        <SingleLabelField describedBy={hint ? `${id}-hint` : undefined} inputId={`${id}-label`} />
        {hint && !separateHint && (
          <Text as="p" id={`${id}-hint`} size="sm" tone="secondary">
            {hint}
          </Text>
        )}
      </Stack>
      {hint && separateHint && (
        <Text as="p" id={`${id}-hint`} size="sm" tone="secondary">
          {hint}
        </Text>
      )}
    </TriggerShell>
  );
};

const BETA_LIMIT =
  'During beta, this trigger does not include labels added in bulk or during import';

// "Learn more": what starts this trigger during beta, and what doesn't. Says what happens now,
// with no promise about later.
const BetaLimitDialog: React.FC<{ open: boolean; onOpenChange: (open: boolean) => void }> = ({
  open,
  onOpenChange,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="gap-5">
      <DialogHeader>
        <DialogTitle>Label added trigger during beta</DialogTitle>
        <DialogDescription>
          While automations are in beta, this trigger starts for labels added to one member at a
          time.
        </DialogDescription>
      </DialogHeader>
      <Stack gap="lg">
        <Stack gap="xs">
          <Text size="md" weight="semibold">
            The automation starts when:
          </Text>
          <ul className="list-disc ps-5 text-sm text-muted-foreground">
            <li>a member signs up through a form that adds the label</li>
            <li>you add the label on a member&apos;s page</li>
            <li>Zapier or the Admin API adds the label</li>
          </ul>
        </Stack>
        <Stack gap="xs">
          <Text size="md" weight="semibold">
            The automation doesn&apos;t start when:
          </Text>
          <ul className="list-disc ps-5 text-sm text-muted-foreground">
            <li>you add the label to many members from the members list</li>
            <li>you import members with the label</li>
          </ul>
        </Stack>
      </Stack>
      <DialogFooter>
        <Button onClick={() => onOpenChange(false)}>Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const LearnMoreHint: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button className="h-auto p-0 text-sm" variant="link" onClick={() => setOpen(true)}>
        Trigger limits
      </Button>{' '}
      apply in beta
      <BetaLimitDialog open={open} onOpenChange={setOpen} />
    </>
  );
};

const SignupAlternatives: React.FC = () => (
  <State location="Automation editor" title="Trigger concepts">
    <Column name="A new signup trigger">
      <SignedUpWithLabelCard />
    </Column>
    <Column name="Beta limit hint">
      <LabelAddedBetaCard hint={BETA_LIMIT} />
    </Column>
    <Column name="Beta limit dialog">
      <LabelAddedBetaCard hint={<LearnMoreHint />} separateHint />
    </Column>
  </State>
);

// --- Alternatives: keep the label trigger, limit bulk adds ---

const IMPORT_MEMBER_COUNT = 3105;

// The proposed note under a label field, as on the member page (state 4).
const AutomationNote: React.FC<React.PropsWithChildren> = ({ children }) => (
  <Text as="p" size="sm" tone="secondary">
    {children}
  </Text>
);

const toggleSlug = (current: string[], slug: string) =>
  current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug];

// The label trigger card, with its field label and hint for each option.
const LabelAddedWithHintCard: React.FC<{ fieldLabel?: string; hint?: string }> = ({
  fieldLabel = 'Triggered when this label is added to a member:',
  hint,
}) => {
  const id = useId();
  return (
    <TriggerShell Icon={LucideIcon.Tag} title="Label added">
      <Stack gap="sm">
        <Label className="leading-normal font-normal" htmlFor={`${id}-label`}>
          {fieldLabel}
        </Label>
        <SingleLabelField describedBy={hint ? `${id}-hint` : undefined} inputId={`${id}-label`} />
        {hint && (
          <Text as="p" id={`${id}-hint`} size="sm" tone="secondary">
            {hint}
          </Text>
        )}
      </Stack>
    </TriggerShell>
  );
};

// The members list's "Add label" bulk action (`AddLabelModal`), on made-up labels: the same
// Dialog, title, label picker and buttons, plus a note while "Lead magnet" is picked.
const BulkAddLabelDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: React.ReactNode;
}> = ({ open, onOpenChange, note }) => {
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([ACTIVE_LABEL]);
  const optionSource = React.useMemo(() => staticOptionSource(FAKE_LABELS), []);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Add label to {formatNumber(BULK_MEMBER_COUNT)} members</DialogTitle>
        </DialogHeader>
        <Stack gap="sm">
          <LabelPicker
            labels={FAKE_LABELS}
            optionSource={optionSource}
            selectedSlugs={selectedSlugs}
            onToggle={(slug) => setSelectedSlugs((current) => toggleSlug(current, slug))}
          />
          {selectedSlugs.includes(ACTIVE_LABEL) && <AutomationNote>{note}</AutomationNote>}
        </Stack>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={selectedSlugs.length === 0} onClick={() => onOpenChange(false)}>
            {selectedSlugs.length > 1
              ? `Add ${formatNumber(selectedSlugs.length)} labels`
              : 'Add label'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// The import's "Label these members" field (mapping-step.tsx), on made-up labels.
const ImportLabelCard: React.FC<{ note: React.ReactNode }> = ({ note }) => {
  const id = useId();
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([ACTIVE_LABEL]);
  const optionSource = React.useMemo(() => staticOptionSource(FAKE_LABELS), []);
  return (
    <AutomationCard className="w-[400px]" gap="sm" role={undefined}>
      <Label id={`${id}-label`}>Label these members</Label>
      <LabelPicker
        labels={FAKE_LABELS}
        optionSource={optionSource}
        selectedSlugs={selectedSlugs}
        onToggle={(slug) => setSelectedSlugs((current) => toggleSlug(current, slug))}
      />
      {selectedSlugs.includes(ACTIVE_LABEL) && <AutomationNote>{note}</AutomationNote>}
    </AutomationCard>
  );
};

// --- Bulk add a label ---

// The real note (lead-magnets-bulk-note.tsx), for the made-up Lead magnet automation.
const BulkStartNote: React.FC<{ count: number; source: 'bulk' | 'import' }> = ({
  count,
  source,
}) => (
  <LeadMagnetBulkNoteText
    matches={[{ labelName: 'Lead magnet', automationName: ACTIVE_AUTOMATION }]}
    memberCount={count}
    source={source}
  />
);

type BulkCase = { name: string; count: number; slugs: string[]; layout?: 'arrows' | 'table' };

// No change picks a label without an automation.
const bulkCases = (under: number, over: number): BulkCase[] => [
  { name: 'No change', count: under, slugs: ['vip'] },
  { name: 'Under 100k', count: under, slugs: [ACTIVE_LABEL] },
  { name: 'Over 100k', count: over, slugs: [ACTIVE_LABEL] },
];
const BULK_ADD_CASES = bulkCases(48, 124_800);
const IMPORT_CASES = bulkCases(50, 120_000);

// The label picker and the note under it, for bulk add and import.
const BulkLabelField: React.FC<{
  count: number;
  slugs: string[];
  source: 'bulk' | 'import';
  // Set by the banner concept, which shows its own message instead of the note.
  hideNote?: boolean;
  onSelectionChange?: (slugs: string[]) => void;
}> = ({ count, slugs, source, hideNote = false, onSelectionChange }) => {
  const [selectedSlugs, setSelectedSlugs] = useState(slugs);
  // Another state swaps in its labels without remounting, so the banner can animate.
  const [shownSlugs, setShownSlugs] = useState(slugs);
  if (slugs !== shownSlugs) {
    setShownSlugs(slugs);
    setSelectedSlugs(slugs);
  }
  const optionSource = React.useMemo(() => staticOptionSource(FAKE_LABELS), []);
  return (
    <Stack gap="sm">
      <LabelPicker
        labels={FAKE_LABELS}
        optionSource={optionSource}
        selectedSlugs={selectedSlugs}
        onToggle={(slug) => {
          const next = toggleSlug(selectedSlugs, slug);
          setSelectedSlugs(next);
          onSelectionChange?.(next);
        }}
      />
      {!hideNote && selectedSlugs.includes(ACTIVE_LABEL) && (
        <BulkStartNote count={count} source={source} />
      )}
    </Stack>
  );
};

// The members list's "Add label" dialog (add-label-modal.tsx), laid out in place.
const BulkAddDemo: React.FC<{ current: BulkCase }> = ({ current: { count, slugs } }) => (
  <DialogCard
    actionLabel="Add label"
    body={<BulkLabelField count={count} slugs={slugs} source="bulk" />}
    title={`Add label to ${formatNumber(count)} ${count === 1 ? 'member' : 'members'}`}
  />
);

// The banner concepts' made-up automations: three labels start one each, so picking two or more
// shows how the banner grows. VIP starts nothing.
const BULK_BANNER_AUTOMATIONS: Record<string, string> = {
  [ACTIVE_LABEL]: ACTIVE_AUTOMATION,
  'free-trial': 'Trial nurture',
  'spring-ebook': 'Spring ebook series',
};
// The picked labels that start an automation, with it.
const bulkBannerMatches = (selectedSlugs: string[]) =>
  selectedSlugs.flatMap((slug) =>
    BULK_BANNER_AUTOMATIONS[slug]
      ? [{ slug, label: labelName(slug), automation: BULK_BANNER_AUTOMATIONS[slug] }]
      : [],
  );

// Concept B: the member page's banner slides in at the top of the dialog in place of the hint,
// naming each label and the automation it starts, and from 100k members that it can take longer.
const BulkAddBannerDemo: React.FC<{ current: BulkCase }> = ({ current: { count, slugs } }) => {
  const [selectedSlugs, setSelectedSlugs] = useState(slugs);
  const [shownSlugs, setShownSlugs] = useState(slugs);
  if (slugs !== shownSlugs) {
    setShownSlugs(slugs);
    setSelectedSlugs(slugs);
  }
  const large = count >= BULK_NOTE_THRESHOLD;
  const matches = bulkBannerMatches(selectedSlugs);
  return (
    <DialogCard
      actionLabel="Add label"
      body={
        // gap-5, which the banner's animation expects.
        <Stack gap="lg">
          <LeadMagnetReveal from="top" open={matches.length > 0}>
            <LeadMagnetBannerFrame>
              <LeadMagnetBulkBannerText large={large} matches={matches} source="bulk" />
            </LeadMagnetBannerFrame>
          </LeadMagnetReveal>
          <BulkLabelField
            count={count}
            slugs={slugs}
            source="bulk"
            hideNote
            onSelectionChange={setSelectedSlugs}
          />
        </Stack>
      }
      title={`Add label to ${formatNumber(count)} ${count === 1 ? 'member' : 'members'}`}
    />
  );
};

// --- Dialog concept for bulk add and import (Peter, 2026-11-17) ---
// Nothing shows while picking labels. On Add label or Import, if a picked label starts an active
// automation, the dialog changes in place to a confirmation step, as the member page's Save does.
// Back returns to the picker with the labels kept; the button repeats the action. No member
// counts, since not everyone labelled starts. Every label gets a row, however many. From 100k
// members (a placeholder), a line on speed. With nothing to start, the action runs as today.

// Each opens on today's Add label dialog with its labels picked; Add label shows the
// confirmation. With no automation label picked there's no confirmation, so that's not a case.
const BULK_CONFIRM_CASES: BulkCase[] = [
  { name: 'Single label', count: 48, slugs: [ACTIVE_LABEL] },
  { name: 'Multiple labels', count: 48, slugs: [ACTIVE_LABEL, 'free-trial', 'spring-ebook'] },
  { name: '100k+ members', count: 124_800, slugs: [ACTIVE_LABEL] },
  // The rows as a table instead of arrows, to compare (Peter, 2026-11-17).
  {
    name: 'Table',
    count: 48,
    slugs: [ACTIVE_LABEL, 'free-trial', 'spring-ebook'],
    layout: 'table',
  },
];

// Today's dialog, which changes in place to the confirmation on Add label when a picked label
// starts an automation, and back on Back, keeping the labels. Add label on the confirmation
// stands in for adding them, and starts over.
const BulkAddFlow: React.FC<{ current: BulkCase }> = ({ current: { count, slugs, layout } }) => {
  const [selectedSlugs, setSelectedSlugs] = useState(slugs);
  const [confirming, setConfirming] = useState(false);
  const matches = bulkBannerMatches(selectedSlugs);
  const title = `Add label to ${formatNumber(count)} ${count === 1 ? 'member' : 'members'}`;
  const finish = () => {
    notRun("the labels weren't added");
    setConfirming(false);
  };
  if (confirming) {
    return (
      <DialogCard
        actionLabel="Add label"
        cancelLabel="Back"
        title={`${title}?`}
        onAction={finish}
        onCancel={() => setConfirming(false)}
      >
        <LeadMagnetBulkConfirmText
          large={count >= BULK_NOTE_THRESHOLD}
          layout={layout}
          matches={matches}
          source="bulk"
        />
      </DialogCard>
    );
  }
  return (
    <DialogCard
      actionLabel="Add label"
      body={
        <BulkLabelField
          count={count}
          slugs={selectedSlugs}
          source="bulk"
          hideNote
          onSelectionChange={setSelectedSlugs}
        />
      }
      title={title}
      onAction={() => (matches.length > 0 ? setConfirming(true) : finish())}
    />
  );
};

// As on Member update: the UI by default, and a hint under it to click through.
const BulkAddState: React.FC = () => (
  <State location="Members index, bulk actions" title="Bulk add label">
    <CaseSwitcher cases={BULK_CONFIRM_CASES}>
      {(current) => (
        // 40px, twice Shade's lg, so the hint reads apart from the dialog.
        <Stack className="gap-10" gap="none">
          <BulkAddFlow current={current} />
          <Text className="italic" size="sm" tone="secondary">
            Click Add label to see the confirmation.
          </Text>
        </Stack>
      )}
    </CaseSwitcher>
  </State>
);

// Bulk add's other concepts, archived for the demo (2026-11-17).
const BulkAddAlternatives: React.FC = () => (
  <State location="Members index, bulk actions" title="Bulk add label: hint and banner">
    <Column name="Hint" stacked>
      <CaseSwitcher cases={BULK_ADD_CASES}>
        {(current) => <BulkAddDemo current={current} />}
      </CaseSwitcher>
    </Column>
    <Separator />
    <Column name="Banner from the top" stacked>
      <CaseSwitcher cases={BULK_ADD_CASES} keepMounted>
        {(current) => <BulkAddBannerDemo current={current} />}
      </CaseSwitcher>
    </Column>
  </State>
);

// The import's real mapping step (from the members domain) on made-up rows, in a dialog frame,
// with the label field from this page. Nothing is imported.
const ImportDemo: React.FC<{ current: BulkCase }> = ({ current: { count, slugs } }) => (
  <Box className="rounded-lg bg-surface-elevated-2 p-6 shadow-lg">
    <h3 className="text-xl font-semibold in-data-[admin7-design=true]:font-title">
      Import members
    </h3>
    <Box className="mt-5">
      <ImportMappingPreview
        labelField={<BulkLabelField count={count} slugs={slugs} source="import" />}
        rowCount={count}
      />
    </Box>
  </Box>
);

// Concept B: as on bulk add, the banner slides in at the top of the dialog in place of the hint,
// saying the automation starts, and from 100k members that large imports can take longer.
const ImportBannerDemo: React.FC<{ current: BulkCase }> = ({ current: { count, slugs } }) => {
  const [selectedSlugs, setSelectedSlugs] = useState(slugs);
  // Another state swaps in its labels without remounting, so the banner animates.
  const [shownSlugs, setShownSlugs] = useState(slugs);
  if (slugs !== shownSlugs) {
    setShownSlugs(slugs);
    setSelectedSlugs(slugs);
  }
  const matches = bulkBannerMatches(selectedSlugs);
  return (
    <Box className="rounded-lg bg-surface-elevated-2 p-6 shadow-lg">
      <h3 className="text-xl font-semibold in-data-[admin7-design=true]:font-title">
        Import members
      </h3>
      {/* gap-5, which the banner's animation expects. */}
      <Stack className="mt-5" gap="lg">
        <LeadMagnetReveal from="top" open={matches.length > 0}>
          <LeadMagnetBannerFrame>
            <LeadMagnetBulkBannerText
              large={count >= BULK_NOTE_THRESHOLD}
              matches={matches}
              source="import"
            />
          </LeadMagnetBannerFrame>
        </LeadMagnetReveal>
        <ImportMappingPreview
          labelField={
            <BulkLabelField
              count={count}
              slugs={slugs}
              source="import"
              hideNote
              onSelectionChange={setSelectedSlugs}
            />
          }
          rowCount={count}
        />
      </Stack>
    </Box>
  );
};

// Concept C: the file has its own labels column (Evan, 2026-11-12), so labels differ by row.
// Mapped to Labels, the hint names each file label that starts an automation, "in your file", so
// it reads apart from the field, which labels every row. Labels picked in the field join the same
// note. Unmap the column and the file's lines go. A file label that doesn't exist yet is created
// by the import, so no automation uses it and it gets no line.
type FileLabelsCase = { name: string; labelsByRow: string[] };
const FILE_LABELS_CASES: FileLabelsCase[] = [
  { name: 'No change', labelsByRow: ['VIP'] },
  { name: '1 label', labelsByRow: ['Lead magnet,VIP', 'VIP'] },
  { name: '2 labels', labelsByRow: ['Lead magnet', 'Free trial,VIP'] },
  { name: '3 or more', labelsByRow: ['Lead magnet', 'Free trial', 'Spring ebook,VIP'] },
];
const FILE_IMPORT_COUNT = 50;

const slugForName = (name: string) =>
  FAKE_LABELS.find((label) => label.name.toLowerCase() === name.toLowerCase())?.slug;

const FileLabelsNote: React.FC<{ fieldSlugs: string[]; fileLabels: string[] }> = ({
  fieldSlugs,
  fileLabels,
}) => {
  const fieldMatches = bulkBannerMatches(fieldSlugs).map((match) => ({ ...match, inFile: false }));
  const fileSlugs = fileLabels.flatMap((name) => {
    const slug = slugForName(name);
    return slug && !fieldSlugs.includes(slug) ? [slug] : [];
  });
  const fileMatches = bulkBannerMatches(fileSlugs).map((match) => ({ ...match, inFile: true }));
  const matches = [...fieldMatches, ...fileMatches];
  if (matches.length === 0) {
    return null;
  }
  // No final period, as for other hints.
  if (matches.length >= 3) {
    const count = formatNumber(matches.length);
    return (
      <LeadMagnetHintLine>
        The {count} labels {fieldMatches.length === 0 && 'in your file '}start {count} automations
      </LeadMagnetHintLine>
    );
  }
  return (
    <LeadMagnetHintLine>
      {matches.map(({ slug, label, automation, inFile }, index) => (
        <React.Fragment key={slug}>
          {index > 0 && '. '}
          <LeadMagnetHintName>{label}</LeadMagnetHintName>
          {inFile && ' in your file'} starts the{' '}
          <LeadMagnetHintName>{automation}</LeadMagnetHintName> automation
        </React.Fragment>
      ))}
    </LeadMagnetHintLine>
  );
};

const FileLabelsField: React.FC<{ fileLabels: string[] }> = ({ fileLabels }) => {
  const [fieldSlugs, setFieldSlugs] = useState<string[]>([]);
  return (
    <Stack gap="sm">
      <BulkLabelField
        count={FILE_IMPORT_COUNT}
        slugs={[]}
        source="import"
        hideNote
        onSelectionChange={setFieldSlugs}
      />
      <FileLabelsNote fieldSlugs={fieldSlugs} fileLabels={fileLabels} />
    </Stack>
  );
};

const ImportFileLabelsDemo: React.FC<{ current: FileLabelsCase }> = ({
  current: { labelsByRow },
}) => (
  <Box className="rounded-lg bg-surface-elevated-2 p-6 shadow-lg">
    <h3 className="text-xl font-semibold in-data-[admin7-design=true]:font-title">
      Import members
    </h3>
    <Box className="mt-5">
      <ImportMappingPreview
        labelField={(fileLabels) => <FileLabelsField fileLabels={fileLabels} />}
        labelsByRow={labelsByRow}
        rowCount={FILE_IMPORT_COUNT}
      />
    </Box>
  </Box>
);

type ImportConfirmCase = BulkCase & { labelsByRow?: string[] };
// Each opens on the mapping step with its labels; Import shows the confirmation. With no
// automation label there's no confirmation, so that's not a case.
const IMPORT_CONFIRM_CASES: ImportConfirmCase[] = [
  { name: 'Single label', count: 50, slugs: [ACTIVE_LABEL] },
  { name: 'Multiple labels', count: 50, slugs: [ACTIVE_LABEL, 'free-trial'] },
  {
    name: 'Labels in the file',
    count: 50,
    slugs: [],
    labelsByRow: ['Lead magnet', 'Free trial,VIP'],
  },
  { name: '100k+ members', count: 120_000, slugs: [ACTIVE_LABEL] },
  // The rows as a table instead of arrows, to compare (Peter, 2026-11-17).
  { name: 'Table', count: 50, slugs: [ACTIVE_LABEL, 'free-trial'], layout: 'table' },
];

// The label names in a file's labels column, each once.
const namesInFile = (labelsByRow: string[] = []) => [
  ...new Set(labelsByRow.flatMap((cell) => cell.split(',').map((name) => name.trim()))),
];

// Labels picked in the field, then any others the file's labels column brings.
const importMatches = (fieldSlugs: string[], fileLabels: string[]) => {
  const fileSlugs = fileLabels.flatMap((name) => {
    const slug = slugForName(name);
    return slug && !fieldSlugs.includes(slug) ? [slug] : [];
  });
  return bulkBannerMatches([...fieldSlugs, ...fileSlugs]);
};

// The mapping step stays mounted behind the confirmation step, so Back keeps the mapping too.
const ImportConfirmDemo: React.FC<{ current: ImportConfirmCase }> = ({
  current: { count, slugs, labelsByRow, layout },
}) => {
  const [fieldSlugs, setFieldSlugs] = useState(slugs);
  const [fileLabels, setFileLabels] = useState(() => namesInFile(labelsByRow));
  const [confirming, setConfirming] = useState(false);
  const matches = importMatches(fieldSlugs, fileLabels);
  const finish = () => {
    notRun("the members weren't imported");
    setConfirming(false);
  };
  // Both steps share one grid cell, centred, so the confirmation sits at the middle of where the
  // mapping step was, as a modal would. The mapping step stays mounted and keeps its room while
  // hidden (invisible), so Back keeps the mapping and nothing below jumps.
  return (
    <div className="grid place-items-center">
      <Box
        className={cn(
          'w-full rounded-lg bg-surface-elevated-2 p-6 shadow-lg [grid-area:1/1]',
          confirming && 'invisible',
        )}
      >
        <h3 className="text-xl font-semibold in-data-[admin7-design=true]:font-title">
          Import members
        </h3>
        <Box className="mt-5">
          <ImportMappingPreview
            labelField={
              <BulkLabelField
                count={count}
                slugs={fieldSlugs}
                source="import"
                hideNote
                onSelectionChange={setFieldSlugs}
              />
            }
            labelsByRow={labelsByRow}
            rowCount={count}
            onImport={(names) => {
              setFileLabels(names);
              if (importMatches(fieldSlugs, names).length > 0) {
                setConfirming(true);
              } else {
                finish();
              }
            }}
          />
        </Box>
      </Box>
      {confirming && (
        // A standard dialog's 512px.
        <Box className="w-[512px] rounded-lg bg-surface-elevated-2 p-6 shadow-lg [grid-area:1/1]">
          <h3 className="text-xl font-semibold in-data-[admin7-design=true]:font-title">
            {`Import ${formatNumber(count)} members?`}
          </h3>
          <Stack className="mt-5 text-base" gap="2xl">
            <LeadMagnetBulkConfirmText
              large={count >= BULK_NOTE_THRESHOLD}
              layout={layout}
              matches={matches}
              source="import"
            />
            <AlertDialogFooter>
              <Button variant="outline" onClick={() => setConfirming(false)}>
                Back
              </Button>
              <Button onClick={finish}>Import</Button>
            </AlertDialogFooter>
          </Stack>
        </Box>
      )}
    </div>
  );
};

// As on Member update: the UI by default, and a hint under it to click through.
const ImportState: React.FC = () => (
  <State location="Members import" title="Import members">
    <CaseSwitcher cases={IMPORT_CONFIRM_CASES}>
      {(current) => (
        // 40px, twice Shade's lg, so the hint reads apart from the dialog.
        <Stack className="gap-10" gap="none">
          <ImportConfirmDemo current={current} />
          <Text className="italic" size="sm" tone="secondary">
            Click Import to see the confirmation.
          </Text>
        </Stack>
      )}
    </CaseSwitcher>
  </State>
);

// Import's other concepts, archived for the demo (2026-11-17).
const ImportAlternatives: React.FC = () => (
  <State location="Members import" title="Import members: hint and banner">
    <Column name="Hint" stacked>
      <CaseSwitcher cases={IMPORT_CASES}>
        {(current) => <ImportDemo current={current} />}
      </CaseSwitcher>
    </Column>
    <Separator />
    <Column name="Banner from the top" stacked>
      <CaseSwitcher cases={IMPORT_CASES} keepMounted>
        {(current) => <ImportBannerDemo current={current} />}
      </CaseSwitcher>
    </Column>
    <Separator />
    <Column name="Hint, labels column in the file" stacked>
      <CaseSwitcher cases={FILE_LABELS_CASES}>
        {(current) => <ImportFileLabelsDemo current={current} />}
      </CaseSwitcher>
    </Column>
  </State>
);

// --- Alert banner: the basic pattern, details left to the team ---

const BANNER_EXAMPLES: { name: string; text: React.ReactNode }[] = [
  {
    name: 'Label added',
    text: (
      <>
        <span className="font-semibold">VIP</span> will start the{' '}
        <span className="font-semibold">Welcome VIPs</span> automation when you save
      </>
    ),
  },
  {
    name: 'Label removed',
    text: (
      <>
        Removing <span className="font-semibold">VIP</span> will stop the{' '}
        <span className="font-semibold">VIP onboarding</span> automation when you save
      </>
    ),
  },
  {
    name: '3 or more changes',
    text: 'The 3 labels you added will start 3 automations when you save',
  },
];

const AlertBannerState: React.FC = () => (
  <State
    location="Member profile, Members index bulk actions, and Members import"
    title="Alert banner"
  >
    <Column
      description="Each line names the label that causes it. From 3 changes, one count line."
      name="Pattern"
      stacked
    >
      <Stack className="max-w-xl gap-6" gap="none">
        {BANNER_EXAMPLES.map(({ name, text }) => (
          <Stack key={name} gap="xs">
            <Text className="font-mono text-[10px]" size="sm" tone="secondary">
              {name}
            </Text>
            <LeadMagnetBannerFrame>{text}</LeadMagnetBannerFrame>
          </Stack>
        ))}
      </Stack>
    </Column>
  </State>
);

const BulkDoesntTrigger: React.FC = () => (
  <State
    location="Automation editor, Members index and Members import"
    title="B1. Bulk add and import don't start automations"
  >
    <Column name="Trigger card">
      <LabelAddedWithHintCard fieldLabel="Triggered when this label is added to a member during signup:" />
    </Column>
    <Column name="Bulk add (Lead magnet picked)">
      <DialogPreview buttonLabel="Open dialog">
        {(open, setOpen) => (
          <BulkAddLabelDialog
            note={
              <>
                During beta, adding <strong>Lead magnet</strong> in bulk won&apos;t start{' '}
                <strong>{ACTIVE_AUTOMATION}</strong>
              </>
            }
            open={open}
            onOpenChange={setOpen}
          />
        )}
      </DialogPreview>
    </Column>
    <Column name="Import (Lead magnet picked)">
      <ImportLabelCard
        note={
          <>
            During beta, adding <strong>Lead magnet</strong> by import won&apos;t start{' '}
            <strong>{ACTIVE_AUTOMATION}</strong>
          </>
        }
      />
    </Column>
  </State>
);

const BulkTriggersSlowly: React.FC = () => (
  <State
    location="Automation editor, Members index and Members import"
    title="B2. Bulk add and import start automations, more slowly"
  >
    <Column name="Trigger card">
      <LabelAddedWithHintCard hint="During beta, members labeled in bulk or by import can take longer to start" />
    </Column>
    <Column name="Bulk add (Lead magnet picked)">
      <DialogPreview buttonLabel="Open dialog">
        {(open, setOpen) => (
          <BulkAddLabelDialog
            note={
              <>
                <strong>{formatNumber(BULK_MEMBER_COUNT)}</strong> members will start{' '}
                <strong>{ACTIVE_AUTOMATION}</strong>. During beta, large batches can take a while to
                start
              </>
            }
            open={open}
            onOpenChange={setOpen}
          />
        )}
      </DialogPreview>
    </Column>
    <Column name="Import (Lead magnet picked)">
      <ImportLabelCard
        note={
          <>
            <strong>{formatNumber(IMPORT_MEMBER_COUNT)}</strong> imported members will start{' '}
            <strong>{ACTIVE_AUTOMATION}</strong>. During beta, large imports can take a while to
            start
          </>
        }
      />
    </Column>
  </State>
);

// --- Archived ---

// Directions taken off the table, kept for reference on one page.
// - Trigger concepts: Peter (2026-11-10) wants a true "Label added" trigger, with speed set out in
//   a help doc rather than limits on the card.
// - Member page hint: design review (2026-11-10) chose a dialog on Save.
// - B1 and B2: bulk isn't blocked or flagged on the trigger; the bulk add dialog says it instead.
// - Banner and hint concepts for the member page, bulk add and import: the dialog is the
//   direction (Peter, 2026-11-17); the others are kept here and in the prototype menu.
// - Bulk remove, Turn off and Alert banner: pulled from scope with Peter (2026-11-17). Turn off
//   applies to every trigger, so it belongs with polish.
const ArchivedStates: React.FC = () => (
  <Stack gap="2xl">
    {/* The stack's 32px gap plus my-8: 64px above and below each separator. */}
    <MemberUpdateAlternatives />
    <Separator className="my-8" />
    <BulkAddAlternatives />
    <Separator className="my-8" />
    <ImportAlternatives />
    <Separator className="my-8" />
    <BulkRemoveState />
    <Separator className="my-8" />
    <TurnOffState />
    <Separator className="my-8" />
    <AlertBannerState />
    <Separator className="my-8" />
    <SignupAlternatives />
    <Separator className="my-8" />
    <MemberPageState />
    <Separator className="my-8" />
    <BulkDoesntTrigger />
    <Separator className="my-8" />
    <BulkTriggersSlowly />
  </Stack>
);

// --- Page ---

// One pattern at a time, picked from the text nav. Each has its own address:
// #/automations/lead-magnet-states/<slug>.
const PATTERNS: { slug: string; name: string; Pattern: React.FC }[] = [
  { slug: 'trigger-states', name: 'Trigger', Pattern: TriggerStatesState },
  { slug: 'start-automation', name: 'Start automation', Pattern: StartAutomationState },
  { slug: 'member-save-dialog', name: 'Member update', Pattern: MemberSaveDialogState },
  { slug: 'bulk-add', name: 'Bulk add label', Pattern: BulkAddState },
  { slug: 'import', name: 'Import members', Pattern: ImportState },
  { slug: 'delete-label', name: 'Delete label', Pattern: DeleteLabelState },
];
const ARCHIVED = { slug: 'archived', name: 'Archived', Pattern: ArchivedStates };

const patternHref = (slug: string) => `#/automations/lead-magnet-states/${slug}`;

const NavLink: React.FC<{ slug: string; name: string; isCurrent: boolean }> = ({
  slug,
  name,
  isCurrent,
}) => (
  <a
    aria-current={isCurrent ? 'page' : undefined}
    className={cn(
      'text-sm',
      isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground',
    )}
    href={patternHref(slug)}
  >
    {name}
  </a>
);

const LeadMagnetStates: React.FC = () => {
  const { pattern: slug } = useParams<{ pattern?: string }>();
  // Opens on Trigger states, and falls back to it for an unknown address.
  const current = [...PATTERNS, ARCHIVED].find((p) => p.slug === slug) ?? PATTERNS[0];
  const { Pattern } = current;
  return (
    // The editor canvas's colour (`--xy-background-color` in automation-canvas.tsx), without its
    // dots. Admin's nav is hidden on this route (routes.tsx), so the page brings its own.
    <Inline align="stretch" className="h-full bg-preview-canvas" gap="none">
      <nav
        aria-label="Lead magnet patterns"
        className="flex w-[220px] shrink-0 flex-col gap-6 overflow-y-auto border-r border-border-default p-6"
      >
        <a
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          href="#/automations"
        >
          <LucideIcon.ArrowLeft className="size-4" /> Automations
        </a>
        <Stack gap="none">
          <Text size="md" weight="semibold">
            Lead magnets
          </Text>
          <Text size="sm" tone="secondary">
            UI states
          </Text>
        </Stack>
        <Stack gap="sm">
          {PATTERNS.map(({ slug: patternSlug, name }) => (
            <NavLink
              key={patternSlug}
              isCurrent={current.slug === patternSlug}
              name={name}
              slug={patternSlug}
            />
          ))}
        </Stack>
        {/* Pinned to the bottom of the nav, out of the way. */}
        <div className="mt-auto">
          <NavLink
            isCurrent={current.slug === ARCHIVED.slug}
            name={ARCHIVED.name}
            slug={ARCHIVED.slug}
          />
        </div>
      </nav>
      {/* Keyed by pattern, so switching starts the new one at the top. */}
      <Box key={current.slug} className="min-w-0 flex-1 overflow-y-auto p-10">
        {/* Centred, up to 896px. */}
        <Box className="mx-auto w-full max-w-4xl pb-15">
          <Pattern />
        </Box>
      </Box>
    </Inline>
  );
};

export default LeadMagnetStates;
