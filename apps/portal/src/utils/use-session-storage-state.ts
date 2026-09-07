import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

interface SessionStorageStateOptions<T> {
  initialState: T | (() => T);
  key: string;
  parse: (value: unknown) => T | null;
}

export default function useSessionStorageState<T>({
  initialState,
  key,
  parse,
}: SessionStorageStateOptions<T>): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    const fallback =
      typeof initialState === 'function' ? (initialState as () => T)() : initialState;

    try {
      const storedValue = window.sessionStorage.getItem(key);
      if (storedValue === null) {
        return fallback;
      }

      return parse(JSON.parse(storedValue)) ?? fallback;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Storage may be disabled or full. The in-memory state remains usable.
    }
  }, [key, state]);

  return [state, setState];
}

export function removeSessionStorageState({ key }: { key: string }) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Storage may be disabled. There is nothing else to clear.
  }
}
