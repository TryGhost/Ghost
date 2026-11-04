type AutomationEditAction = 'save' | 'publish' | 'republish' | 'unpublish';
type ConfirmableAutomationEditAction = 'publish' | 'republish' | 'unpublish';

export type AutomationEditState =
  | { phase: 'idle'; action?: undefined }
  | { phase: 'submitting' | 'failed'; action: AutomationEditAction }
  | { phase: 'confirming'; action: ConfirmableAutomationEditAction };

export type RunSortDirection = 'asc' | 'desc';

// The From and To selections for a paid subscription change; an empty list means no selection.
// Local until the API can hold it (NY-1733).
export type TierSelection = {
  from: 'any_paid' | string[];
  to: string[] | 'downgraded_to_free';
};

// The slug of the one label that starts a "Label added to a member" automation, as the members
// label picker keys it; null until one is picked. Local until the API can hold it, like
// `TierSelection` (NY-1750).
export type LabelSelection = string | null;
