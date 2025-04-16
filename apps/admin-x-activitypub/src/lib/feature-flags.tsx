import React, {createContext, useContext, useEffect, useState} from 'react';
import {useLocation} from '@tryghost/admin-x-framework';

// Define all available feature flags as string here, e.g. ['flag-1', 'flag-2']
export const FEATURE_FLAGS = ['settings'] as const;

// ---
export type FeatureFlag = typeof FEATURE_FLAGS[number] | string;

type FeatureFlagsState = Partial<Record<FeatureFlag, boolean>>;

type FeatureFlagsContextType = {
    isEnabled: (flag: FeatureFlag) => boolean;
    flags: FeatureFlagsState;
    allFlags: typeof FEATURE_FLAGS;
};

const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(undefined);

export const FeatureFlagsProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
    const location = useLocation();
    const [flags, setFlags] = useState<FeatureFlagsState>(() => {
        // Try to load from localStorage first
        const savedFlags = localStorage.getItem('featureFlags');
        if (savedFlags) {
            return JSON.parse(savedFlags);
        }
        return getDefaultState();
    });

    useEffect(() => {
        const urlFlags = parseUrlParams(location.search);
        if (Object.keys(urlFlags).length > 0) {
            setFlags((currentFlags) => {
                const newFlags = {
                    ...currentFlags,
                    ...urlFlags
                };
                // Save to localStorage for persistence
                localStorage.setItem('featureFlags', JSON.stringify(newFlags));
                return newFlags;
            });
        }
    }, [location.search]);

    const isEnabled = (flag: FeatureFlag): boolean => flags[flag] ?? false;

    const value = {
        isEnabled,
        flags,
        allFlags: FEATURE_FLAGS
    };

    return (
        <FeatureFlagsContext.Provider value={value}>
            {children}
        </FeatureFlagsContext.Provider>
    );
};

const getDefaultState = (): FeatureFlagsState => {
    return FEATURE_FLAGS.reduce((acc, flag) => ({
        ...acc,
        [flag]: false
    }), {} as FeatureFlagsState);
};

const parseUrlParams = (search: string): Partial<FeatureFlagsState> => {
    const params = new URLSearchParams(search);
    const state: Partial<FeatureFlagsState> = {};

    FEATURE_FLAGS.forEach((flag) => {
        const value = params.get(flag);
        if (value === 'ON') {
            state[flag] = true;
        } else if (value === 'OFF') {
            state[flag] = false;
        }
    });

    return state;
};

export const useFeatureFlags = () => {
    const context = useContext(FeatureFlagsContext);
    if (context === undefined) {
        throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
    }
    return context;
};
