import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {$createAppNode, $isAppNode, AppNode, INSERT_APP_CARD_COMMAND, UPDATE_APP_CARD_COMMAND} from '../nodes/AppNode';
import {$getNodeByKey, COMMAND_PRIORITY_LOW} from 'lexical';
import {INSERT_CARD_COMMAND} from './KoenigBehaviourPlugin';
import {isValidAppCard} from '@tryghost/kg-default-nodes';
import {mergeRegister} from '@lexical/utils';
import {snapshotFromOutput} from '../utils/app-cards';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import type {AppCardProperties, AppCardSnapshot, AppCardsConfig} from '../utils/app-cards';

const LOADING: AppCardSnapshot = {
    html: '<div style="padding:24px;color:#738a94;font:14px sans-serif">Loading card…</div>',
    css: '',
    height: 72,
    emailHtml: '',
    publicProperties: []
};

const FAILED: AppCardSnapshot = {
    html: '<div role="alert" style="box-sizing:border-box;display:grid;gap:6px;padding:20px;border:1px solid #f2b8b5;border-radius:8px;background:#fff7f6;color:#3b1d1b;font:14px sans-serif"><strong>This card couldn’t be rendered</strong><span>Remove it and try inserting it again.</span></div>',
    css: '',
    height: 96,
    emailHtml: '',
    publicProperties: []
};

// Properties and the snapshot rendered from them are only ever written together.
function applySnapshot(node: AppNode, properties: AppCardProperties, snapshot: AppCardSnapshot) {
    node.properties = structuredClone(properties);
    node.publicProperties = [...snapshot.publicProperties];
    node.html = snapshot.html;
    node.css = snapshot.css;
    node.height = snapshot.height;
    node.emailHtml = snapshot.emailHtml;
}

function checkedSnapshot(appId: string, card: string, properties: AppCardProperties, snapshot: AppCardSnapshot) {
    if (!isValidAppCard({appId, card, properties, ...snapshot})) {
        throw new Error('The card’s app returned something Ghost can’t save');
    }
    return snapshot;
}

interface PendingUpdate {
    revision: number;
    properties: AppCardProperties;
    // what the node held when the render started; a render for older properties is dropped
    base: string;
}

export const AppCardPlugin = () => {
    const [editor] = useLexicalComposerContext();
    const {cardConfig, onError} = React.useContext(KoenigComposerContext);
    const appCards = cardConfig.appCards as AppCardsConfig | undefined;
    const updateRevision = React.useRef(0);
    const pending = React.useRef(new Map<string, PendingUpdate>());
    const nextRevision = React.useRef(0);
    // Insert renders skipped because a proposal was rendering, by card.
    const initial = React.useRef(new Map<string, AppCardSnapshot>());

    React.useEffect(() => {
        if (!editor.hasNodes([AppNode])) {
            throw new Error('AppCardPlugin: AppNode not registered');
        }
        return editor.registerUpdateListener(() => {
            updateRevision.current += 1;
        });
    }, [editor]);

    React.useEffect(() => {
        if (!appCards) {
            return;
        }
        const report = (error: unknown) => onError?.(error instanceof Error ? error : new Error(String(error)));
        // The insert's first render only lands on a card nobody has configured yet: a proposal
        // that finished first, or one still rendering, wins.
        const isUntouchedPlaceholder = (node: unknown): node is AppNode => $isAppNode(node)
            && !pending.current.has(node.getKey())
            && Object.keys(node.properties).length === 0;

        return mergeRegister(
            editor.registerCommand(
                INSERT_APP_CARD_COMMAND,
                ({appId, card}) => {
                    if (!appCards.definition(appId, card)) {
                        return false;
                    }
                    const properties: AppCardProperties = {};
                    const placeholder = $createAppNode({appId, card, properties, ...LOADING});
                    const placeholderKey = placeholder.getKey();
                    editor.dispatchCommand(INSERT_CARD_COMMAND, {cardNode: placeholder, openInEditMode: true});
                    const insertedAt = updateRevision.current;

                    appCards.render(appId, card, properties).then((output) => {
                        const snapshot = checkedSnapshot(appId, card, properties, snapshotFromOutput(output));
                        // Folded into the insert's history entry, unless the author did something since.
                        const options = updateRevision.current <= insertedAt + 1 ? {tag: 'history-merge'} : undefined;
                        editor.update(() => {
                            const node = $getNodeByKey(placeholderKey);
                            if (isUntouchedPlaceholder(node)) {
                                applySnapshot(node, properties, snapshot);
                            } else if ($isAppNode(node) && pending.current.has(placeholderKey)) {
                                // A proposal is rendering; if it fails, the card falls back to this.
                                initial.current.set(placeholderKey, snapshot);
                            }
                        }, options);
                    }).catch((error) => {
                        editor.update(() => {
                            const node = $getNodeByKey(placeholderKey);
                            if (isUntouchedPlaceholder(node)) {
                                applySnapshot(node, properties, FAILED);
                            }
                        }, {tag: 'history-merge'});
                        report(error);
                    });
                    return true;
                },
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                UPDATE_APP_CARD_COMMAND,
                ({nodeKey, patch, resolve, reject}) => {
                    const node = $getNodeByKey(nodeKey);
                    if (!$isAppNode(node) || !appCards.definition(node.appId, node.card)) {
                        return false;
                    }
                    const {appId, card} = node;
                    const current = structuredClone(node.properties) as AppCardProperties;
                    const previous = pending.current.get(nodeKey);
                    // Quick proposals build on each other, not on what's saved.
                    const properties = {...(previous?.properties ?? current), ...structuredClone(patch)};
                    // Never reused, so a slow render can't pass for a newer one.
                    nextRevision.current += 1;
                    const revision = nextRevision.current;
                    const request: PendingUpdate = {revision, properties, base: JSON.stringify(current)};
                    pending.current.set(nodeKey, request);

                    appCards.render(appId, card, properties).then((output) => {
                        const snapshot = checkedSnapshot(appId, card, properties, snapshotFromOutput(output));
                        editor.update(() => {
                            const latest = pending.current.get(nodeKey);
                            const target = $getNodeByKey(nodeKey);
                            // A newer proposal, an undo or a change elsewhere wins over this render.
                            if (latest?.revision !== revision || !$isAppNode(target) || JSON.stringify(target.properties) !== request.base) {
                                if (latest?.revision === revision) {
                                    pending.current.delete(nodeKey);
                                }
                                return;
                            }
                            applySnapshot(target, properties, snapshot);
                            pending.current.delete(nodeKey);
                            initial.current.delete(nodeKey);
                        });
                        resolve?.();
                    }).catch((error) => {
                        if (pending.current.get(nodeKey)?.revision === revision) {
                            pending.current.delete(nodeKey);
                            // A card still showing its loading snapshot never keeps it: it gets the
                            // insert's own render if that finished, or the failed state.
                            editor.update(() => {
                                const target = $getNodeByKey(nodeKey);
                                if ($isAppNode(target) && target.html === LOADING.html) {
                                    applySnapshot(target, {}, initial.current.get(nodeKey) ?? FAILED);
                                }
                                initial.current.delete(nodeKey);
                            }, {tag: 'history-merge'});
                            report(error);
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
    }, [appCards, editor, onError]);

    return null;
};

export default AppCardPlugin;
