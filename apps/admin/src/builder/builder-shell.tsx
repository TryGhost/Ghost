import {Stack} from '@tryghost/shade/primitives';

import {BuilderHeader} from './components/builder-header';
import {BuilderLayout} from './components/builder-layout';
import {ChatPanel} from './components/chat-panel';
import {PreviewPanel} from './components/preview-panel';

import type {ChatPanelProps} from './components/chat-panel';
import type {PreviewInteractionMode} from './components/preview-panel';
import type {ReactNode, Ref} from 'react';

export type BuilderShellProps = ChatPanelProps & {
    title: string;
    preview: ReactNode;
    backTo: string;
    backLabel: string;
    publishAction?: ReactNode;
    previewUrl?: string;
    previewCanGoBack?: boolean;
    previewCanGoForward?: boolean;
    previewMode?: PreviewInteractionMode;
    previewEditingButtonRef?: Ref<HTMLButtonElement>;
    previewControlsDisabled?: boolean;
    onNavigatePreview?: (url: string) => void | Promise<boolean>;
    onPreviewBack?: () => void;
    onPreviewForward?: () => void;
    onSetPreviewMode?: (mode: PreviewInteractionMode) => void;
};

export const BuilderShell = ({title, preview, backTo, backLabel, publishAction, previewUrl, previewCanGoBack, previewCanGoForward, previewMode, previewEditingButtonRef, previewControlsDisabled, onNavigatePreview, onPreviewBack, onPreviewForward, onSetPreviewMode, ...chatProps}: BuilderShellProps) => (
    <Stack className='fixed inset-0 z-50 min-h-0 overflow-hidden bg-background' gap='none'>
        <BuilderHeader backLabel={backLabel} backTo={backTo} publishAction={publishAction} state={chatProps.state} title={title} />
        <BuilderLayout
            chat={<ChatPanel {...chatProps} />}
            preview={
                <PreviewPanel
                    canGoBack={previewCanGoBack}
                    canGoForward={previewCanGoForward}
                    disabled={previewControlsDisabled}
                    editButtonRef={previewEditingButtonRef}
                    mode={previewMode}
                    url={previewUrl}
                    onBack={onPreviewBack}
                    onForward={onPreviewForward}
                    onNavigate={onNavigatePreview}
                    onSetMode={onSetPreviewMode}
                >
                    {preview}
                </PreviewPanel>
            }
        />
    </Stack>
);
