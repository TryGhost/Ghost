import { createContext, useContext, useMemo, useRef } from 'react';

/** Hears which input holds an entry its field refused, or null once none does. */
export type RefusedEntryReport = (input: HTMLInputElement | null) => void;

export interface RefusedEntry {
  report: RefusedEntryReport;
  /**
   * Takes the writer back to the refused entry and answers true while one is
   * still on the page, so the action that asked stops there instead.
   */
  hold: () => boolean;
}

/**
 * Keeps track of a typed entry a field could not read, such as a publish time,
 * for the actions that must not go ahead past it. The field reports it in the
 * blur that refuses it, so the click that caused the blur already sees it.
 */
export function useRefusedEntry(): RefusedEntry {
  const input = useRef<HTMLInputElement | null>(null);
  return useMemo(
    () => ({
      report: (next) => {
        input.current = next;
      },
      hold: () => {
        const held = input.current;
        // A field that unmounted took its entry with it.
        if (!held?.isConnected) {
          return false;
        }
        held.focus();
        return true;
      },
    }),
    [],
  );
}

/** The editor screen's report, for a settings field the screen renders deep inside the panel. */
export const RefusedEntryContext = createContext<RefusedEntryReport | undefined>(undefined);

export function useRefusedEntryReport(): RefusedEntryReport | undefined {
  return useContext(RefusedEntryContext);
}
