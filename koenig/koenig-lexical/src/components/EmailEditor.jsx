import '../styles/index.css';
import BookmarkPlugin from '../plugins/BookmarkPlugin';
import ButtonPlugin from '../plugins/ButtonPlugin';
import CallToActionPlugin from '../plugins/CallToActionPlugin';
import CalloutPlugin from '../plugins/CalloutPlugin';
import CardMenuPlugin from '../plugins/CardMenuPlugin';
import EMAIL_EDITOR_NODES from '../nodes/EmailEditorNodes';
import EmEnDashPlugin from '../plugins/EmEnDashPlugin';
import EmailCtaPlugin from '../plugins/EmailCtaPlugin';
import EmbedPlugin from '../plugins/EmbedPlugin';
import EmojiPickerPlugin from '../plugins/EmojiPickerPlugin';
import HorizontalRulePlugin from '../plugins/HorizontalRulePlugin';
import HtmlPlugin from '../plugins/HtmlPlugin';
import ImagePlugin from '../plugins/ImagePlugin';
import KoenigComposableEditor from './KoenigComposableEditor';
import KoenigComposer from './KoenigComposer';
import KoenigSelectorPlugin from '../plugins/KoenigSelectorPlugin';
import KoenigSnippetPlugin from '../plugins/KoenigSnippetPlugin';
import ProductPlugin from '../plugins/ProductPlugin';
import ReplacementStringsPlugin from '../plugins/ReplacementStringsPlugin';
import TransistorPlugin from '../plugins/TransistorPlugin';
import {EMAIL_TRANSFORMERS} from '../plugins/MarkdownShortcutPlugin';
import {ListPlugin} from '@lexical/react/LexicalListPlugin';
import {SharedHistoryContext} from '../context/SharedHistoryContext';
import {SharedOnChangeContext} from '../context/SharedOnChangeContext';
import {VISIBILITY_SETTINGS} from '../utils/visibility';

export const EMAIL_EDITOR_CARD_CONFIG = {
    image: {
        allowedWidths: ['regular']
    },
    visibilitySettings: VISIBILITY_SETTINGS.EMAIL_ONLY
};

const ALLOWED_EMAIL_EDITOR_VISIBILITY = [
    VISIBILITY_SETTINGS.EMAIL_ONLY,
    VISIBILITY_SETTINGS.NONE
];

export function getEmailEditorCardConfig(cardConfig = {}) {
    const visibilitySettings = ALLOWED_EMAIL_EDITOR_VISIBILITY.includes(cardConfig.visibilitySettings)
        ? cardConfig.visibilitySettings
        : EMAIL_EDITOR_CARD_CONFIG.visibilitySettings;

    return {
        ...cardConfig,
        image: {
            ...cardConfig.image,
            ...EMAIL_EDITOR_CARD_CONFIG.image
        },
        visibilitySettings
    };
}

const EmailEditor = ({
    cardConfig = {},
    darkMode = false,
    fileUploader,
    initialEditorState,
    onChange,
    onError,
    children,
    markdownTransformers = EMAIL_TRANSFORMERS,
    placeholderText = 'Begin writing your email...',
    ...props
}) => {
    const mergedCardConfig = getEmailEditorCardConfig(cardConfig);

    return (
        <KoenigComposer
            cardConfig={mergedCardConfig}
            darkMode={darkMode}
            fileUploader={fileUploader}
            initialEditorState={initialEditorState}
            nodes={EMAIL_EDITOR_NODES}
            onError={onError}
        >
            <SharedHistoryContext>
                <SharedOnChangeContext onChange={onChange}>
                    <KoenigComposableEditor
                        {...props}
                        markdownTransformers={markdownTransformers}
                        placeholderText={placeholderText}
                    >
                        <BookmarkPlugin />
                        <ButtonPlugin />
                        <CalloutPlugin />
                        <CallToActionPlugin />
                        <CardMenuPlugin />
                        <EmbedPlugin />
                        <EmailCtaPlugin />
                        <EmEnDashPlugin />
                        <EmojiPickerPlugin />
                        <HorizontalRulePlugin />
                        <HtmlPlugin />
                        <ImagePlugin />
                        <KoenigSelectorPlugin />
                        <KoenigSnippetPlugin />
                        <ListPlugin />
                        <ProductPlugin />
                        <ReplacementStringsPlugin />
                        <TransistorPlugin />
                        {children}
                    </KoenigComposableEditor>
                </SharedOnChangeContext>
            </SharedHistoryContext>
        </KoenigComposer>
    );
};

export default EmailEditor;
