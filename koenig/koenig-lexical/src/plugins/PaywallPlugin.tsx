import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {$createParagraphNode, $getNodeByKey, $getRoot, $getSelection, $isParagraphNode, $isRangeSelection, COMMAND_PRIORITY_EDITOR} from 'lexical';
import {$createPaywallNode, INSERT_PAYWALL_COMMAND} from '../nodes/PaywallNode';
import {PublicPreviewSuggestion} from '../components/ui/PublicPreviewSuggestion';
import {createPortal} from 'react-dom';
import {getSelectedNode} from '../utils/getSelectedNode';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import type {EditorState, LexicalEditor} from 'lexical';

interface SuggestedPlacement {
    afterIndex: number;
    type: 'inline' | 'short';
}

interface ActiveSuggestion extends SuggestedPlacement {
    nodeKey: string;
}

interface CandidateActivity {
    revealDelay: number;
    revision: number;
    suggestion: ActiveSuggestion | null;
}

function getVisibleContentBounds(element: HTMLElement) {
    const range = document.createRange();
    range.selectNodeContents(element);

    const contentRects = Array.from(range.getClientRects()).filter((rect) => {
        return rect.width > 0 && rect.height > 0;
    });

    if (contentRects.length > 0) {
        return {
            bottom: Math.max(...contentRects.map(rect => rect.bottom)),
            top: Math.min(...contentRects.map(rect => rect.top))
        };
    }

    const elementRect = element.getBoundingClientRect();
    const styles = window.getComputedStyle(element);

    return {
        bottom: elementRect.bottom - (Number.parseFloat(styles.paddingBottom) || 0),
        top: elementRect.top + (Number.parseFloat(styles.paddingTop) || 0)
    };
}

function getSuggestionViewportState(editor: LexicalEditor, editorContainerRef: React.RefObject<HTMLElement | null>, suggestion: ActiveSuggestion) {
    const container = editorContainerRef.current;
    const targetElement = editor.getElementByKey(suggestion.nodeKey);

    if (!container || !targetElement || container.getClientRects().length === 0 || targetElement.getClientRects().length === 0) {
        return null;
    }

    const scrollContainer = container.closest('.gh-koenig-editor');
    const nextElement = targetElement.nextElementSibling instanceof HTMLElement ? targetElement.nextElementSibling : null;

    if (!scrollContainer || !nextElement) {
        return null;
    }

    const editorRect = scrollContainer.getBoundingClientRect();
    const targetContentBottom = getVisibleContentBounds(targetElement).bottom;
    const nextContentTop = getVisibleContentBounds(nextElement).top;
    const splitPosition = targetContentBottom + ((nextContentTop - targetContentBottom) / 2);

    return {
        isVisible: splitPosition >= editorRect.top && splitPosition <= editorRect.bottom,
        scrollContainer
    };
}

