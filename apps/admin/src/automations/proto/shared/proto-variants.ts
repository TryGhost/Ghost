import { createContext, useContext } from 'react';

// Prototype-only variant switching WITHIN a lane. A "slot" is any swappable
// piece of one lane's screens; each slot lists its variations by id, and this
// module only tracks which id is selected — what a variant id means is the slot
// owner's business.
//
// The phase comparison this used to drive is now the lane split (see lanes.ts):
// lanes are routes with their own files, not variants of one screen. What's left
// here is for a comparison INSIDE a lane — two treatments of the same card, say —
// which the lane switcher renders below the lane list when a lane provides them.
//
// Nothing provides slots today. Kept because the machinery is the cheap part and
// re-deriving it costs more than carrying it; a lane opts in by wrapping its
// screen in a provider over this context and passing its slots.

export type ProtoVariantOption = { id: string; label: string };

export interface ProtoSlot {
  id: string;
  label: string;
  variants: ProtoVariantOption[];
}

export type ProtoVariantSelections = Record<string, string>;

const STORAGE_KEY = 'automations-proto-variants';

// Selections persist to localStorage so a refresh mid-demo keeps the chosen look.
export const readStoredSelections = (): ProtoVariantSelections => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProtoVariantSelections) : {};
  } catch {
    return {};
  }
};

export const writeStoredSelections = (selections: ProtoVariantSelections): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selections));
  } catch {
    // localStorage unavailable — the selection still holds for this session
  }
};

// Stored ids go stale as variants get added/renamed between sessions — resolve
// falls back to the slot's first variant rather than rendering nothing.
export const resolveVariantId = (slot: ProtoSlot, selections: ProtoVariantSelections): string => {
  const stored = selections[slot.id];
  return stored && slot.variants.some((variant) => variant.id === stored)
    ? stored
    : slot.variants[0].id;
};

export interface ProtoVariantsContextValue {
  slots: ProtoSlot[];
  selections: ProtoVariantSelections;
  select: (slotId: string, variantId: string) => void;
}

export const ProtoVariantsContext = createContext<ProtoVariantsContextValue | null>(null);

// Which variant of `slot` is active. Safe outside the provider (returns the
// slot's first variant), so variant-aware components stay reusable elsewhere.
export const useProtoVariant = (slot: ProtoSlot): string => {
  const ctx = useContext(ProtoVariantsContext);
  return resolveVariantId(slot, ctx?.selections ?? {});
};
