import { DESKTOP_MAX_THREAD_DEPTH } from './helpers';
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';

export type ThreadingContextValue = {
  maxThreadDepth: number;
};

const defaultThreadingContext: ThreadingContextValue = {
  maxThreadDepth: DESKTOP_MAX_THREAD_DEPTH,
};

export const ThreadingContext = createContext<ThreadingContextValue>(defaultThreadingContext);

export function useThreadingContext(): ThreadingContextValue {
  return useContext(ThreadingContext);
}
