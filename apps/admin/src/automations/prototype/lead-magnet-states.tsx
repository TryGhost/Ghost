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
  Button,
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
} from '@tryghost/shade/components';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn, formatNumber } from '@tryghost/shade/utils';
import { useParams } from '@tryghost/admin-x-framework';
import { useBrowseTiers } from '@tryghost/admin-x-framework/api/tiers';
import {
  AutomationCard,
  AutomationCardHeader,
} from '@/automations/components/canvas/automation-card';
import { TierScopePicker } from '@/automations/components/canvas/tier-scope-picker';
import { TriggerCard, type TriggerData } from '@/automations/components/canvas/trigger-card';
import { buildTriggerRules } from '@/automations/utils/trigger-rules';
import type { LabelSelection } from '@/automations/types';
import { LabelPicker, canCreateLabel, useLabelPicker } from '@/members/api';
import { LeadMagnetSaveDescription } from './lead-magnets-dialog';
import { LeadMagnetDeleteBlockedDescription } from './lead-magnets-delete-dialog';
import { LeadMagnetBulkNoteText } from './lead-magnets-bulk-note';
import { BULK_NOTE_THRESHOLD } from './lead-magnets';

// --- Page structure ---

const Column: React.FC<React.PropsWithChildren<{ name: string }>> = ({ name, children }) => (
  <Stack gap="sm">
    <Text className="font-mono text-[10px]" size="sm" tone="secondary">
      {name}
    </Text>
    {children}
  </Stack>
);

const State: React.FC<
  React.PropsWithChildren<{
    title: string;
    useCase?: React.ReactNode;
    openQuestion?: React.ReactNode;
  }>
> = ({ title, useCase, openQuestion, children }) => (
  <Stack gap="lg">
    <Stack className="max-w-2xl" gap="xs">
      <Text as="h2" size="xl" weight="semibold">
        {title}
      </Text>
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
    <Inline align="start" gap="xl" wrap>
      {children}
    </Inline>
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
  }>
> = ({ title, actionLabel, cancelLabel = 'Cancel', body, children }) => (
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
      <Button variant="outline">{cancelLabel}</Button>
      <Button>{actionLabel}</Button>
    </AlertDialogFooter>
  </Box>
);

// "Turn off automation?" with the number of members it removes, and that nobody can come back.
const ProposedTurnOffCard: React.FC<{ inProgressCount: number }> = ({ inProgressCount }) => (
  <DialogCard actionLabel="Turn off" title="Turn off automation?">
    <Stack gap="lg">
      <p>
        {inProgressCount > 0 ? (
          <>
            The <strong>{formatNumber(inProgressCount)}</strong>{' '}
            {inProgressCount === 1 ? 'member' : 'members'} in progress will be removed, and their
            remaining emails won&apos;t be sent.
          </>
        ) : (
          'Your automation will no longer run.'
        )}
      </p>
      <p>
        Members who have already entered this automation can&apos;t enter it again, even if you turn
        it back on.
      </p>
    </Stack>
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
  return (
    <State title="Trigger states">
      <Column name="Editable">
        <LabelTriggerState initialLabel={null} tierQuery={tierQuery} />
      </Column>
      <Column name="Locked while active">
        <TriggerShell Icon={LucideIcon.Tag} title="Label added to a member">
          <LockedTriggerField
            fieldLabel="Triggered when this label is added to a member:"
            value="Lead magnet"
          />
        </TriggerShell>
      </Column>
      <Column name="Error: no label, after Publish">
        <LabelTriggerState
          errorMessage="Select a label"
          initialLabel={null}
          tierQuery={tierQuery}
        />
      </Column>
      {/* In error from the start, not just after Publish: the label may have been deleted by
          mistake, or by someone else. */}
      <Column name="Error: label deleted">
        <LabelTriggerState
          deletedName="Spring ebook"
          errorMessage="Select a different label"
          initialLabel={DELETED_LABEL_SLUG}
          tierQuery={tierQuery}
        />
      </Column>
    </State>
  );
};

// --- 2. Turn off automation ---

const TurnOffState: React.FC = () => (
  <State title="Turn off automation">
    {/* The copy in automation-status-dialog.tsx today. */}
    <Column name="Current">
      <DialogCard actionLabel="Turn off" title="Turn off automation?">
        <p>
          Your automation will no longer run, and any members currently in progress will be removed.
        </p>
      </DialogCard>
    </Column>
    <Column name="Proposed, 12 in progress">
      <ProposedTurnOffCard inProgressCount={12} />
    </Column>
    <Column name="Proposed, none in progress">
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
    // On the trigger cards' white card, so the field reads against the canvas.
    <AutomationCard className="w-[400px]" role={undefined}>
      <LabelPicker
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
    </AutomationCard>
  );
};