export const PaywallPlugin = () => {
    const [editor] = useLexicalComposerContext();
    const {cardConfig, darkMode, editorContainerRef} = React.useContext(KoenigComposerContext);
    const publicPreview = cardConfig?.publicPreview;
    const enableSuggestion = publicPreview?.enableSuggestion === true;
    const getSuggestion = publicPreview?.getSuggestion;
    const [suggestion, setSuggestion] = React.useState<ActiveSuggestion | null>(null);
    const suggestionRef = React.useRef<ActiveSuggestion | null>(null);
    const [candidateActivity, setCandidateActivity] = React.useState<CandidateActivity>({revealDelay: 300, revision: 0, suggestion: null});
    const [isCandidateReady, setIsCandidateReady] = React.useState(false);
    const [renderedSuggestion, setRenderedSuggestion] = React.useState<ActiveSuggestion | null>(null);
    const [isSuggestionVisible, setIsSuggestionVisible] = React.useState(false);
    const [isSuggestionDismissed, setIsSuggestionDismissed] = React.useState(false);
    const [suggestionLayoutRevision, setSuggestionLayoutRevision] = React.useState(0);
    const [suggestionPosition, setSuggestionPosition] = React.useState<{contentWidth: number; left: number; top: number; width: number} | null>(null);

    React.useEffect(() => {
        if (!editor.hasNodes([])) {
            console.error('PaywallPlugin: PaywallNode not registered');
            return;
        }
        return editor.registerCommand(
            INSERT_PAYWALL_COMMAND,
            (payload) => {
                if (payload?.afterNodeKey) {
                    const root = $getRoot();

                    if (root.getChildren().some(node => node.getType() === 'paywall')) {
                        return true;
                    }

                    const targetNode = $getNodeByKey(payload.afterNodeKey);

                    if (targetNode) {
                        const paywallNode = $createPaywallNode();
                        targetNode.insertAfter(paywallNode);

                        if (!paywallNode.getNextSibling()) {
                            paywallNode.insertAfter($createParagraphNode());
                        }

                        paywallNode.selectNext();
                        return true;
                    }

                    return false;
                }

                const selection = $getSelection();

                if (!$isRangeSelection(selection)) {
                    return false;
                }

                const focusNode = selection.focus.getNode();

                if (focusNode !== null) {
                    const paywallNode = $createPaywallNode();

                    // insert a paragraph unless we're already on a blank paragraph
                    const selectedNode = selection.focus.getNode();
                    if ($isParagraphNode(selectedNode) && selectedNode.getTextContent() !== '') {
                        selection.insertParagraph();
                    }

                    // insert the paywall before the current/inserted paragraph
                    // so the cursor stays on the blank paragraph
                    selection.focus
                        .getNode()
                        .getTopLevelElementOrThrow()
                        .insertBefore(paywallNode);
                }

                return true;
            },
            COMMAND_PRIORITY_EDITOR
        );
    }, [editor]);

    // add markdown shortcut '==='
    React.useEffect(() => {
        return editor.registerUpdateListener(() => {
            editor.update(() => {
                // don't do anything when using IME input
                if (editor.isComposing()) {
                    return;
                }

                const selection = $getSelection();
                if (!$isRangeSelection(selection) || !selection.type === 'text' || !selection.isCollapsed()) {
                    return;
                }

                const paywallShortcutRegex = /^(===)\s?$/;
                const node = getSelectedNode(selection).getTopLevelElement();
                if (!node || !$isParagraphNode(node) || !node.getTextContent().match(paywallShortcutRegex)) {
                    return;
                }

                const nativeSelection = window.getSelection();
                const anchorNode = nativeSelection.anchorNode;
                const rootElement = editor.getRootElement();

                if (anchorNode?.nodeType !== Node.TEXT_NODE || !rootElement.contains(anchorNode)) {
                    return;
                }

                const line = $createPaywallNode();
                const parentNode = node.getTopLevelElement();

                if (parentNode.getNextSibling()) {
                    parentNode.replace(line);
                } else {
                    parentNode.insertBefore(line);
                    parentNode.replace($createParagraphNode());
                }

                line.selectNext();
            });
        });
    }, [editor]);

    React.useEffect(() => {
        if (!enableSuggestion || isSuggestionDismissed || typeof getSuggestion !== 'function') {
            suggestionRef.current = null;
            setSuggestion(null);
            setCandidateActivity(currentActivity => ({...currentActivity, revision: currentActivity.revision + 1, suggestion: null}));
            return;
        }

        const updateSuggestion = (editorState: EditorState, revealDelay: number) => {
            const placement: SuggestedPlacement | null = getSuggestion(editorState.toJSON());

            const nextSuggestion: ActiveSuggestion | null = placement ? editorState.read(() => {
                const rootChildren = $getRoot().getChildren();
                const targetNode = rootChildren[Math.min(placement.afterIndex, rootChildren.length - 1)];

                if (!targetNode) {
                    return null;
                }

                return {
                    ...placement,
                    nodeKey: targetNode.getKey()
                };
            }) : null;
            const committedSuggestion = suggestionRef.current;
            const committedNodeExists = committedSuggestion ? editorState.read(() => !!$getNodeByKey(committedSuggestion.nodeKey)) : false;

            if (committedSuggestion && nextSuggestion && committedNodeExists) {
                setSuggestionLayoutRevision(currentRevision => currentRevision + 1);
                return;
            }

            if (committedSuggestion) {
                suggestionRef.current = null;
                setSuggestion(null);
            }

            setCandidateActivity(currentActivity => ({
                revealDelay,
                revision: currentActivity.revision + 1,
                suggestion: nextSuggestion
            }));
        };

        updateSuggestion(editor.getEditorState(), 300);

        return editor.registerUpdateListener(({dirtyElements, dirtyLeaves, editorState}) => {
            if (dirtyElements.size === 0 && dirtyLeaves.size === 0) {
                return;
            }

            updateSuggestion(editorState, 3000);
        });
    }, [editor, enableSuggestion, getSuggestion, isSuggestionDismissed]);

    React.useEffect(() => {
        setIsCandidateReady(false);

        if (!candidateActivity.suggestion || suggestion) {
            return;
        }

        const revealTimer = window.setTimeout(() => {
            setIsCandidateReady(true);
        }, candidateActivity.revealDelay);

        return () => window.clearTimeout(revealTimer);
    }, [candidateActivity, suggestion]);

    React.useEffect(() => {
        const candidateSuggestion = candidateActivity.suggestion;

        if (!isCandidateReady || !candidateSuggestion || suggestion) {
            return;
        }

        const viewportState = getSuggestionViewportState(editor, editorContainerRef, candidateSuggestion);

        if (!viewportState) {
            return;
        }

        let animationFrame: number | null = null;

        const revealIfVisible = () => {
            const currentViewportState = getSuggestionViewportState(editor, editorContainerRef, candidateSuggestion);

            if (currentViewportState?.isVisible) {
                suggestionRef.current = candidateSuggestion;
                setSuggestion(candidateSuggestion);
                setIsCandidateReady(false);
            }
        };

        const scheduleRevealCheck = () => {
            if (animationFrame !== null) {
                return;
            }

            animationFrame = requestAnimationFrame(() => {
                animationFrame = null;
                revealIfVisible();
            });
        };

        revealIfVisible();
        viewportState.scrollContainer.addEventListener('scroll', scheduleRevealCheck, {passive: true});
        window.addEventListener('resize', scheduleRevealCheck);

        return () => {
            if (animationFrame !== null) {
                cancelAnimationFrame(animationFrame);
            }
            viewportState.scrollContainer.removeEventListener('scroll', scheduleRevealCheck);
            window.removeEventListener('resize', scheduleRevealCheck);
        };
    }, [candidateActivity.suggestion, editor, editorContainerRef, isCandidateReady, suggestion]);

    React.useEffect(() => {
        if (suggestion) {
            setRenderedSuggestion(suggestion);
            const animationFrame = requestAnimationFrame(() => setIsSuggestionVisible(true));
            return () => cancelAnimationFrame(animationFrame);
        }

        setIsSuggestionVisible(false);
        const removalTimer = window.setTimeout(() => setRenderedSuggestion(null), 300);
        return () => window.clearTimeout(removalTimer);
    }, [suggestion]);

    React.useLayoutEffect(() => {
        if (!renderedSuggestion) {
            setSuggestionPosition(null);
            return;
        }

        const container = editorContainerRef?.current;
        const targetElement = editor.getElementByKey(renderedSuggestion.nodeKey);

        if (!container || !targetElement) {
            setSuggestionPosition(null);
            return;
        }

        const scrollContainer = container.closest('.gh-koenig-editor');
        if (!scrollContainer) {
            setSuggestionPosition(null);
            return;
        }

        const nextElement = targetElement.nextElementSibling instanceof HTMLElement ? targetElement.nextElementSibling : null;
        let animationFrame: number | null = null;

        const updatePosition = () => {
            if (container.getClientRects().length === 0 || targetElement.getClientRects().length === 0) {
                setSuggestionPosition(null);
                return;
            }

            const targetRect = targetElement.getBoundingClientRect();
            const nextRect = nextElement?.getBoundingClientRect();
            const editorRect = scrollContainer?.getBoundingClientRect() || {
                bottom: window.innerHeight,
                left: 0,
                right: window.innerWidth,
                top: 0
            };
            const maximumSuggestionWidth = 168;
            const minimumSuggestionWidth = 112;
            const gutterGap = 16;
            const editorEdgePadding = 12;
            const left = targetRect.right - editorRect.left + scrollContainer.scrollLeft + gutterGap;
            const targetContentBottom = getVisibleContentBounds(targetElement).bottom;
            const nextContentTop = nextElement && nextRect ? getVisibleContentBounds(nextElement).top : targetRect.bottom + 32;
            const splitPosition = targetContentBottom + ((nextContentTop - targetContentBottom) / 2);
            const top = splitPosition - editorRect.top + scrollContainer.scrollTop - 23;
            const availableWidth = scrollContainer.scrollLeft + scrollContainer.clientWidth - editorEdgePadding - left;
            const width = Math.min(maximumSuggestionWidth, availableWidth);
            const fitsInGutter = width >= minimumSuggestionWidth;
            const contentWidth = targetRect.width;

            setSuggestionPosition((currentPosition) => {
                if (!fitsInGutter) {
                    return null;
                }

                if (currentPosition?.contentWidth === contentWidth && currentPosition?.left === left && currentPosition?.top === top && currentPosition?.width === width) {
                    return currentPosition;
                }

                return {contentWidth, left, top, width};
            });
        };

        const schedulePositionUpdate = () => {
            if (animationFrame !== null) {
                return;
            }

            animationFrame = requestAnimationFrame(() => {
                animationFrame = null;
                updatePosition();
            });
        };

        updatePosition();
        const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedulePositionUpdate);
        resizeObserver?.observe(scrollContainer);
        resizeObserver?.observe(container);
        resizeObserver?.observe(targetElement);
        if (nextElement) {
            resizeObserver?.observe(nextElement);
        }
        window.addEventListener('resize', schedulePositionUpdate);

        return () => {
            if (animationFrame !== null) {
                cancelAnimationFrame(animationFrame);
            }
            resizeObserver?.disconnect();
            window.removeEventListener('resize', schedulePositionUpdate);
        };
    }, [editor, editorContainerRef, renderedSuggestion, suggestionLayoutRevision]);

    const handleAddPreview = React.useCallback(() => {
        if (renderedSuggestion) {
            editor.dispatchCommand(INSERT_PAYWALL_COMMAND, {afterNodeKey: renderedSuggestion.nodeKey});
        }
    }, [editor, renderedSuggestion]);

    const handleDismissSuggestion = React.useCallback(() => {
        setIsSuggestionDismissed(true);
    }, []);

    if (!renderedSuggestion) {
        return null;
    }

    const suggestionElement = (
        <PublicPreviewSuggestion
            contentWidth={suggestionPosition?.contentWidth || 0}
            isVisible={isSuggestionVisible}
            onAdd={handleAddPreview}
            onDismiss={handleDismissSuggestion}
        />
    );

    const portalContainer = editorContainerRef?.current?.closest('.gh-koenig-editor');

    if (!suggestionPosition || !portalContainer) {
        return null;
    }

    return createPortal(
        <div
            style={{left: `${suggestionPosition.left}px`, pointerEvents: 'none', position: 'absolute', top: `${suggestionPosition.top}px`, width: `${suggestionPosition.width}px`, zIndex: 1000}}
        >
            <div className={`koenig-lexical ${darkMode ? 'dark' : ''}`}>
                {suggestionElement}
            </div>
        </div>,
        portalContainer
    );
};

export default PaywallPlugin;
