import type {
  AutomationAction,
  AutomationDetail,
  AutomationSendEmailAction,
} from '@tryghost/admin-x-framework/api/automations';

// NY-1715 exploration only — never merge.
export type PendingChangesKind = 'unsaved' | 'unpublished';

// Concept E: what the next save does to a step — adds it, updates it or deletes it.
export type StepChangeKind = 'added' | 'updated' | 'deleted';

export const pendingChangesKind = (status: string | undefined): PendingChangesKind =>
  status === 'active' ? 'unpublished' : 'unsaved';

// Whether one email differs from the last-saved automation — so the email editor speaks
// for its own email, not for edits elsewhere on the canvas. An email that's new since the
// save counts as changed.
export const hasEmailChanged = (
  action: AutomationSendEmailAction,
  savedActions: readonly AutomationAction[],
): boolean => {
  const saved = savedActions.find((candidate) => candidate.id === action.id);
  return (
    saved?.type !== 'send_email' ||
    saved.data.email_subject !== action.data.email_subject ||
    saved.data.email_lexical !== action.data.email_lexical
  );
};

// How many things differ from the last save, for concept C's Publish changes button: each
// step added, edited or removed, plus one for the trigger and one for the name.
export const countChanges = (saved: AutomationDetail, draft: AutomationDetail): number => {
  const tierIds = (ids: readonly string[] | null) => (ids ? [...ids].sort().join(',') : '');
  let count = 0;
  if (saved.name !== draft.name || saved.description !== draft.description) {
    count += 1;
  }
  if (
    saved.trigger_tier_scope !== draft.trigger_tier_scope ||
    tierIds(saved.trigger_tier_ids) !== tierIds(draft.trigger_tier_ids)
  ) {
    count += 1;
  }
  for (const action of draft.actions) {
    const before = saved.actions.find((candidate) => candidate.id === action.id);
    if (!before || JSON.stringify(before.data) !== JSON.stringify(action.data)) {
      count += 1;
    }
  }
  count += saved.actions.filter(
    (action) => !draft.actions.some((candidate) => candidate.id === action.id),
  ).length;
  return count;
};

// "Publish 3 changes", "Publish 1 change" — or null when there's nothing countable.
export const withChangeCount = (verb: string, count: number): string | null =>
  count > 0 ? `${verb} ${count} change${count === 1 ? '' : 's'}` : null;

// A step differs from the last-saved automation: it's new since the save, or its settings
// changed (an email's subject or body, a wait's length).
export const hasStepChanged = (
  action: AutomationAction,
  savedActions: readonly AutomationAction[],
): boolean => {
  const saved = savedActions.find((candidate) => candidate.id === action.id);
  return !saved || JSON.stringify(saved.data) !== JSON.stringify(action.data);
};
