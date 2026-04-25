import {useEffect, useState} from 'react';
import {useUserPreferences, useEditUserPreferences} from '@/hooks/user-preferences';

export type ThemeMode = 'light' | 'dark' | 'system';

function getSystemTheme(): 'dark' | 'light' {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
    const {data: preferences} = useUserPreferences();
    const {mutateAsync: editPreferences} = useEditUserPreferences();

    const theme: ThemeMode = preferences?.nightShift ?? 'system';

    const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>(getSystemTheme);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light');
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    const resolvedTheme: 'dark' | 'light' = theme !== 'system' ? theme : systemTheme;

    const setTheme = (mode: ThemeMode) => {
        void editPreferences({nightShift: mode});
    };

    return {theme, resolvedTheme, setTheme} as const;
}
