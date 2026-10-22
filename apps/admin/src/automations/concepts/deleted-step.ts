import { LucideIcon } from '@tryghost/shade/utils';
import type { NodeContextMenuEntry } from '@/automations/components/canvas/nodes';

// NY-1715 exploration only — never merge. Concept F: a saved step deleted on the canvas stays
// in place until the next save or publish removes it (see pendingDeleteIds in editor.tsx).

// Its contents can't be edited or opened (React 18 has no `inert` prop); only the Unsaved
// changes marker beside it stays live, to bring the step back.
export const inertWhen =
  (inert: boolean) =>
  (element: HTMLElement | null): void => {
    if (element) {
      element.inert = inert;
    }
  };

// E: a shrunk deleted card keeps its ⋯ menu, holding only Restore, which brings the step back.
export const restoreMenuItems = (onRestore: () => void): NodeContextMenuEntry[] => [
  { icon: LucideIcon.Undo2, label: 'Restore', onSelect: onRestore },
];
