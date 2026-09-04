import { createContext, useContext } from 'react';

// Prototype-only variant switching. A "slot" is any swappable piece of the
// proto (today: the float detail's left panel); each slot lists its variations
// by id. What a variant id *means* is the slot owner's business — usually a
// component registry beside the variant files — this module only tracks which
// id is selected. New swappable elements later = new slots passed to the
// provider; nothing here changes. Components (provider + flask switcher) live
// in proto-variant-switcher.tsx — split so this module can export the hook and
// helpers (react-refresh/only-export-components).

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