const DeleteLabelState: React.FC = () => (
  <State title="Delete a label used by an automation">
    <Column name="Try deleting Lead magnet (active) or Spring ebook (inactive)">
      <FakeLabelField />
    </Column>
    {/* The real dialog's message (lead-magnets-delete-dialog.tsx). */}
    <Column name="Blocked: active automation">
      <DialogCard actionLabel="Go to automation" cancelLabel="Close" title="Can't delete label">
        <LeadMagnetDeleteBlockedDescription
          automationName={ACTIVE_AUTOMATION}
          labelName="Lead magnet"
        />
      </DialogCard>
    </Column>
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
  <State title="Label warning on the member page">
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

// --- Member page save dialog ---

// The member page's "Dialog on Save" (lead-magnets-dialog.tsx), with its real title and copy.
const SAVE_LABEL_NAMES = { 'lead-magnet': 'Lead magnet', webinar: 'Webinar' };
const SAVE_SINGLE = {
  starts: [{ id: 'free-guide', name: ACTIVE_AUTOMATION, labelSlug: ACTIVE_LABEL }],
  ends: [],
};
const SAVE_MULTIPLE = {
  starts: [
    ...SAVE_SINGLE.starts,
    { id: 'ebook', name: 'E-book giveaway', labelSlug: ACTIVE_LABEL },
  ],
  ends: [{ id: 'webinar', name: 'Webinar follow-up', labelSlug: 'webinar' }],
};

const MemberSaveDialogState: React.FC = () => (
  <State title="Member page save dialog">
    {[
      { name: 'Single', changes: SAVE_SINGLE },
      { name: 'Multiple', changes: SAVE_MULTIPLE },
    ].map(({ name, changes }) => (
      <Column key={name} name={name}>
        <DialogCard actionLabel="Save" title="Save changes?">
          <LeadMagnetSaveDescription
            changes={changes}
            labelNames={SAVE_LABEL_NAMES}
            memberName="Emily Chen"
          />
        </DialogCard>
      </Column>
    ))}
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
            <Text as="p" size="sm" tone="secondary">
              {formatNumber(inProgressCount)} of these{' '}
              {inProgressCount === 1 ? 'member is' : 'members are'} in the {ACTIVE_AUTOMATION}{' '}
              automation and will be removed from it
            </Text>
          )}
        </Stack>
      }
      title={`Remove label from ${formatNumber(BULK_MEMBER_COUNT)} members`}
    />
  );
};

const BulkRemoveState: React.FC = () => (
  <State title="Bulk remove a label">
    <Column name="12 in progress">
      <BulkRemoveCard inProgressCount={12} />
    </Column>
    <Column name="None in progress (as today)">
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
    <TriggerShell Icon={LucideIcon.Tag} title="Label added to a member">
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
  <State title="Trigger concepts">
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
    <TriggerShell Icon={LucideIcon.Tag} title="Label added to a member">
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

const BULK_THRESHOLD = BULK_NOTE_THRESHOLD;

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

// The members list's "Add label" dialog (add-label-modal.tsx), laid out in place.
const BulkAddCard: React.FC<{ count: number }> = ({ count }) => {
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([ACTIVE_LABEL]);
  const optionSource = React.useMemo(() => staticOptionSource(FAKE_LABELS), []);
  return (
    <DialogCard
      actionLabel="Add label"
      body={
        <Stack gap="sm">
          <LabelPicker
            labels={FAKE_LABELS}
            optionSource={optionSource}
            selectedSlugs={selectedSlugs}
            onToggle={(slug) => setSelectedSlugs((current) => toggleSlug(current, slug))}
          />
          {selectedSlugs.includes(ACTIVE_LABEL) && <BulkStartNote count={count} source="bulk" />}
        </Stack>
      }
      title={`Add label to ${formatNumber(count)} ${count === 1 ? 'member' : 'members'}`}
    />
  );
};

// The import's "Label these members" field (mapping-step.tsx), with the CSV's row count.
const ImportStartCard: React.FC<{ count: number }> = ({ count }) => {
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
      {selectedSlugs.includes(ACTIVE_LABEL) && <BulkStartNote count={count} source="import" />}
    </AutomationCard>
  );
};

const BulkAddState: React.FC = () => (
  <State title="Bulk add a label">
    <Column name={`Under ${formatNumber(BULK_THRESHOLD)} members`}>
      <BulkAddCard count={5} />
    </Column>
    <Column name={`${formatNumber(BULK_THRESHOLD)} members or more`}>
      <BulkAddCard count={BULK_MEMBER_COUNT} />
    </Column>
    <Column name={`Import, ${formatNumber(IMPORT_MEMBER_COUNT)} rows`}>
      <ImportStartCard count={IMPORT_MEMBER_COUNT} />
    </Column>
  </State>
);

const BulkDoesntTrigger: React.FC = () => (
  <State title="B1. Bulk add and import don't start automations">
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
  <State title="B2. Bulk add and import start automations, more slowly">
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
const ArchivedStates: React.FC = () => (
  <Stack gap="2xl">
    {/* The stack's 32px gap plus my-8: 64px above and below each separator. */}
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
  { slug: 'trigger-states', name: 'Trigger states', Pattern: TriggerStatesState },
  { slug: 'turn-off', name: 'Turn off automation', Pattern: TurnOffState },
  { slug: 'delete-label', name: 'Delete a label', Pattern: DeleteLabelState },
  { slug: 'member-save-dialog', name: 'Member save dialog', Pattern: MemberSaveDialogState },
  { slug: 'bulk-add', name: 'Bulk add a label', Pattern: BulkAddState },
  { slug: 'bulk-remove', name: 'Bulk remove a label', Pattern: BulkRemoveState },
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
        <NavLink
          isCurrent={current.slug === ARCHIVED.slug}
          name={ARCHIVED.name}
          slug={ARCHIVED.slug}
        />
      </nav>
      {/* Keyed by pattern, so switching starts the new one at the top. */}
      <Box key={current.slug} className="min-w-0 flex-1 overflow-y-auto p-10">
        <Pattern />
      </Box>
    </Inline>
  );
};

export default LeadMagnetStates;
