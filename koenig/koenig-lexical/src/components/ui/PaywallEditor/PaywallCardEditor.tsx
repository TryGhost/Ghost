import KoenigComposableEditor from '../../KoenigComposableEditor';
import KoenigComposer from '../../KoenigComposer';
import React from 'react';
import clsx from 'clsx';
import {type Audience, type Platform} from './paywall-data';

// Minimal file-upload stub — the paywall CTA card is text/button only in this
// prototype, so uploads aren't wired up.
const noopUpload = () => ({progress: 100, isLoading: false, errors: [], filesNumber: 0, upload: async () => []});
const fileUploader = {useFileUpload: noopUpload, fileTypes: {}};

// Same base editor styles Settings applies to its paywall CTA cards, so the
// card + its settings panel render identically here.
const baseEditorStyles = clsx(
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
    siteTitle?: string;
    darkMode?: boolean;
    onStateChange: (platform: Platform, audience: Audience, state: string) => void;
}

// A single, self-contained Koenig Call to Action card editor. Each paywall
// permutation (platform + audience) is one of these.
const PaywallCardEditor: React.FC<PaywallCardEditorProps> = ({platform, audience, initialEditorState, siteTitle, darkMode, onStateChange}) => {
    // Capture the seed once — the editor owns its state after mount.
    const initialState = React.useRef(initialEditorState);

    const cardConfig = React.useMemo(() => ({
        feature: {},
        membersEnabled: true,
        stripeEnabled: true,
        siteTitle: siteTitle || 'Your site',
        // Audience is expressed by the card's position in the stack, so hide the
        // per-card visibility panel.
        visibilitySettings: 'none'
    }), [siteTitle]);

    const handleChange = React.useCallback((json: unknown) => {
        if (json && typeof json === 'object') {
            onStateChange(platform, audience, JSON.stringify(json));
        }
    }, [onStateChange, platform, audience]);

    return (
        <div className={clsx('koenig-react-editor', baseEditorStyles)}>
            <KoenigComposer
                cardConfig={cardConfig}
                darkMode={darkMode}
                fileUploader={fileUploader}
                initialEditorState={initialState.current}
            >
                <KoenigComposableEditor
                    isDragEnabled={false}
                    onChange={handleChange}
                />
            </KoenigComposer>
        </div>
    );
};

// The editor owns its own state after mount, so it never needs to re-render from
// the parent (which updates on every keystroke for the live preview).
export default React.memo(PaywallCardEditor, (prev, next) => prev.platform === next.platform && prev.audience === next.audience);
