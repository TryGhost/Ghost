import { useSyncExternalStore } from 'react';

// NY-1715 exploration only — never merge. Lets reviewers flip between design
// concepts for unsaved/unpublished email changes in one build.
export const CONCEPTS = [
  { id: 'current', label: 'A. Current' },
  { id: 'a', label: 'B. Full modal' },
  { id: 'a3', label: 'C. Canvas card' },
  { id: 'a2', label: 'D. Zoom card' },
] as const;

export type ConceptId = (typeof CONCEPTS)[number]['id'];

// A2 and A3 are A with different editor frames; everything else is shared.
export const isConceptA = (concept: ConceptId) =>
  concept === 'a' || concept === 'a2' || concept === 'a3';

const STORAGE_KEY = 'ny1715-concept';
// Tests keep exercising today's behaviour; the dev build opens on the newest concept.
const DEFAULT_CONCEPT: ConceptId = import.meta.env.MODE === 'test' ? 'current' : 'a';

const isConceptId = (value: unknown): value is ConceptId =>
  CONCEPTS.some((concept) => concept.id === value);

const readStoredConcept = (): ConceptId => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isConceptId(stored) ? stored : DEFAULT_CONCEPT;
  } catch {
    return DEFAULT_CONCEPT;
  }
};

let currentConcept: ConceptId = readStoredConcept();
const listeners = new Set<() => void>();

export const setConcept = (concept: ConceptId) => {
  currentConcept = concept;
  try {
    window.localStorage.setItem(STORAGE_KEY, concept);
  } catch {
    // Storage blocked — the switch still applies until reload.
  }
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useConcept = (): ConceptId => useSyncExternalStore(subscribe, () => currentConcept);
