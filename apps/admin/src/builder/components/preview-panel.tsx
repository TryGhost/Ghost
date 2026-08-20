import {useEffect, useState} from 'react';

import {Button} from '@tryghost/shade/components';
import {Inline} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';

import {WebPreview, WebPreviewBody, WebPreviewNavigation, WebPreviewNavigationButton, WebPreviewUrl} from './ai-elements/web-preview';

import type {FormEvent, ReactNode, Ref} from 'react';

export type PreviewInteractionMode = 'browse' | 'select' | 'edit';

export const PreviewPanel = ({children, url = '', canGoBack = false, canGoForward = false, mode = 'browse', editButtonRef, disabled = false, onBack, onForward, onNavigate, onSetMode}: {
    children: ReactNode;
    url?: string;
    canGoBack?: boolean;
    canGoForward?: boolean;
    mode?: PreviewInteractionMode;
    editButtonRef?: Ref<HTMLButtonElement>;
    disabled?: boolean;
    onBack?: () => void;
    onForward?: () => void;
    onNavigate?: (url: string) => void | Promise<boolean>;
    onSetMode?: (mode: PreviewInteractionMode) => void;
}) => {
    const [address, setAddress] = useState(url);

    useEffect(() => setAddress(url), [url]);

    const submitAddress = (event: FormEvent) => {
        event.preventDefault();
        const target = address.trim();
        if (target && target !== url) {
            void Promise.resolve(onNavigate?.(target)).then((navigated) => {
                if (navigated === false) {
                    setAddress(url);
                }
            });
        }
    };

    return (
        <WebPreview>
            <WebPreviewNavigation aria-label='Preview controls'>
                <WebPreviewNavigationButton aria-label='Back in preview' disabled={disabled || !canGoBack} onClick={onBack}>
                    <LucideIcon.ArrowLeft aria-hidden='true' />
                </WebPreviewNavigationButton>
                <WebPreviewNavigationButton aria-label='Forward in preview' disabled={disabled || !canGoForward} onClick={onForward}>
                    <LucideIcon.ArrowRight aria-hidden='true' />
                </WebPreviewNavigationButton>
                <form className='min-w-0 flex-1' onSubmit={submitAddress}>
                    <WebPreviewUrl aria-label='Preview address' disabled={disabled} value={address} onChange={event => setAddress(event.target.value)} />
                </form>
                {onSetMode && (
                    <Inline align='center' gap='xs'>
                        <Button
                            aria-label='Select preview content'
                            aria-pressed={mode === 'select'}
                            disabled={disabled}
                            size='sm'
                            type='button'
                            variant={mode === 'select' ? 'default' : 'ghost'}
                            onClick={() => onSetMode(mode === 'select' ? 'browse' : 'select')}
                        >
                            <LucideIcon.MousePointer2 aria-hidden='true' />
                            Select
                        </Button>
                        <Button
                            ref={editButtonRef}
                            aria-label='Edit preview'
                            aria-pressed={mode === 'edit'}
                            disabled={disabled}
                            size='sm'
                            type='button'
                            variant={mode === 'edit' ? 'default' : 'ghost'}
                            onClick={() => onSetMode(mode === 'edit' ? 'browse' : 'edit')}
                        >
                            <LucideIcon.Pencil aria-hidden='true' />
                            Edit
                        </Button>
                    </Inline>
                )}
            </WebPreviewNavigation>
            <WebPreviewBody>{children}</WebPreviewBody>
        </WebPreview>
    );
};
