import React, {useCallback, useMemo, useRef} from 'react';
import {type Audience, type Platform} from './paywalls-data';
import {KoenigEditorBase, type KoenigInstance, useDesignSystem} from '@tryghost/admin-x-design-system';
import {cn} from '@tryghost/shade/utils';
import {focusKoenigEditorOnBottomClick, useFramework} from '@tryghost/admin-x-framework';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {koenigFileUploadTypes, useKoenigFetchEmbed, useKoenigFileUpload, usePinturaConfig} from '@tryghost/admin-x-framework/hooks';
import {useGlobalData} from '../../../providers/global-data-provider';

const fileUploader = {
    useFileUpload: useKoenigFileUpload,
    fileTypes: koenigFileUploadTypes
};

// Link suggestions aren't needed for this prototype — stub them out.
const noLinks = async () => [];

// Same base editor styles the automations / welcome-email editors use, so the
// CTA card and its settings panel render correctly inside admin-x-settings.
const baseEditorStyles = cn(
    'text-[1.6rem] leading-[1.6] tracking-[-0.01em]',
    'dark:text-white dark:selection:bg-[rgba(88,101,116,0.99)]',
    '[&_.koenig-lexical-editor-input-placeholder]:font-sans! [&_.koenig-lexical-editor-input-placeholder]:text-[1.6rem] [&_.koenig-lexical-editor-input-placeholder]:tracking-tight',
    '[&_.koenig-lexical_input]:text-[1.4rem]',
    '[&_[data-kg-card-selected]]:isolate',
    '[&_:is(p,blockquote,aside,ul,ol)]:tracking-tight',
    '[&_[data-kg-settings-panel]_p]:!mb-0',
    '[&_.koenig-lexical-cta-label_p]:!text-[12.5px]'
);

interface PaywallCardEditorProps {
    platform: Platform;
    audience: Audience;
    initialEditorState?: string;
    onStateChange: (platform: Platform, audience: Audience, state: string) => void;
}

const PaywallCardEditor: React.FC<PaywallCardEditorProps> = ({platform, audience, initialEditorState, onStateChange}) => {
    const editorAPIRef = useRef<KoenigInstance | null>(null);
    // Capture the seed once — the editor owns its state after mount.
    const initialState = useRef(initialEditorState);
    const {unsplashConfig} = useFramework();
    const pinturaConfig = usePinturaConfig();
    const fetchEmbed = useKoenigFetchEmbed();
    const {config, settings, siteData} = useGlobalData();
    const {darkMode} = useDesignSystem();
    const [siteTitle] = getSettingValues<string>(settings, ['title']);
    const tenorConfig = config?.tenor?.googleApiKey ? config.tenor : null;

    const cardConfig = useMemo(() => ({
        unsplash: unsplashConfig,
        pinturaConfig,
        tenor: tenorConfig,
        fetchEmbed,
        fetchAutocompleteLinks: noLinks,
        searchLinks: noLinks,
        feature: {},
        membersEnabled: true,
        stripeEnabled: true,
        siteTitle: siteTitle || 'Your site',
        siteUrl: siteData?.url,
        // Visibility is expressed by each card's audience, so hide the per-card
        // visibility panel.
        visibilitySettings: 'none'
    }), [unsplashConfig, pinturaConfig, tenorConfig, fetchEmbed, siteTitle, siteData]);

    const handleChange = useCallback((data: unknown) => {
        if (data && typeof data === 'object') {
            onStateChange(platform, audience, JSON.stringify(data));
        }
    }, [onStateChange, platform, audience]);

    const registerAPI = useCallback((api: KoenigInstance | null) => {
        editorAPIRef.current = api;
    }, []);

    const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
        if (editorAPIRef.current) {
            focusKoenigEditorOnBottomClick(editorAPIRef.current, event);
        }
    };

    return (
        <div className='koenig-react-editor' onMouseDown={handleMouseDown}>
            <KoenigEditorBase
                cardConfig={cardConfig}
                className={cn('w-full', baseEditorStyles)}
                darkMode={darkMode}
                emojiPicker={false}
                fileUploader={fileUploader}
                inheritFontStyles={false}
                initialEditorState={initialState.current}
                nodes='DEFAULT_NODES'
                registerAPI={registerAPI}
                singleParagraph={false}
                onChange={handleChange}
            >
                {() => null}
            </KoenigEditorBase>
        </div>
    );
};

// The editor owns its own state after mount, so it never needs to re-render from
// the parent (which updates on every keystroke for the live preview).
export default React.memo(PaywallCardEditor, (prev, next) => prev.platform === next.platform && prev.audience === next.audience);
