import { createContext, useContext } from 'react';

interface FeatureFlagOverridesContextValue {
  enabledFlags: string[];
}

export const FeatureFlagOverridesContext = createContext<FeatureFlagOverridesContextValue>({
  enabledFlags: [],
});

export const useFeatureFlagOverrides = () => useContext(FeatureFlagOverridesContext);
