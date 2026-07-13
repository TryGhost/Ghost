import PaywallCardEditor from './PaywallCardEditor';
import PaywallDesignPanel from './PaywallDesignPanel';
import PaywallThemePreview from './PaywallThemePreview';
import React, {useCallback, useRef, useState} from 'react';
import {AUDIENCE_LABELS, type Audience, DESIGN_PROPS, type DesignStyles, PLATFORM_AUDIENCES, type PaywallConfig, type Platform, loadMode, readDesign, saveMode, setCtaProp} from './paywall-data';
import {SegmentedControl} from './PaywallControls';

type Overrides = Record<Platform, Record<string, Partial<DesignStyles>>>;

// On web, the CTA can either be left to the theme's built-in content CTA or
// customised with the cards below. Email is always the custom cards.
type WebMode = 'theme' | 'custom';

export interface PaywallEditorModalProps {
    // 'post' edits this post's paywall; 'global' edits the site-wide defaults.
    scope: 'post' | 'global';
    initialConfig: PaywallConfig;
    accentColor: string;
    siteTitle: string;
    darkMode?: boolean;
    onSave: (config: PaywallConfig) => void;
    onClose: () => void;
}

// Shared paywall editor. Rendered from the post card (scope="post") and from
// Settings > Paywalls (scope="global") — identical apart from the scope copy.
export const PaywallEditorModal: React.FC<PaywallEditorModalProps> = ({scope, initialConfig, accentColor, siteTitle, darkMode, onSave, onClose}) => {
    const [platform, setPlatform] = useState<Platform>('web');
    // Theme vs custom is a site-level (global) setting. The global editor owns it;
    // a post only reads it — to decide whether its web paywalls are editable here —
    // and never writes it back, so a post never changes the site-wide choice.
    const isGlobal = scope === 'global';
    const [webMode, setWebMode] = useState<WebMode>(() => loadMode());

    // Latest editor states live in a ref, updated on every keystroke without
    // re-rendering the editors. A seed version bumps to remount them when global
    // styles change (the only way to push external changes into Koenig).
    const statesRef = useRef<PaywallConfig>(initialConfig);
    const [seedVersion, setSeedVersion] = useState(0);

    // Design defaults, seeded from the first card so the panel reflects the
    // current look on open.
    const [globalStyles, setGlobalStyles] = useState<DesignStyles>(
        () => readDesign(initialConfig.web?.[PLATFORM_AUDIENCES.web[0]])
    );
    const globalRef = useRef(globalStyles);
    globalRef.current = globalStyles;

    // Per-card design overrides (a prop is present only when it differs from the
    // global value), so global changes don't stomp cards the user tweaked.
    const overridesRef = useRef<Overrides>({web: {}, email: {}});

    const handleStateChange = useCallback((p: Platform, a: Audience, state: string) => {
        statesRef.current = {...statesRef.current, [p]: {...statesRef.current[p], [a]: state}};
        const design = readDesign(state);
        const overrides: Partial<DesignStyles> = {};
        DESIGN_PROPS.forEach((prop) => {
            if (design[prop] !== globalRef.current[prop]) {
                overrides[prop] = design[prop];
            }
        });
        overridesRef.current[p] = {...overridesRef.current[p], [a]: overrides};
    }, []);

    const applyGlobal = (prop: keyof DesignStyles, value: string) => {
        setGlobalStyles(current => ({...current, [prop]: value}));
        const next: PaywallConfig = {web: {...statesRef.current.web}, email: {...statesRef.current.email}};
        (Object.keys(next) as Platform[]).forEach((p) => {
            (Object.keys(next[p]) as Audience[]).forEach((a) => {
                const override = overridesRef.current[p]?.[a];
                if (override && prop in override) {
                    return; // card overrides this prop — leave it
                }
                next[p][a] = setCtaProp(next[p][a], prop, value);
            });
        });
        statesRef.current = next;
        setSeedVersion(v => v + 1); // remount editors to reflect the change
    };

    const audiences = PLATFORM_AUDIENCES[platform];

    // Theme mode only applies to web; email is always the custom cards.
    const themeMode = platform === 'web' && webMode === 'theme';

    const handleSave = () => {
        // Only the global editor owns the site-level mode; a post override must
        // never change it.
        if (isGlobal) {
            saveMode(webMode);
        }
        onSave(statesRef.current);
        onClose();
    };

    // Match Settings exactly (its header is just a title + Close/Save); the
    // post/global difference is reflected only in the title text.
    const title = scope === 'post' ? 'Edit paywall' : 'Paywalls';
    const btnBase = 'inline-flex h-[34px] items-center justify-center whitespace-nowrap rounded-md px-4 text-sm font-bold transition';

    return (
        <div
            className='fixed inset-0 z-[9999] flex bg-black/50 p-4'
            data-testid='paywall-editor-backdrop'
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className='flex grow flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-black' data-testid='paywall-editor-modal'>
                {/* Header: title + Web/Email tabs + actions */}
                <div className='flex items-center gap-4 border-b border-grey-200 px-6 py-4 dark:border-grey-900'>
                    <h1 className='flex-1 text-xl font-bold tracking-tight text-black dark:text-white'>{title}</h1>
                    <div className='w-[240px] shrink-0'>
                        <SegmentedControl
                            options={[{value: 'web', label: 'Web'}, {value: 'email', label: 'Email'}]}
                            value={platform}
                            onChange={value => setPlatform(value as Platform)}
                        />
                    </div>
                    <div className='flex flex-1 shrink-0 items-center justify-end gap-2'>
                        <button
                            className={`${btnBase} hover:bg-grey-300! bg-grey-200 text-black dark:bg-grey-900 dark:text-white`}
                            data-testid='paywall-modal-close'
                            type='button'
                            onClick={onClose}
                        >
                            Close
                        </button>
                        <button
                            className={`${btnBase} bg-black text-white hover:bg-grey-900 dark:bg-white dark:text-black`}
                            data-testid='paywall-modal-save'
                            type='button'
                            onClick={handleSave}
                        >
                            Save
                        </button>
                    </div>
                </div>

                <div className='flex min-h-0 grow'>
                    {/* Left: Theme/Custom toggle (web only) + shared styles panel */}
                    <div className='w-[300px] shrink-0 overflow-y-auto border-r border-grey-200 bg-white p-6 dark:border-grey-900 dark:bg-black'>
                        {/* The mode toggle only lives in the global editor — a post
                            follows the site-wide choice. */}
                        {isGlobal && platform === 'web' && (
                            <div className='mb-5'>
                                <SegmentedControl
                                    options={[{value: 'theme', label: 'Theme'}, {value: 'custom', label: 'Custom'}]}
                                    value={webMode}
                                    onChange={value => setWebMode(value as WebMode)}
                                />
                            </div>
                        )}
                        {themeMode ? (
                            <p className='text-sm text-grey-700'>
                                {isGlobal
                                    ? 'Your theme’s built-in call to action is shown to readers who reach gated content. Switch to Custom to design your own.'
                                    : 'Web paywalls are controlled by your theme. Switch from Theme to Custom in Settings → Paywalls to customize them here.'}
                            </p>
                        ) : (
                            <PaywallDesignPanel accentColor={accentColor} styles={globalStyles} onChange={applyGlobal} />
                        )}
                    </div>

                    {/* Right: theme CTA preview, or the stack of real Koenig CTA cards */}
                    <div className='flex grow overflow-y-auto bg-grey-50 dark:bg-grey-950'>
                        {themeMode ? (
                            <div className='m-auto flex w-full max-w-[640px] flex-col p-8'>
                                <PaywallThemePreview accentColor={accentColor} />
                            </div>
                        ) : (
                            <div className='m-auto flex w-full max-w-[640px] flex-col gap-8 p-8'>
                                {audiences.map(audience => (
                                    <div key={`${platform}-${audience}-${seedVersion}`}>
                                        <div className='mb-2 flex items-center gap-2'>
                                            <span className='text-xs font-semibold uppercase tracking-wide text-grey-700'>{AUDIENCE_LABELS[audience]}</span>
                                        </div>
                                        <div className='rounded-lg bg-white p-4 shadow-sm dark:bg-black'>
                                            <PaywallCardEditor
                                                audience={audience}
                                                darkMode={darkMode}
                                                initialEditorState={statesRef.current[platform]?.[audience]}
                                                platform={platform}
                                                siteTitle={siteTitle}
                                                onStateChange={handleStateChange}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaywallEditorModal;
