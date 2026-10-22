import type { TierSelection } from '@/automations/types';

export const isTierSelectionEmpty = (
  selection: TierSelection['from'] | TierSelection['to'],
): boolean => Array.isArray(selection) && selection.length === 0;

export const hasMissingTierSelection = (selection: TierSelection): boolean =>
  isTierSelectionEmpty(selection.from) || isTierSelectionEmpty(selection.to);

/** Selecting a specific From tier removes that tier from To; other choices stay selected. */
export function updateFromSelection(
  selection: TierSelection,
  from: TierSelection['from'],
): TierSelection {
  let to = selection.to;
  if (typeof from !== 'string' && typeof to !== 'string') {
    to = to.filter((tierId) => !from.includes(tierId));
  }
  return { from, to };
}

export const selectedTransitionTierIds = (selection?: TierSelection | null): readonly string[] =>
  selection
    ? [
        ...(typeof selection.from === 'string' ? [] : selection.from),
        ...(typeof selection.to === 'string' ? [] : selection.to),
      ]
    : [];
