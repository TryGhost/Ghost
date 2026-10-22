import { useSyncExternalStore } from 'react';

// NY-1715 exploration only — never merge. Lets reviewers flip between design
// concepts for unsaved/unpublished email changes in one build.
export const CONCEPTS = [
  { id: 'current', label: 'A. Current' },
  { id: 'a', label: 'B. Full modal' },
  { id: 'a3', label: 'C. Canvas card' },
  { id: 'a2', label: 'D. Zoom card' },
  { id: 'a4', label: 'E. Canvas card v2' },
  { id: 'a5', label: 'F. Canvas card v3' },
] as const;

export type ConceptId = (typeof CONCEPTS)[number]['id'];

// A2–A5 are A with different editor frames; everything else is shared.
export const isConceptA = (concept: ConceptId) =>
  concept === 'a' || concept === 'a2' || concept === 'a3' || concept === 'a4' || concept === 'a5';

// C (a3) and its v2 and v3, E (a4) and F (a5): the editor grows out of the card over a cleared
// canvas, with the automation header kept live. E layers its feedback round on top (see
// isCanvasCardV2).
export const isCanvasCard = (concept: ConceptId) =>
  concept === 'a3' || concept === 'a4' || concept === 'a5';
// F (a5) starts as a copy of E, so it takes everything E does; gate F-only changes on isConceptF.
export const isCanvasCardV2 = (concept: ConceptId) => concept === 'a4' || concept === 'a5';
export const isConceptF = (concept: ConceptId) => concept === 'a5';

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

// Demo option: show the pen beside steps with unsaved changes (concepts B–D). On by default.
const EDIT_MARKERS_KEY = 'ny1715-edit-markers';
let showEditMarkers = (() => {
  try {
    return window.localStorage.getItem(EDIT_MARKERS_KEY) !== 'off';
  } catch {
    return true;
  }
})();

export const setShowEditMarkers = (show: boolean) => {
  showEditMarkers = show;
  try {
    window.localStorage.setItem(EDIT_MARKERS_KEY, show ? 'on' : 'off');
  } catch {
    // Storage blocked — the toggle still applies until reload.
  }
  listeners.forEach((listener) => listener());
};

export const useShowEditMarkers = (): boolean =>
  useSyncExternalStore(subscribe, () => showEditMarkers);
