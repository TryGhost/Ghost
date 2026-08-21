import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {$createAddonNode, $isAddonNode, AddonNode, INSERT_ADDON_COMMAND, UPDATE_ADDON_COMMAND} from '../nodes/AddonNode';
import {$getNodeByKey, COMMAND_PRIORITY_LOW} from 'lexical';
import {INSERT_CARD_COMMAND} from './KoenigBehaviourPlugin';
import {buildAddonNodeData} from '../utils/addon-blocks';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import type {AddonBlockDefinition} from '../utils/addon-blocks';

function createBlockId(config): string {
    return config.createId?.() ?? globalThis.crypto.randomUUID();
}

function updateAddonNode(node, dataset) {
    node.addonHandle = dataset.addonHandle;
    node.blockName = dataset.blockName;
    node.label = dataset.label;
    node.props = structuredClone(dataset.props);
    node.html = dataset.html;
    node.css = dataset.css;
    node.portableHtml = dataset.portableHtml;
    node.resourceOrigins = [...dataset.resourceOrigins];
    node.hydrate = dataset.hydrate;
    node.initialHeight = dataset.initialHeight;
}

export const AddonPlugin = () => {
    const [editor] = useLexicalComposerContext();
    const {cardConfig, onError} = React.useContext(KoenigComposerContext);
    const updateRevision = React.useRef(0);
    const patchRequests = React.useRef(new Map());

    React.useEffect(() => {
        if (!editor.hasNodes([AddonNode])) {
            throw new Error('AddonPlugin: AddonNode not registered');
        }

        return editor.registerUpdateListener(() => {
            updateRevision.current += 1;
        });
    }, [editor]);

    React.useEffect(() => {
        return mergeRegister(
            editor.registerCommand(
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
                        hydrate: definition.hasHydration === true,
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

                                updateAddonNode(node, dataset);
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
            ),
            editor.registerCommand(
                UPDATE_ADDON_COMMAND,
                ({nodeKey, patch, resolve, reject}) => {
                    const config = cardConfig.addons;
                    const node = $getNodeByKey(nodeKey);
                    if (!config?.renderBlock || !$isAddonNode(node) || !patch || typeof patch !== 'object' || Array.isArray(patch)) {
                        return false;
                    }
                    const definition = config.blocks.find(candidate => candidate.addonHandle === node.addonHandle && candidate.blockName === node.blockName);
                    if (!definition) {
                        return false;
                    }

                    const previousRequest = patchRequests.current.get(nodeKey);
                    const baseProps = structuredClone(node.props);
                    const nodeId = node.id;
                    const addonHandle = node.addonHandle;
                    const blockName = node.blockName;
                    const nextProps = {
                        ...(previousRequest?.id === nodeId ? previousRequest.props : baseProps),
                        ...structuredClone(patch)
                    };
                    const revision = (previousRequest?.revision ?? 0) + 1;
                    const request = {
                        id: nodeId,
                        revision,
                        props: nextProps,
                        baseProps: JSON.stringify(baseProps)
                    };
                    patchRequests.current.set(nodeKey, request);

                    void Promise.resolve().then(() => config.renderBlock!({
                        addonHandle,
                        blockName,
                        props: nextProps
                    })).then((output) => {
                        const dataset = buildAddonNodeData({...definition, initialProperties: nextProps}, output, nodeId);
                        editor.update(() => {
                            const currentRequest = patchRequests.current.get(nodeKey);
                            const currentNode = $getNodeByKey(nodeKey);
                            if (currentRequest?.revision !== revision || !$isAddonNode(currentNode) || currentNode.id !== request.id || JSON.stringify(currentNode.props) !== request.baseProps) {
                                if (currentRequest?.revision === revision) {
                                    patchRequests.current.delete(nodeKey);
                                }
                                resolve?.();
                                return;
                            }
                            updateAddonNode(currentNode, dataset);
                            patchRequests.current.delete(nodeKey);
                            resolve?.();
                        });
                    }).catch((error) => {
                        if (patchRequests.current.get(nodeKey)?.revision === revision) {
                            patchRequests.current.delete(nodeKey);
                            onError?.(error instanceof Error ? error : new Error(String(error)));
                            reject?.(error);
                        } else {
                            resolve?.();
                        }
                    });

                    return true;
                },
                COMMAND_PRIORITY_LOW
            )
        );
    }, [cardConfig.addons, editor, onError]);

    return null;
};

export default AddonPlugin;
