import AddonCardIcon from '../assets/icons/kg-card-type-other.svg?react';
import CardContext from '../context/CardContext';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {AddonSettingsRemote} from '../components/AddonSettingsRemote';
import {AddonNode as BaseAddonNode, normalizeAddonHeight, renderAddonEditorPreview} from '@tryghost/kg-default-nodes';
import {SettingsPanel} from '../components/ui/SettingsPanel';
import {createCommand} from 'lexical';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const INSERT_ADDON_COMMAND = createCommand();
export const UPDATE_ADDON_COMMAND = createCommand();

function AddonNodeSettings({dataset, nodeKey}) {
    const [editor] = useLexicalComposerContext();
    const {cardWidth, isEditing} = React.useContext(CardContext);
    const {cardConfig, darkMode, fileUploader, onError} = React.useContext(KoenigComposerContext);
    const imageUploader = fileUploader.useFileUpload('image');
    const [surface, setSurface] = React.useState(null);
    const [status, setStatus] = React.useState('loading');
    const [activated, setActivated] = React.useState(false);
    const propsRef = React.useRef(dataset.props);
    propsRef.current = dataset.props;
    const createSettingsSurfaceRef = React.useRef(cardConfig.addons?.createSettingsSurface);
    createSettingsSurfaceRef.current = cardConfig.addons?.createSettingsSurface;
    const hasSettingsSurface = typeof cardConfig.addons?.createSettingsSurface === 'function';
    const definition = cardConfig.addons?.blocks.find(candidate => candidate.addonHandle === dataset.addonHandle && candidate.blockName === dataset.blockName);
    const uploadRef = React.useRef(imageUploader?.upload);
    uploadRef.current = imageUploader?.upload;

    const onPatch = React.useCallback((patch) => new Promise<void>((resolve, reject) => {
        const handled = editor.dispatchCommand(UPDATE_ADDON_COMMAND, {nodeKey, patch, resolve, reject});
        if (!handled) {
            reject(new Error('Add-on settings patch could not be applied'));
        }
    }), [editor, nodeKey]);

    const uploadImage = React.useCallback(async ({bytes, name, type}) => {
        if (!(bytes instanceof Uint8Array) || typeof name !== 'string' || name.length === 0 || typeof type !== 'string' || !type.startsWith('image/')) {
            throw new Error('Add-on generated images require image bytes, a filename, and an image content type');
        }
        if (typeof uploadRef.current !== 'function') {
            throw new Error('This editor host does not support generated image uploads');
        }
        const file = new File([bytes.slice().buffer], name, {type});
        let result;
        try {
            result = await uploadRef.current([file], {throwOnError: true});
        } catch (error) {
            const uploadError = error && typeof error === 'object' ? error as Record<string, unknown> : {};
            const message = typeof uploadError.context === 'string' && uploadError.context.length > 0
                ? uploadError.context
                : uploadError.message;
            throw new Error(typeof message === 'string' && message.length > 0 ? message : 'Add-on generated image upload failed');
        }
        const url = result?.[0]?.url;
        if (typeof url !== 'string' || url.length === 0) {
            throw new Error('Add-on generated image upload failed');
        }
        return {url};
    }, []);

    React.useEffect(() => {
        if (isEditing && definition?.hasSettings && hasSettingsSurface) {
            setActivated(true);
        }
    }, [definition?.hasSettings, hasSettingsSurface, isEditing]);

    React.useEffect(() => {
        if (!activated || !definition?.hasSettings || !createSettingsSurfaceRef.current) {
            setSurface(null);
            return;
        }

        const nextSurface = createSettingsSurfaceRef.current({
            addonHandle: dataset.addonHandle,
            blockName: dataset.blockName,
            props: structuredClone(propsRef.current),
            onPatch,
            uploadImage
        });
        let cancelled = false;
        setSurface(nextSurface);
        setStatus('loading');
        nextSurface.ready.then(() => {
            if (!cancelled) {
                setStatus('ready');
            }
        }).catch((error) => {
            if (cancelled) {
                return;
            }
            setStatus('error');
            onError?.(error instanceof Error ? error : new Error(String(error)));
        });

        return () => {
            cancelled = true;
            nextSurface.destroy();
        };
    }, [activated, dataset.addonHandle, dataset.blockName, definition?.hasSettings, hasSettingsSurface, onError, onPatch, uploadImage]);

    React.useEffect(() => {
        let cancelled = false;
        if (surface) {
            surface.updateProps(structuredClone(dataset.props)).catch((error) => {
                if (!cancelled) {
                    onError?.(error instanceof Error ? error : new Error(String(error)));
                }
            });
        }
        return () => {
            cancelled = true;
        };
    }, [dataset.props, onError, surface]);

    if (!isEditing || !definition?.hasSettings || !surface) {
        return null;
    }

    return (
        <SettingsPanel cardWidth={cardWidth} darkMode={darkMode}>
            {status === 'loading' && <span className="text-sm text-grey-700">Loading settings…</span>}
            {status === 'error' && <span className="text-sm text-red">Settings failed to load.</span>}
            {status === 'ready' && <AddonSettingsRemote receiver={surface.receiver} />}
        </SettingsPanel>
    );
}

export function AddonNodeComponent({dataset, nodeKey}) {
    const srcDoc = renderAddonEditorPreview(dataset);
    const height = normalizeAddonHeight(dataset.initialHeight);

    return (
        <>
            <div className="relative w-full overflow-hidden" data-kg-addon-preview={dataset.blockName}>
                <iframe
                    className="block w-full border-0"
                    height={height}
                    sandbox=""
                    srcDoc={srcDoc}
                    style={{height: `${height}px`, pointerEvents: 'none'}}
                    tabIndex={-1}
                    title={dataset.label || dataset.blockName}
                />
                <div aria-hidden="true" className="absolute inset-0" />
            </div>
            {nodeKey && <AddonNodeSettings dataset={dataset} nodeKey={nodeKey} />}
        </>
    );
}

export class AddonNode extends BaseAddonNode {
    // The installed manifest contributes the user-facing menu entries. Keeping
    // this empty still marks the one generic node as menu-capable.
    static kgMenu = [];

    constructor(dataset = {}, key?) {
        super(dataset, key);
    }

    getIcon() {
        return AddonCardIcon;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()} wrapperStyle="regular">
                <AddonNodeComponent dataset={this.getDataset()} nodeKey={this.getKey()} />
            </KoenigCardWrapper>
        );
    }
}

export function $createAddonNode(dataset = {}) {
    return new AddonNode(dataset);
}

export function $isAddonNode(node) {
    return node instanceof AddonNode;
}
