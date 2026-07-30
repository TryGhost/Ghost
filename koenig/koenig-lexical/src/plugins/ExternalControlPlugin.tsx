import React from 'react';
import {$canShowPlaceholder} from '@lexical/text';
import {$createParagraphNode, $getRoot, $isDecoratorNode} from 'lexical';
import {$createPaywallNode, $isPaywallNode} from '../nodes/PaywallNode';
import {$selectDecoratorNode} from '../utils/$selectDecoratorNode';
import {DRAG_DROP_PASTE} from '@lexical/rich-text';
import {createPortal} from 'react-dom';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

// used to register a minimal API for controlling the editor from the consuming app
// designed to allow typical behaviours without the consuming app needing to bundle the lexical library
export const ExternalControlPlugin = ({registerAPI}) => {
    const [editor] = useLexicalComposerContext();
    // {onChange} while a consumer has paywall placement mode active, else null
    const [placement, setPlacement] = React.useState(null);
    const [layout, setLayout] = React.useState(null);
    const [hoveredGap, setHoveredGap] = React.useState(null);
    // the gate reserves real space above the paywall card (margin on the
    // card's element) so it never covers content; height feeds back from the
    // rendered gate into measure()
    const gateElRef = React.useRef(null);
    const gateHeightRef = React.useRef(0);
    const paywallElRef = React.useRef(null);

    // feed the rendered gate's height back into the reserved margin; the
    // set-if-different guard in measure() makes this converge in one pass.
    // A ResizeObserver on the gate itself catches text-wrap growth (panel
    // typing) the moment it happens.
    React.useLayoutEffect(() => {
        const gateEl = gateElRef.current;
        const height = gateEl?.offsetHeight || 0;

        if (height && Math.abs(height - gateHeightRef.current) > 1) {
            gateHeightRef.current = height;
            measure();
        }

        if (gateEl && typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(() => {
                const h = gateEl.offsetHeight || 0;
                if (h && Math.abs(h - gateHeightRef.current) > 1) {
                    gateHeightRef.current = h;
                    measure();
                }
            });
            observer.observe(gateEl);
            return () => observer.disconnect();
        }
    });

    // never leave a stray margin behind on unmount
    React.useEffect(() => {
        return () => {
            if (paywallElRef.current) {
                paywallElRef.current.style.marginTop = '';
            }
        };
    }, []);

    const readPlacementState = React.useCallback(() => {
        return editor.getEditorState().read(() => {
            let paywallIndex = null;
            let blockCount = 0;

            for (const node of $getRoot().getChildren()) {
                if ($isPaywallNode(node)) {
                    if (paywallIndex === null) {
                        paywallIndex = blockCount;
                    }
                    continue;
                }
                blockCount += 1;
            }

            return {paywallIndex, blockCount};
        });
    }, [editor]);

    const setPaywallAt = React.useCallback((index) => {
        editor.update(() => {
            const root = $getRoot();
            root.getChildren().filter($isPaywallNode).forEach(node => node.remove());

            const children = root.getChildren();
            const paywall = $createPaywallNode();

            if (children.length === 0 || index >= children.length) {
                root.append(paywall);
            } else {
                children[Math.max(index, 0)].insertBefore(paywall);
            }
        }, {discrete: true, tag: 'skip-scroll-into-view'});
    }, [editor]);

    // placement affordances are absolutely-positioned siblings of the
    // contenteditable, measured from the real block elements — the document's
    // DOM stays untouched so Lexical reconciliation can never clobber them
    const measure = React.useCallback(() => {
        if (!placement) {
            setLayout(null);
            return;
        }

        const rootEl = editor.getRootElement();
        const container = rootEl?.parentElement;

        if (!container) {
            setLayout(null);
            return;
        }

        if (getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
        }

        const containerRect = container.getBoundingClientRect();
        const entries = editor.getEditorState().read(() => {
            const list = [];
            let paywallIndex = null;
            let paywallKey = null;
            let blockCount = 0;

            for (const node of $getRoot().getChildren()) {
                if ($isPaywallNode(node)) {
                    if (paywallIndex === null) {
                        paywallIndex = blockCount;
                        paywallKey = node.getKey();
                    }
                    continue;
                }
                blockCount += 1;
                list.push({key: node.getKey(), position: blockCount});
            }

            return {list, paywallIndex, paywallKey, blockCount};
        });

        // reserve the gate's space before measuring anything below it
        const paywallEl = entries.paywallKey ? editor.getElementByKey(entries.paywallKey) : null;

        if (paywallElRef.current && paywallElRef.current !== paywallEl) {
            paywallElRef.current.style.marginTop = '';
        }
        paywallElRef.current = paywallEl;

        if (paywallEl) {
            const desiredMargin = placement.gate ? `${gateHeightRef.current + 24}px` : '';
            if (paywallEl.style.marginTop !== desiredMargin) {
                paywallEl.style.marginTop = desiredMargin;
            }
        }

        const gaps = [];
        let washTop = null;
        let washBottom = null;

        for (const entry of entries.list) {
            const el = editor.getElementByKey(entry.key);

            if (!el) {
                continue;
            }

            const rect = el.getBoundingClientRect();
            const top = rect.top - containerRect.top;
            const bottom = rect.bottom - containerRect.top;

            // a gap after the final block would make the whole post public,
            // and the current cut position already renders the paywall card
            if (entry.position < entries.blockCount && entry.position !== entries.paywallIndex) {
                gaps.push({position: entry.position, top: bottom});
            }

            if (entries.paywallIndex !== null && entry.position > entries.paywallIndex) {
                washTop = washTop === null ? top : washTop;
                washBottom = bottom;
            }
        }

        const isDark = !!container.closest('.dark');
        const wash = washTop === null ? null : {top: washTop, height: Math.max(washBottom - washTop, 0)};

        // above the line: everything above the divider is exactly what an
        // outsider sees — preview, then gate; below stays members-only.
        // Anchored to the block ABOVE the reserved space so that if the gate
        // grows before the margin catches up, it expands downward into the
        // divider area instead of upward into the writer's prose.
        let gateTop = null;
        if (paywallEl) {
            const prevEl = paywallEl.previousElementSibling;
            if (prevEl) {
                gateTop = prevEl.getBoundingClientRect().bottom - containerRect.top + 12;
            } else {
                gateTop = paywallEl.getBoundingClientRect().top - containerRect.top - gateHeightRef.current - 12;
            }
        }

        setLayout({container, gaps, wash, isDark, gateTop});
    }, [editor, placement]);

    React.useEffect(() => {
        if (!placement) {
            setLayout(null);
            if (paywallElRef.current) {
                paywallElRef.current.style.marginTop = '';
                paywallElRef.current = null;
            }
            gateHeightRef.current = 0;
            return;
        }

        measure();

        // host apps (Ghost admin) often run a modal focus trap while placement
        // is active; its document-level focusin capture would yank focus out
        // of the gate's pitch field. A window-level capture listener runs
        // first and shields focus events originating inside the gate.
        const shieldGateFocus = (event) => {
            if (gateElRef.current && gateElRef.current.contains(event.target)) {
                event.stopImmediatePropagation();
            }
        };
        window.addEventListener('focusin', shieldGateFocus, true);

        const removeUpdateListener = editor.registerUpdateListener(() => {
            measure();
        });

        const rootEl = editor.getRootElement();
        let resizeObserver;
        if (rootEl && typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(() => measure());
            resizeObserver.observe(rootEl);
        }

        window.addEventListener('resize', measure);

        return () => {
            removeUpdateListener();
            resizeObserver?.disconnect();
            window.removeEventListener('resize', measure);
            window.removeEventListener('focusin', shieldGateFocus, true);
        };
    }, [editor, placement, measure]);

    React.useEffect(() => {
        if (!registerAPI) {
            return;
        }

        const API = {
            // give access to the editor instance so the Lexical API can be used directly if needed
            editorInstance: editor,
            // simplified API methods for typical consumer app actions
            serialize() {
                return JSON.stringify(editor.getEditorState());
            },
            editorIsEmpty() {
                let isEmpty;
                editor.update(() => {
                    isEmpty = $canShowPlaceholder(false, true);
                });
                return isEmpty;
            },
            focusEditor({position = 'bottom'} = {}) {
                const editorFocusOptions = {
                    defaultSelection: position === 'top' ? 'rootStart' : null
                };

                editor.focus(() => {}, editorFocusOptions);

                if (position === 'top') {
                    // Lexical does not automatically select a decorator node
                    editor.update(() => {
                        const root = $getRoot();
                        const firstChild = root.getFirstChild();

                        if ($isDecoratorNode(firstChild)) {
                            $selectDecoratorNode(firstChild);
                            // selecting a decorator node does not change the
                            // window selection (there's no caret) so we need
                            // to manually move focus to the editor element
                            editor.getRootElement().focus();
                        }
                    });
                }
                if (position === 'bottom') {
                    // Lexical does not automatically select a decorator node
                    editor.update(() => {
                        const root = $getRoot();
                        const lastChild = root.getLastChild();

                        if ($isDecoratorNode(lastChild)) {
                            $selectDecoratorNode(lastChild);
                            // selecting a decorator node does not change the
                            // window selection (there's no caret) so we need
                            // to manually move focus to the editor element
                            editor.getRootElement().focus();
                        } else {
                            lastChild.select();
                        }
                    });
                }
            },
            blurEditor() {
                editor.blur();
            },
            insertParagraphAtTop({focus = true} = {}) {
                editor.update(() => {
                    const paragraphNode = $createParagraphNode();
                    const [firstChild] = $getRoot().getChildren();
                    firstChild.insertBefore(paragraphNode);

                    if (focus) {
                        paragraphNode.selectStart();
                    }
                });
            },
            insertParagraphAtBottom({focus = true} = {}) {
                editor.update(() => {
                    const paragraphNode = $createParagraphNode();
                    $getRoot().append(paragraphNode);

                    if (focus) {
                        paragraphNode.selectStart();
                    }
                });
            },
            insertFiles(files) {
                editor.dispatchCommand(DRAG_DROP_PASTE, files);
            },
            lastNodeIsDecorator() {
                let isDecorator = false;
                editor.getEditorState().read(() => {
                    const nodes = $getRoot().getChildren();
                    const lastNode = nodes[nodes.length - 1];

                    isDecorator = lastNode && $isDecoratorNode(lastNode);
                });
                return isDecorator;
            },
            // block indexes count non-paywall top-level nodes only, so a
            // paywallIndex of N means "N blocks are public" and stays stable
            // across paywall removal/re-insertion
            getContentBlocks() {
                return editor.getEditorState().read(() => {
                    const blocks = [];
                    let paywallIndex = null;

                    for (const node of $getRoot().getChildren()) {
                        if ($isPaywallNode(node)) {
                            if (paywallIndex === null) {
                                paywallIndex = blocks.length;
                            }
                            continue;
                        }

                        const block = {
                            type: node.getType(),
                            isCard: $isDecoratorNode(node),
                            text: node.getTextContent()
                        };

                        // surface media so consumers can render real previews;
                        // each card type keeps its image under a different key
                        const dataset = node.getDataset?.() || {};
                        const src = dataset.src
                            || dataset.thumbnailSrc
                            || dataset.customThumbnailSrc
                            || dataset.backgroundImageSrc
                            || dataset.productImageSrc
                            || (Array.isArray(dataset.images) && dataset.images[0]?.src)
                            || dataset.metadata?.thumbnail
                            || dataset.metadata?.thumbnail_url
                            || null;
                        if (typeof src === 'string' && src) {
                            block.src = src;
                        }

                        blocks.push(block);
                    }

                    return {blocks, paywallIndex};
                });
            },
            // discrete updates commit synchronously so a getContentBlocks()
            // call immediately after reflects the mutation; skip-scroll keeps
            // the (possibly hidden) editor from scrolling its selection into
            // view when the mutation comes from outside the editor
            setPaywallPosition(index) {
                setPaywallAt(index);
            },
            removePaywall() {
                editor.update(() => {
                    $getRoot().getChildren().filter($isPaywallNode).forEach(node => node.remove());
                }, {discrete: true, tag: 'skip-scroll-into-view'});
            },
            // paywall placement mode: renders clickable gap targets between
            // real blocks and a wash over gated content, in the live editor.
            // onChange fires with {paywallIndex, blockCount} after each move.
            // gate: {heading, pitch, buttonText, buttonUrl} renders the
            // assembled gate preview above the paywall card as a read-only
            // reflection of the host's gate settings; the host edits the
            // copy in its own UI and pushes updates via updatePlacementGate
            enterPaywallPlacement({onChange, gate} = {}) {
                setPlacement({onChange, gate});
            },
            // lets the host update locked gate facts (e.g. the audience line
            // after an access change) without re-entering placement
            updatePlacementGate(partial) {
                setPlacement(prev => (prev ? {...prev, gate: {...prev.gate, ...partial}} : prev));
            },
            exitPaywallPlacement() {
                setPlacement(null);
            }
        };

        registerAPI(API);

        return () => {
            registerAPI?.(null);
        };
    }, [editor, registerAPI, setPaywallAt]);

    if (!placement || !layout) {
        return null;
    }

    const accent = '#30cf43';
    const mutedColor = layout.isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)';
    const strongColor = layout.isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)';
    const washBackground = layout.isDark ? 'hsla(0, 0%, 7%, 0.6)' : 'hsla(0, 0%, 100%, 0.65)';
    const gateBackground = layout.isDark ? '#1c1c1c' : '#ffffff';

    return createPortal(
        <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20}} data-kg-paywall-placement>
            {layout.wash && (
                <div
                    style={{position: 'absolute', left: 0, right: 0, top: layout.wash.top, height: layout.wash.height, background: washBackground}}
                    data-kg-placement-wash
                />
            )}
            {placement.gate && layout.gateTop !== null && (
                <div
                    ref={gateElRef}
                    style={{
                        position: 'absolute',
                        top: layout.gateTop,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 'min(480px, 92%)',
                        zIndex: 2,
                        pointerEvents: 'none',
                        background: gateBackground,
                        border: `1px dashed ${layout.isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)'}`,
                        borderRadius: 8,
                        padding: '16px 20px 14px',
                        textAlign: 'center',
                        fontFamily: 'inherit'
                    }}
                    data-kg-placement-gate
                >
                    {/* schematic, not a pixel render: the words are exact, the
                        styling is deliberately neutral because the web gate is
                        drawn by the theme and the email one by the renderer */}
                    <div style={{fontSize: '1.05rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: mutedColor, marginBottom: 10}}>
                        Non-members see this instead
                    </div>
                    <div style={{fontSize: '1.4rem', fontWeight: 600, color: strongColor, marginBottom: 5}} data-kg-gate-heading>
                        {placement.gate.heading || ''}
                    </div>
                    <div style={{fontSize: '1.3rem', lineHeight: 1.5, color: strongColor, marginBottom: 10, minHeight: '1.5em'}} data-kg-gate-pitch>
                        {placement.gate.pitch || ''}
                    </div>
                    <span
                        style={{
                            display: 'inline-block',
                            fontSize: '1.25rem',
                            fontWeight: 500,
                            padding: '5px 16px',
                            borderRadius: 999,
                            border: `1px solid ${layout.isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.28)'}`,
                            color: strongColor
                        }}
                        data-kg-gate-button
                    >
                        {placement.gate.buttonText || ''}
                    </span>
                    <div style={{display: 'none'}} data-kg-gate-url>{placement.gate.buttonUrl || ''}</div>
                </div>
            )}
            {layout.gaps.map(gap => (
                <button
                    key={gap.position}
                    data-kg-placement-gap={gap.position}
                    style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: gap.top - 9,
                        height: 18,
                        pointerEvents: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer'
                    }}
                    type="button"
                    onClick={() => {
                        setPaywallAt(gap.position);
                        placement.onChange?.(readPlacementState());
                    }}
                    onMouseDown={e => e.preventDefault()}
                    onMouseEnter={() => setHoveredGap(gap.position)}
                    onMouseLeave={() => setHoveredGap(null)}
                >
                    <span style={{
                        fontSize: '1.1rem',
                        lineHeight: 1,
                        fontFamily: 'inherit',
                        color: hoveredGap === gap.position ? accent : mutedColor,
                        fontWeight: hoveredGap === gap.position ? 600 : 400
                    }}>
                        &middot;&nbsp;&middot;&nbsp;&middot;&nbsp; end preview here &nbsp;&middot;&nbsp;&middot;&nbsp;&middot;
                    </span>
                </button>
            ))}
        </div>,
        layout.container
    );
};

export default ExternalControlPlugin;
