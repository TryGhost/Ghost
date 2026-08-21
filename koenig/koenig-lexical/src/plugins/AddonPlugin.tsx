import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {$createAddonNode, $isAddonNode, AddonNode, INSERT_ADDON_COMMAND} from '../nodes/AddonNode';
import {$getNodeByKey, COMMAND_PRIORITY_LOW} from 'lexical';
import {INSERT_CARD_COMMAND} from './KoenigBehaviourPlugin';
import {buildAddonNodeData} from '../utils/addon-blocks';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import type {AddonBlockDefinition} from '../utils/addon-blocks';

function createBlockId(config): string {
    return config.createId?.() ?? globalThis.crypto.randomUUID();
}

export const AddonPlugin = () => {
    const [editor] = useLexicalComposerContext();
    const {cardConfig, onError} = React.useContext(KoenigComposerContext);
    const updateRevision = React.useRef(0);

    React.useEffect(() => {
        if (!editor.hasNodes([AddonNode])) {
            throw new Error('AddonPlugin: AddonNode not registered');
        }

        return editor.registerUpdateListener(() => {
            updateRevision.current += 1;
        });
    }, [editor]);

    React.useEffect(() => {
        return editor.registerCommand(
            INSERT_ADDON_COMMAND,
            (definition: AddonBlockDefinition) => {
                const config = cardConfig.addons;
                if (!config?.renderBlock) {
                    return false;
                }

                const props = structuredClone(definition.initialProperties ?? {});
                const id = createBlockId(config);
                const placeholder = $createAddonNode({
                    id,
                    addonHandle: definition.addonHandle,
                    blockName: definition.blockName,
                    label: definition.label,
                    props,
                    html: '<div data-ghost-addon-loading>Loading add-on block…</div>',
                    css: '[data-ghost-addon-loading]{box-sizing:border-box;padding:24px;color:#738a94;font:14px sans-serif}',
                    portableHtml: '<p>Loading add-on block…</p>',
                    resourceOrigins: [],
                    initialHeight: 80
                });
                const placeholderKey = placeholder.getKey();
                editor.dispatchCommand(INSERT_CARD_COMMAND, {cardNode: placeholder});

                const renderPromise = Promise.resolve().then(() => config.renderBlock!({
                    addonHandle: definition.addonHandle,
                    blockName: definition.blockName,
                    props
                }));

                void Promise.resolve().then(async () => {
                    const insertionRevision = updateRevision.current;

                    try {
                        const output = await renderPromise;
                        const dataset = buildAddonNodeData(definition, output, id);
                        const updateOptions = updateRevision.current === insertionRevision ? {tag: 'history-merge'} : undefined;

                        editor.update(() => {
                            const node = $getNodeByKey(placeholderKey);
                            if (!$isAddonNode(node) || node.id !== id) {
                                return;
                            }

                            node.addonHandle = dataset.addonHandle;
                            node.blockName = dataset.blockName;
                            node.label = dataset.label;
                            node.props = structuredClone(dataset.props);
                            node.html = dataset.html;
                            node.css = dataset.css;
                            node.portableHtml = dataset.portableHtml;
                            node.resourceOrigins = [...dataset.resourceOrigins];
                            node.initialHeight = dataset.initialHeight;
                        }, updateOptions);
                    } catch (error) {
                        editor.update(() => {
                            const node = $getNodeByKey(placeholderKey);
                            if ($isAddonNode(node) && node.id === id) {
                                node.remove();
                            }
                        });
                        onError?.(error instanceof Error ? error : new Error(String(error)));
                    }
                });

                return true;
            },
            COMMAND_PRIORITY_LOW
        );
    }, [cardConfig.addons, editor, onError]);

    return null;
};

export default AddonPlugin;
