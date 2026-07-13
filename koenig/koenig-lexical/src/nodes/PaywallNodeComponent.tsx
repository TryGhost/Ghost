import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext.jsx';
import Portal from '../components/ui/Portal';
import React from 'react';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar.jsx';
import {DEFAULT_CONFIG, type PaywallConfig, extractCtaNode} from '../components/ui/PaywallEditor/paywall-data';
import {PaywallCard} from '../components/ui/cards/PaywallCard';
import {PaywallEditorModal} from '../components/ui/PaywallEditor/PaywallEditorModal';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu.jsx';
import {getAccentColor} from '../utils/getAccentColor';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

// Merge a persisted PaywallConfig JSON string over the defaults so every
// permutation is present.
const parseConfig = (raw): PaywallConfig => {
    if (!raw) {
        return DEFAULT_CONFIG;
    }
    try {
        const parsed = JSON.parse(raw);
        return {
            web: {...DEFAULT_CONFIG.web, ...parsed.web},
            email: {...DEFAULT_CONFIG.email, ...parsed.email}
        };
    } catch {
        return DEFAULT_CONFIG;
    }
};

// The in-post card previews the `web:public` permutation (what a public visitor
// sees) — derived from that card's CTA node.
const derivePreview = (config: PaywallConfig) => {
    const cta = extractCtaNode(config.web?.public) || ({} as Record<string, unknown>);
    return {
        body: (cta.textValue as string) || '',
        buttonText: (cta.buttonText as string) || 'Subscribe',
        buttonUrl: (cta.buttonUrl as string) || '',
        showButton: cta.showButton !== false,
        backgroundColor: (cta.backgroundColor as string) || 'grey',
        buttonColor: (cta.buttonColor as string) || 'accent',
        buttonTextColor: (cta.buttonTextColor as string) || '#ffffff',
        linkColor: (cta.linkColor as string) || 'text',
        alignment: (cta.alignment as string) || 'left'
    };
};

export const PaywallNodeComponent = ({nodeKey, config}) => {
    const [editor] = useLexicalComposerContext();
    const {isSelected} = React.useContext(CardContext);
    const {cardConfig, darkMode} = React.useContext(KoenigComposerContext);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);
    const [modalOpen, setModalOpen] = React.useState(false);

    const configRef = React.useRef(parseConfig(config));
    const [preview, setPreview] = React.useState(() => derivePreview(configRef.current));

    const openModal = (event) => {
        event?.preventDefault();
        event?.stopPropagation();
        setModalOpen(true);
    };

    const handleSave = (nextConfig: PaywallConfig) => {
        configRef.current = nextConfig;
        setPreview(derivePreview(nextConfig));
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.variants = JSON.stringify(nextConfig);
        });
    };

    return (
        <>
            {/* In-post card: static, read-only preview of the public CTA. */}
            <PaywallCard
                alignment={preview.alignment}
                buttonColor={preview.buttonColor}
                buttonText={preview.buttonText}
                buttonTextColor={preview.buttonTextColor}
                buttonUrl={preview.buttonUrl}
                color={preview.backgroundColor}
                isEditing={false}
                linkColor={preview.linkColor}
                previewBody={preview.body}
                previewHeading=''
                showButton={preview.showButton}
                staticPreview={true}
            />

            <ActionToolbar
                data-kg-card-toolbar="paywall"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="paywall"
                isVisible={isSelected && !modalOpen && !showSnippetToolbar}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem dataTestId="edit-paywall-card" icon="edit" isActive={false} label="Edit" onClick={openModal} />
                    <ToolbarMenuSeparator hide={!cardConfig.createSnippet} />
                    <ToolbarMenuItem
                        dataTestId="create-snippet"
                        hide={!cardConfig.createSnippet}
                        icon="snippet"
                        isActive={false}
                        label="Save as snippet"
                        onClick={() => setShowSnippetToolbar(true)}
                    />
                </ToolbarMenu>
            </ActionToolbar>

            {modalOpen && (
                <Portal>
                    <PaywallEditorModal
                        accentColor={getAccentColor()}
                        darkMode={darkMode}
                        initialConfig={configRef.current}
                        scope="post"
                        siteTitle={cardConfig?.siteTitle || 'Your site'}
                        onClose={() => setModalOpen(false)}
                        onSave={handleSave}
                    />
                </Portal>
            )}
        </>
    );
};
