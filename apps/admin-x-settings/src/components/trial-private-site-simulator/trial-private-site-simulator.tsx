import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {type Setting, getSettingValue, useBrowseSettings, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {showToast} from '@tryghost/admin-x-design-system';

export type TrialPrivateSiteSimulatorMode = 'normal' | 'trial' | 'upgraded';

type TrialPrivateSiteSimulatorContextValue = {
    mode: TrialPrivateSiteSimulatorMode;
    password: string;
    regenerateAccessCode: () => Promise<void>;
    setMode: (mode: TrialPrivateSiteSimulatorMode) => Promise<void>;
    isTrialMode: boolean;
    isUpgradedMode: boolean;
}

const STORAGE_KEY = 'ghost-trial-private-site-simulator-mode';

const FIRST_WORDS = ['silver', 'quiet', 'bright', 'lunar', 'green', 'blue', 'wild', 'golden', 'hidden', 'north'];
const SECOND_WORDS = ['river', 'garden', 'signal', 'harbor', 'studio', 'meadow', 'anchor', 'paper', 'window', 'summit'];

const TrialPrivateSiteSimulatorContext = createContext<TrialPrivateSiteSimulatorContextValue | undefined>(undefined);

function isSimulatorMode(value: string | null): value is TrialPrivateSiteSimulatorMode {
    return value === 'normal' || value === 'trial' || value === 'upgraded';
}

function getStoredMode(): TrialPrivateSiteSimulatorMode {
    if (typeof window === 'undefined') {
        return 'normal';
    }

    const storedMode = window.localStorage.getItem(STORAGE_KEY);
    return isSimulatorMode(storedMode) ? storedMode : 'normal';
}

function generateAccessCode() {
    const firstWord = FIRST_WORDS[Math.floor(Math.random() * FIRST_WORDS.length)];
    const secondWord = SECOND_WORDS[Math.floor(Math.random() * SECOND_WORDS.length)];

    return `${firstWord}-${secondWord}`;
}

function normalizeAccessCode(value: string | null | undefined) {
    return value?.trim() || '';
}

function isOldSpikeAccessCode(value: string) {
    return /^[a-z]+-[a-z]+-\d{2}$/.test(value);
}

const TrialPrivateSiteSimulatorProviderInternal: React.FC<{children: React.ReactNode}> = ({children}) => {
    const {data: settingsData} = useBrowseSettings();
    const {mutateAsync: editSettings} = useEditSettings();
    const [mode, setLocalMode] = useState<TrialPrivateSiteSimulatorMode>(getStoredMode);
    const [simulatorPassword, setSimulatorPassword] = useState('');
    const enforcementPendingRef = useRef(false);

    const settings = settingsData?.settings || [];
    const password = normalizeAccessCode(getSettingValue<string>(settings, 'password'));
    const isPrivate = getSettingValue<boolean>(settings, 'is_private') || false;

    const saveAccessCode = useCallback(async (accessCode: string, makePrivate = true) => {
        const settingsToUpdate: Setting[] = [{
            key: 'password',
            value: accessCode
        }];

        if (makePrivate) {
            settingsToUpdate.unshift({
                key: 'is_private',
                value: true
            });
        }

        setSimulatorPassword(accessCode);

        const response = await editSettings(settingsToUpdate);
        const savedPassword = normalizeAccessCode(getSettingValue<string>(response?.settings, 'password'));

        if (savedPassword) {
            setSimulatorPassword(savedPassword);
        }
    }, [editSettings]);

    const enforcePrivateSite = useCallback(async () => {
        const shouldGeneratePassword = !password || isOldSpikeAccessCode(password);
        const generatedPassword = shouldGeneratePassword ? generateAccessCode() : password || simulatorPassword;

        // Temporary spike behavior: keep direct Trial/Upgraded switching usable even
        // when a site starts without an access code.
        if (shouldGeneratePassword) {
            await saveAccessCode(generatedPassword);
            return;
        }

        setSimulatorPassword(generatedPassword);
        await editSettings([{
            key: 'is_private',
            value: true
        }]);
    }, [editSettings, password, saveAccessCode, simulatorPassword]);

    const setMode = useCallback(async (nextMode: TrialPrivateSiteSimulatorMode) => {
        setLocalMode(nextMode);
        window.localStorage.setItem(STORAGE_KEY, nextMode);

        if (nextMode === 'normal') {
            return;
        }

        await enforcePrivateSite();
    }, [enforcePrivateSite]);

    const regenerateAccessCode = useCallback(async () => {
        await saveAccessCode(generateAccessCode(), mode !== 'normal');
    }, [mode, saveAccessCode]);

    useEffect(() => {
        if (mode === 'normal' || enforcementPendingRef.current || (isPrivate && password)) {
            return;
        }

        enforcementPendingRef.current = true;

        enforcePrivateSite()
            .catch(() => {
                showToast({
                    type: 'error',
                    title: 'Could not update simulator mode'
                });
            })
            .finally(() => {
                enforcementPendingRef.current = false;
            });
    }, [enforcePrivateSite, isPrivate, mode, password]);

    useEffect(() => {
        const handleStorage = (event: StorageEvent) => {
            if (event.key === STORAGE_KEY && isSimulatorMode(event.newValue)) {
                setLocalMode(event.newValue);
            }
        };

        window.addEventListener('storage', handleStorage);

        return () => {
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    const value = useMemo(() => ({
        mode,
        password: password || simulatorPassword,
        regenerateAccessCode,
        setMode,
        isTrialMode: mode === 'trial',
        isUpgradedMode: mode === 'upgraded'
    }), [mode, password, regenerateAccessCode, setMode, simulatorPassword]);

    return (
        <TrialPrivateSiteSimulatorContext.Provider value={value}>
            {children}
        </TrialPrivateSiteSimulatorContext.Provider>
    );
};

export const TrialPrivateSiteSimulatorProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
    const parentContext = useContext(TrialPrivateSiteSimulatorContext);

    if (parentContext) {
        return <>{children}</>;
    }

    return (
        <TrialPrivateSiteSimulatorProviderInternal>
            {children}
        </TrialPrivateSiteSimulatorProviderInternal>
    );
};

export function useTrialPrivateSiteSimulator() {
    const context = useContext(TrialPrivateSiteSimulatorContext);

    if (!context) {
        throw new Error('useTrialPrivateSiteSimulator must be used inside TrialPrivateSiteSimulatorProvider');
    }

    return context;
}

const MODE_LABELS: Record<TrialPrivateSiteSimulatorMode, string> = {
    normal: 'Normal',
    trial: 'Trial',
    upgraded: 'Upgraded'
};

export const TrialPrivateSiteSimulatorToolbar: React.FC<{children?: React.ReactNode}> = ({children}) => {
    const {mode, setMode} = useTrialPrivateSiteSimulator();
    const [savingMode, setSavingMode] = useState<TrialPrivateSiteSimulatorMode | null>(null);

    const handleModeChange = async (nextMode: TrialPrivateSiteSimulatorMode) => {
        setSavingMode(nextMode);

        try {
            await setMode(nextMode);
        } catch {
            showToast({
                type: 'error',
                title: 'Could not update simulator mode'
            });
        } finally {
            setSavingMode(null);
        }
    };

    return (
        <div className='pointer-events-none fixed top-5 left-1/2 z-[55] w-[calc(100%-2rem)] max-w-[680px] -translate-x-1/2 tablet:top-6'>
            <div className='pointer-events-auto mx-auto flex flex-col gap-2 rounded-lg border border-grey-200 bg-white/95 px-3 py-2 text-sm shadow-lg backdrop-blur tablet:w-fit tablet:flex-row tablet:items-center dark:border-grey-900 dark:bg-grey-975/95'>
                <div className='flex items-center gap-2'>
                    <span className='text-xs font-semibold tracking-wide whitespace-nowrap text-grey-700 uppercase dark:text-grey-500'>Trial access simulator</span>
                    <div className='flex rounded-md bg-grey-100 p-0.5 dark:bg-grey-900'>
                        {(['normal', 'trial', 'upgraded'] as TrialPrivateSiteSimulatorMode[]).map(simulatorMode => (
                            <button
                                key={simulatorMode}
                                className={`h-7 rounded px-3 text-sm font-semibold transition ${mode === simulatorMode ? 'bg-white text-black shadow-xs dark:bg-grey-800 dark:text-white' : 'text-grey-700 hover:text-black dark:text-grey-400 dark:hover:text-white'}`}
                                data-testid={`trial-private-site-simulator-${simulatorMode}`}
                                disabled={savingMode !== null}
                                type='button'
                                onClick={() => handleModeChange(simulatorMode)}
                            >
                                {savingMode === simulatorMode ? 'Saving...' : MODE_LABELS[simulatorMode]}
                            </button>
                        ))}
                    </div>
                </div>
                {children && (
                    <div className='flex items-center gap-2 border-grey-200 tablet:border-l tablet:pl-3 dark:border-grey-900'>
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
};
