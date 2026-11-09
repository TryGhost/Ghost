import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {AppCardSettingsRemote} from '../components/AppCardSettingsRemote';
import {CardSettingsPanel} from '../components/CardSettingsPanel';
import {EDIT_CARD_COMMAND} from '../plugins/KoenigBehaviourPlugin';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {UPDATE_APP_CARD_COMMAND} from './AppNode';
import {normaliseAppCardHeight, renderAppCardDocument} from '@tryghost/kg-default-nodes';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import type {AppCardProperties, AppCardSettingsSession, AppCardsConfig} from '../utils/app-cards';

interface AppNodeComponentProps {
    nodeKey: string;
    appId: string;
    card: string;
    properties: AppCardProperties;
    html: string;
    css: string;
    height: number;
}

function useAppCards(): AppCardsConfig | undefined {
    const {cardConfig} = React.useContext(KoenigComposerContext);
    return cardConfig.appCards as AppCardsConfig | undefined;
}

// The card's settings, drawn by Koenig from what the app's settings code
// describes in its sandbox. The sandbox lives while the panel is open.
function AppCardSettings({nodeKey, appId, card, properties}: Omit<AppNodeComponentProps, 'html' | 'css' | 'height'>) {
    const [editor] = useLexicalComposerContext();
    const appCards = useAppCards();
    const {fileUploader, onError} = React.useContext(KoenigComposerContext);
    const imageUploader = fileUploader.useFileUpload('image');
    const [session, setSession] = React.useState<AppCardSettingsSession | null>(null);
    const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading');
    const propertiesRef = React.useRef(properties);
    propertiesRef.current = properties;
    const uploadRef = React.useRef(imageUploader.upload);
    uploadRef.current = imageUploader.upload;
    const openSettings = appCards?.openSettings;

    React.useEffect(() => {
        if (!openSettings) {
            return;
        }
        let cancelled = false;
        let opened: AppCardSettingsSession | null = null;
        setStatus('loading');
        openSettings({
            appId,
            card,
            properties: structuredClone(propertiesRef.current),
            propose: patch => new Promise<void>((resolve, reject) => {
                const handled = editor.dispatchCommand(UPDATE_APP_CARD_COMMAND, {nodeKey, patch, resolve, reject});
                if (!handled) {
                    reject(new Error('The card could not be updated'));
                }
            }),
            async uploadImage(file) {
                const result = await uploadRef.current([file]) as {url?: string}[] | null;
                const url = result?.[0]?.url;
                if (typeof url !== 'string' || !url) {
                    throw new Error('The image could not be uploaded');
                }
                return {url};
            }
        }).then((next) => {
            if (cancelled) {
                next?.dispose();
                return;
            }
            opened = next;
            setSession(next);
            setStatus(next ? 'ready' : 'error');
        }).catch((error) => {
            if (!cancelled) {
                setStatus('error');
                onError?.(error instanceof Error ? error : new Error(String(error)));
            }
        });
        return () => {
            cancelled = true;
            opened?.dispose();
            setSession(null);
        };
    }, [appId, card, editor, nodeKey, onError, openSettings]);

    // An undo, or another proposal applied, tells the panel what the card holds now.
    React.useEffect(() => {
        session?.propertiesChanged(structuredClone(properties));
    }, [properties, session]);

    return (
        <div className="flex max-h-[70vh] min-w-0 flex-col gap-3 overflow-y-auto">
            {status === 'loading' && <span className="text-sm text-grey-700">Loading settings…</span>}
            {status === 'error' && <span className="text-sm text-red">This card’s settings couldn’t load.</span>}
            {status === 'ready' && session && <AppCardSettingsRemote receiver={session.receiver} />}
        </div>
    );
}

// A saved card whose app isn't installed any more, or no longer offers it. Its
// data stays in the post, so reinstalling the app brings it back.
function UnavailableCard() {
    return (
        <div className="flex flex-col gap-1 rounded-lg border border-dashed border-grey-300 px-6 py-5 font-sans text-sm text-grey-700 dark:border-grey-800" data-testid="app-card-unavailable">
            <strong className="font-semibold text-grey-900 dark:text-grey-200">This card’s app isn’t available</strong>
            <span>It stays in the post, but won’t show on the site or in emails until the app is installed again.</span>
        </div>
    );
}

export function AppNodeComponent({nodeKey, appId, card, properties, html, css, height}: AppNodeComponentProps) {
    const [editor] = useLexicalComposerContext();
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const cardContext = React.useContext(CardContext);
    const appCards = useAppCards();
    const definition = appCards?.definition(appId, card);
    const iframeRef = React.useRef<HTMLIFrameElement>(null);
    const [frameHeight, setFrameHeight] = React.useState(() => normaliseAppCardHeight(height));
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    React.useEffect(() => {
        setFrameHeight(normaliseAppCardHeight(height));
    }, [height, html]);

    // The snapshot's frame reports its height; nothing else it says is acted on in the editor.
    React.useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            const message = event.data as {type?: unknown; height?: unknown} | null;
            if (event.source !== iframeRef.current?.contentWindow || message?.type !== 'ghost-app-card:resize') {
                return;
            }
            const requested = Number(message.height);
            if (Number.isFinite(requested)) {
                setFrameHeight(normaliseAppCardHeight(Math.ceil(requested)));
            }
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, []);

    const srcDoc = React.useMemo(() => {
        if (!definition || !html) {
            return '';
        }
        return renderAppCardDocument({
            html,
            css,
            title: definition.label,
            imageOrigins: definition.imageOrigins,
            mediaOrigins: definition.mediaOrigins,
            fontFamily: typeof window !== 'undefined' ? window.getComputedStyle(document.body).fontFamily : undefined
        });
    }, [css, definition, html]);

    if (!definition) {
        return <UnavailableCard />;
    }

    const handleToolbarEdit = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey, focusEditor: false});
    };

    return (
        <>
            <div className="relative w-full overflow-hidden" data-kg-app-card={`${appId}/${card}`}>
                <iframe
                    ref={iframeRef}
                    className="block w-full border-0"
                    height={frameHeight}
                    sandbox="allow-scripts"
                    srcDoc={srcDoc}
                    style={{height: `${frameHeight}px`, pointerEvents: 'none'}}
                    tabIndex={-1}
                    title={definition.label}
                />
                {/* Clicks select and edit the card, never reach its content. */}
                <div aria-hidden="true" className="absolute inset-0" />
            </div>

            <ActionToolbar
                data-kg-card-toolbar="app"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="app"
                isVisible={cardContext.isSelected && !showSnippetToolbar && !cardContext.isEditing}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem
                        dataTestId="edit-app-card"
                        hide={!definition.hasSettings}
                        icon="edit"
                        isActive={false}
                        label="Edit"
                        onClick={handleToolbarEdit}
                    />
                    <ToolbarMenuSeparator hide={!definition.hasSettings || !cardConfig.createSnippet} />
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

            <CardSettingsPanel
                tabs={definition.hasSettings ? [{
                    id: 'settings',
                    label: definition.label,
                    content: <AppCardSettings appId={appId} card={card} nodeKey={nodeKey} properties={properties} />
                }] : []}
            />
        </>
    );
}
