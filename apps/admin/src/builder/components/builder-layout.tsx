import {useEffect, useRef, useState} from 'react';

import {Button} from '@tryghost/shade/components';
import {Box, Inline} from '@tryghost/shade/primitives';

import type {KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode} from 'react';

export const builderChatWidthStorageKey = 'ghost-builder.chat-panel-width';
const defaultWidth = 420;
const minWidth = 320;
const absoluteMaxWidth = 720;
const minPreviewWidth = 320;
const dividerWidth = 4;
const keyboardStep = 16;
const narrowBreakpoint = 768;

function availableMaxWidth(viewportWidth = window.innerWidth): number {
    return Math.max(minWidth, Math.min(absoluteMaxWidth, viewportWidth - minPreviewWidth - dividerWidth));
}

function clampWidth(value: number, viewportWidth = window.innerWidth): number {
    return Math.min(availableMaxWidth(viewportWidth), Math.max(minWidth, value));
}

function initialWidth(): number {
    const stored = Number(sessionStorage.getItem(builderChatWidthStorageKey));
    return Number.isFinite(stored) && stored > 0 ? clampWidth(stored) : defaultWidth;
}

export const BuilderLayout = ({chat, preview}: {chat: ReactNode; preview: ReactNode}) => {
    const [width, setWidth] = useState(initialWidth);
    const widthRef = useRef(width);
    const preferredWidthRef = useRef(Number(sessionStorage.getItem(builderChatWidthStorageKey)) || defaultWidth);
    const dragRef = useRef<{startX: number; startWidth: number} | null>(null);
    const [isNarrow, setIsNarrow] = useState(() => window.innerWidth < narrowBreakpoint);
    const isNarrowRef = useRef(isNarrow);
    const [activeView, setActiveView] = useState<'chat' | 'preview'>('chat');
    const chatTabRef = useRef<HTMLButtonElement>(null);
    const previewTabRef = useRef<HTMLButtonElement>(null);
    const chatPanelRef = useRef<HTMLElement>(null);
    const previewPanelRef = useRef<HTMLElement>(null);

    const updateWidth = (value: number, persist = false) => {
        const preferred = Math.min(absoluteMaxWidth, Math.max(minWidth, value));
        const next = clampWidth(preferred);
        preferredWidthRef.current = preferred;
        widthRef.current = next;
        setWidth(next);
        if (persist) {
            sessionStorage.setItem(builderChatWidthStorageKey, String(preferred));
        }
    };

    useEffect(() => {
        const handleResize = () => {
            const nextNarrow = window.innerWidth < narrowBreakpoint;
            if (!isNarrowRef.current && nextNarrow) {
                const focused = document.activeElement;
                if (focused && previewPanelRef.current?.contains(focused)) {
                    setActiveView('preview');
                } else {
                    setActiveView('chat');
                }
            }
            isNarrowRef.current = nextNarrow;
            setIsNarrow(nextNarrow);
            const nextWidth = clampWidth(preferredWidthRef.current);
            widthRef.current = nextWidth;
            setWidth(nextWidth);
        };
        const handlePointerMove = (event: PointerEvent) => {
            const drag = dragRef.current;
            if (drag) {
                updateWidth(drag.startWidth + event.clientX - drag.startX);
            }
        };
        const handlePointerUp = () => {
            if (dragRef.current) {
                dragRef.current = null;
                sessionStorage.setItem(builderChatWidthStorageKey, String(widthRef.current));
            }
        };
        window.addEventListener('resize', handleResize);
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, []);

    useEffect(() => {
        chatPanelRef.current?.toggleAttribute('inert', isNarrow && activeView !== 'chat');
        previewPanelRef.current?.toggleAttribute('inert', isNarrow && activeView !== 'preview');
    }, [activeView, isNarrow]);

    const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
        event.currentTarget.setPointerCapture?.(event.pointerId);
        dragRef.current = {startX: event.clientX, startWidth: widthRef.current};
    };

    const resizeWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
        let next: number | undefined;
        if (event.key === 'ArrowLeft') {
            next = widthRef.current - keyboardStep;
        } else if (event.key === 'ArrowRight') {
            next = widthRef.current + keyboardStep;
        } else if (event.key === 'Home') {
            next = minWidth;
        } else if (event.key === 'End') {
            next = availableMaxWidth();
        }
        if (next !== undefined) {
            event.preventDefault();
            updateWidth(next, true);
        }
    };

    const activateView = (view: 'chat' | 'preview', moveFocus = false) => {
        setActiveView(view);
        if (moveFocus) {
            (view === 'chat' ? chatTabRef : previewTabRef).current?.focus();
        }
    };

    const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            activateView(activeView === 'chat' ? 'preview' : 'chat', true);
        } else if (event.key === 'Home') {
            event.preventDefault();
            activateView('chat', true);
        } else if (event.key === 'End') {
            event.preventDefault();
            activateView('preview', true);
        }
    };

    const currentMaxWidth = availableMaxWidth();

    return (
        <Box className='flex min-h-0 flex-1 flex-col bg-background'>
            {isNarrow && (
                <Inline aria-label='Builder view' className='border-b border-border-default bg-surface-elevated p-2' gap='sm' role='tablist'>
                    <Button ref={chatTabRef} aria-controls='builder-chat-panel' aria-selected={activeView === 'chat'} id='builder-chat-tab' role='tab' size='sm' tabIndex={activeView === 'chat' ? 0 : -1} type='button' variant={activeView === 'chat' ? 'default' : 'ghost'} onClick={() => activateView('chat')} onKeyDown={handleTabKeyDown}>Chat</Button>
                    <Button ref={previewTabRef} aria-controls='builder-preview-panel' aria-selected={activeView === 'preview'} id='builder-preview-tab' role='tab' size='sm' tabIndex={activeView === 'preview' ? 0 : -1} type='button' variant={activeView === 'preview' ? 'default' : 'ghost'} onClick={() => activateView('preview')} onKeyDown={handleTabKeyDown}>Preview</Button>
                </Inline>
            )}
            <Box className='relative flex min-h-0 flex-1 overflow-hidden'>
                <section
                    ref={chatPanelRef}
                    aria-hidden={isNarrow ? activeView !== 'chat' : undefined}
                    aria-label='Builder chat'
                    aria-labelledby={isNarrow ? 'builder-chat-tab' : undefined}
                    className={isNarrow ? `absolute inset-0 min-w-0 transition-transform motion-reduce:transition-none ${activeView === 'chat' ? 'translate-x-0' : 'pointer-events-none -translate-x-full'}` : 'min-w-0 shrink-0'}
                    data-testid='builder-chat-panel'
                    id='builder-chat-panel'
                    role={isNarrow ? 'tabpanel' : undefined}
                    style={isNarrow ? undefined : {width: `${width}px`}}
                >
                    {chat}
                </section>
                {!isNarrow && (
                    <div
                        aria-label='Resize chat and preview'
                        aria-orientation='vertical'
                        aria-valuemax={currentMaxWidth}
                        aria-valuemin={minWidth}
                        aria-valuenow={width}
                        className='group relative w-1 shrink-0 cursor-col-resize bg-border-default outline-hidden focus-visible:ring-2 focus-visible:ring-focus-ring'
                        role='separator'
                        tabIndex={0}
                        onKeyDown={resizeWithKeyboard}
                        onPointerDown={startResize}
                    >
                        <span className='absolute inset-y-0 -left-1.5 w-4 group-hover:bg-interactive-hover/50' />
                    </div>
                )}
                <section
                    ref={previewPanelRef}
                    aria-hidden={isNarrow ? activeView !== 'preview' : undefined}
                    aria-label='Builder preview'
                    aria-labelledby={isNarrow ? 'builder-preview-tab' : undefined}
                    className={isNarrow ? `absolute inset-0 min-w-0 transition-transform motion-reduce:transition-none ${activeView === 'preview' ? 'translate-x-0' : 'pointer-events-none translate-x-full'}` : 'min-w-0 flex-1'}
                    data-testid='builder-preview-panel'
                    id='builder-preview-panel'
                    role={isNarrow ? 'tabpanel' : undefined}
                >
                    {preview}
                </section>
            </Box>
        </Box>
    );
};
