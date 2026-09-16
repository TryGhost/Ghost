import type {
  AutomationAction,
  AutomationDetail,
} from '@tryghost/admin-x-framework/api/automations';
import {
  type TriggerConfig,
  audienceLabel,
  triggerLabel,
} from '@/automations/proto/shared/trigger-config';
import { type StepKind, formatWait, orderActions } from '@/automations/proto/canvas/flow-utils';

// What's in the draft that isn't live yet, as a plain list.
//
// With no edit mode and autosave running, "you have unpublished changes" is easy
// to say and hard to act on — the publisher has no way to remember what they
// changed three minutes ago. This turns the draft/published gap into something
// readable, so publishing is a decision rather than a leap.
//
// Deliberately shallow: it reports the fields the proto can actually edit. Email
// *content* isn't diffed because the proto doesn't edit it.

export interface ChangeEntry {
  id: string;
  label: string;
  // Which part of the flow the change is about, so a reader can pick their
  // change out of the list by its icon before reading a word of it. Same
  // vocabulary the canvas labels its nodes with (stepKindIcon), so the entry
  // and the card it refers to carry the same mark. 'details' is the one entry
  // with no card on the canvas — the automation's own name and description.
  kind: StepKind | 'details';
}

interface ChangeSummaryInput {
  published: AutomationDetail;
  draft: AutomationDetail;
  // Nullable because a just-created automation has no trigger yet. Choosing the
  // first one is a change like any other — it's the edit that makes the
  // automation runnable, so it has to show up here or Save would stay disabled
  // on the one screen where picking a trigger is the whole job.
  publishedTrigger: TriggerConfig | null;
  draftTrigger: TriggerConfig | null;
  // Name and description, for lanes that route them through the draft (phase 2's
  // detail screen has one global Save, and details ride it like everything else).
  // Optional because the other lanes write details straight through to the store,
  // where a diff here would double-report an edit that already landed.
  details?: {
    published: { name: string; description: string };
    draft: { name: string; description: string };
  };
}

const emailLabel = (subject: string): string =>
  subject.trim() ? `“${subject.trim()}”` : 'an untitled email';

const actionKind = (action: AutomationAction): StepKind =>
  action.type === 'send_email' ? 'email' : 'wait';

const describe = (action: AutomationAction): string =>
  action.type === 'send_email'
    ? `email ${emailLabel(action.data.email_subject)}`
    : `a ${formatWait(action.data.wait_hours)} wait`;

// Who the automation applies to, as one comparable string. audienceLabel is the
// same phrase the trigger card shows, so a change entry names it in the words the
// reader just set it in.

export function changeSummary({
  published,
  draft,
  publishedTrigger,
  draftTrigger,
  details,
}: ChangeSummaryInput): ChangeEntry[] {
  // Details lead the list: what the automation is called comes before what it does.
  const changes: ChangeEntry[] = detailChanges(details);

  if (!draftTrigger) {
    // Nothing chosen yet, and nothing can have been un-chosen — a saved trigger
    // can be changed but not cleared. Fall through to the action diff.
    return [...changes, ...actionChanges({ published, draft })];
  }

  if (!publishedTrigger) {
    changes.push({
      id: 'trigger-set',
      kind: 'trigger',
      label: `Trigger set to ${triggerLabel(draftTrigger)}`,
    });
    return [...changes, ...actionChanges({ published, draft })];
  }

  if (publishedTrigger.type !== draftTrigger.type) {
    changes.push({
      id: 'trigger-type',
      kind: 'trigger',
      label: `Trigger changed to ${triggerLabel(draftTrigger)}`,
    });
  }

  // Only the paid trigger can produce a difference here — signup takes no settings,
  // so its label is the same phrase every time. Diffed unconditionally anyway: the
  // check costs nothing, and the day a second trigger grows a setting this keeps
  // working rather than silently not.
  if (audienceLabel(publishedTrigger) !== audienceLabel(draftTrigger)) {
    changes.push({
      id: 'trigger-audience',
      kind: 'trigger',
      label: `Audience changed to ${audienceLabel(draftTrigger)}`,
    });
  }

  // No exit-criteria diff. There's nothing to diff: exits are derived from the
  // trigger and its tiers now, both of which are already compared above, so an entry
  // here would restate one of those in different words.

  return [...changes, ...actionChanges({ published, draft })];
}

// Name and description, when the lane hands them over. Trimmed before they get
// here, so a rename that's all whitespace never counts.
function detailChanges(details: ChangeSummaryInput['details']): ChangeEntry[] {
  if (!details) {
    return [];
  }
  const changes: ChangeEntry[] = [];
  if (details.published.name !== details.draft.name) {
    changes.push({
      id: 'name',
      kind: 'details',
      label: `Renamed to “${details.draft.name}”`,
    });
  }
  if (details.published.description !== details.draft.description) {
    changes.push({
      id: 'description',
      kind: 'details',
      label: 'Description updated',
    });
  }
  return changes;
}

// The step-level half of the diff — added, removed and edited actions. Its own
// function so the trigger cases above can return early and still report it.
function actionChanges({
  published,
  draft,
}: Pick<ChangeSummaryInput, 'published' | 'draft'>): ChangeEntry[] {
  const changes: ChangeEntry[] = [];
  const publishedActions = orderActions(published);
  const draftActions = orderActions(draft);
  const publishedById = new Map(publishedActions.map((action) => [action.id, action]));
  const draftById = new Map(draftActions.map((action) => [action.id, action]));

  draftActions
    .filter((action) => !publishedById.has(action.id))
    .forEach((action) =>
      changes.push({
        id: `add-${action.id}`,
        kind: actionKind(action),
        label: `Added ${describe(action)}`,
      }),
    );
  publishedActions
    .filter((action) => !draftById.has(action.id))
    .forEach((action) =>
      changes.push({
        id: `remove-${action.id}`,
        kind: actionKind(action),
        label: `Removed ${describe(action)}`,
      }),
    );

  // Steps that exist on both sides, changed in place.
  draftActions.forEach((action) => {
    const before = publishedById.get(action.id);
    if (!before) {
      return;
    }
    if (
      action.type === 'send_email' &&
      before.type === 'send_email' &&
      before.data.email_subject !== action.data.email_subject
    ) {
      changes.push({
        id: `subject-${action.id}`,
        kind: 'email',
        label: `Subject changed to ${emailLabel(action.data.email_subject)}`,
      });
    }
    if (
      action.type === 'wait' &&
      before.type === 'wait' &&
      before.data.wait_hours !== action.data.wait_hours
    ) {
      changes.push({
        id: `wait-${action.id}`,
        kind: 'wait',
        label: `Wait changed from ${formatWait(before.data.wait_hours)} to ${formatWait(action.data.wait_hours)}`,
      });
    }
  });

  return changes;
}
