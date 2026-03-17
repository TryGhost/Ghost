import {useCallback, useEffect, useSyncExternalStore} from 'react';
import {useUserPreferences, useEditUserPreferences, resolveColorScheme, type ColorSchemeValue} from './user-preferences';

function subscribeToMediaQuery(callback: () => void) {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener('change', callback);
    return () => mql.removeEventListener('change', callback);
}

function getOsPrefersDark() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function useOsPrefersDark(): boolean {
    return useSyncExternalStore(subscribeToMediaQuery, getOsPrefersDark);
}

export function useColorMode() {
    const {data: preferences} = useUserPreferences();
    const {mutateAsync: editPreferences} = useEditUserPreferences();
    const osPrefersDark = useOsPrefersDark();

    const scheme = resolveColorScheme(preferences);
    const effectiveDark = scheme === 'dark' || (scheme === 'system' && osPrefersDark);

    // Keep the .dark class on <html> in sync
    useEffect(() => {
        document.documentElement.classList.toggle('dark', effectiveDark);
    }, [effectiveDark]);

    const setColorScheme = useCallback((value: ColorSchemeValue) => {
        const isDark = value === 'dark' || (value === 'system' && getOsPrefersDark());
        void editPreferences({
            colorScheme: value,
            nightShift: isDark
        });
    }, [editPreferences]);

    return {scheme, effectiveDark, setColorScheme};
}
