import NiceModal, {useModal} from '@ebay/nice-modal-react';
import PaywallCardEditor from './paywall-card-editor';
import PaywallDesignPanel from './paywall-design-panel';
import PaywallThemePreview from './paywall-theme-preview';
import React, {useCallback, useRef, useState} from 'react';
import {AUDIENCE_LABELS, type Audience, DESIGN_PROPS, type DesignStyles, PLATFORM_AUDIENCES, type PaywallConfig, type Platform, loadMode, readDesign, saveMode, setCtaProp} from './paywalls-data';
import {Button, Heading, Modal} from '@tryghost/admin-x-design-system';
import {SegmentedControl} from './paywall-controls';

// On web, the CTA can either be left to the theme's built-in content CTA or
// customised with the cards below. Email is always the custom cards.
type WebMode = 'theme' | 'custom';

interface PaywallDetailModalProps {
    config: PaywallConfig;
    accentColor: string;
    siteTitle: string;
    onSave: (config: PaywallConfig) => void;
}

type Overrides = Record<Platform, Record<string, Partial<DesignStyles>>>;

const PaywallDetailModal: React.FC<PaywallDetailModalProps> = ({config: initialConfig, accentColor, onSave}) => {
    const modal = useModal();
    const [platform, setPlatform] = useState<Platform>('web');
    // Site-level theme/custom choice, shared with the in-post editor (persisted on
    // save). Theme is the default; Custom reveals the design panel + cards.
    const [webMode, setWebMode] = useState<WebMode>(() => loadMode());

    // Latest editor states live in a ref, updated on every keystroke without
    // re-rendering the editors. A seed version bumps to remount them when global
    // styles change (the only way to push external changes into Koenig).
    const statesRef = useRef<PaywallConfig>(initialConfig);
    const [seedVersion, setSeedVersion] = useState(0);

    // Global design defaults, seeded from the first card so the panel reflects
    // the current look on open.
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
        saveMode(webMode);
        onSave(statesRef.current);
        modal.remove();
    };

    return (
        <Modal
            afterClose={() => modal.remove()}
            animate={false}
            footer={false}
            header={false}
            padding={false}
            scrolling={false}
            size='full'
            testId='paywall-modal'
            width='full'
        >
            <div className='flex h-full flex-col'>
                {/* Header: title + Web/Email tabs + actions */}
                <div className='flex items-center gap-4 border-b border-grey-200 px-6 py-4 dark:border-grey-900'>
                    <div className='flex-1'>
                        <Heading level={4}>Paywalls</Heading>
                    </div>
                    <div className='w-[240px] shrink-0'>
                        <SegmentedControl
                            options={[{value: 'web', label: 'Web'}, {value: 'email', label: 'Email'}]}
                            value={platform}
                            onChange={value => setPlatform(value as Platform)}
                        />
                    </div>
                    <div className='flex flex-1 items-center justify-end gap-2'>
                        <Button color='outline' label='Close' onClick={() => modal.remove()} />
                        <Button color='black' label='Save' onClick={handleSave} />
                    </div>
                </div>

                <div className='flex min-h-0 grow'>
                    {/* Left: Theme/Custom toggle (web only) + global styles panel */}
                    <div className='w-[300px] shrink-0 overflow-y-auto border-r border-grey-200 bg-white p-6 dark:border-grey-900 dark:bg-black'>
                        {platform === 'web' && (
                            <div className='mb-5'>
                                <SegmentedControl
                                    options={[{value: 'theme', label: 'Theme'}, {value: 'custom', label: 'Custom'}]}
                                    value={webMode}
                                    onChange={value => setWebMode(value as WebMode)}
                                />
                            </div>
                        )}
                        {themeMode ? (
                            <p className='text-sm text-grey-700'>Your theme&rsquo;s built-in call to action is shown to readers who reach gated content. Switch to Custom to design your own.</p>
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
                                            <span className='text-xs font-semibold tracking-wide text-grey-700 uppercase'>{AUDIENCE_LABELS[audience]}</span>
                                        </div>
                                        <div className='rounded-lg bg-white p-4 shadow-sm dark:bg-black'>
                                            <PaywallCardEditor
                                                audience={audience}
                                                initialEditorState={statesRef.current[platform]?.[audience]}
                                                platform={platform}
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
        </Modal>
    );
};

export default NiceModal.create(PaywallDetailModal);
