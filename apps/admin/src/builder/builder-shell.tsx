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
    backTo?: string;
    backLabel?: string;
    backAction?: ReactNode;
    publishAction?: ReactNode;
    previewUrl?: string;
    previewCanGoBack?: boolean;
    previewCanGoForward?: boolean;
    previewMode?: PreviewInteractionMode;
    previewEditingButtonRef?: Ref<HTMLButtonElement>;
    previewControlsDisabled?: boolean;
    previewAddress?: boolean;
    previewEdit?: boolean;
    previewHistory?: boolean;
    previewResponsive?: boolean;
    onNavigatePreview?: (url: string) => void | Promise<boolean | string>;
    onPreviewBack?: () => void;
    onPreviewForward?: () => void;
    onSetPreviewMode?: (mode: PreviewInteractionMode) => void;
};

export const BuilderShell = ({title, preview, backTo, backLabel, backAction, publishAction, previewUrl, previewCanGoBack, previewCanGoForward, previewMode, previewEditingButtonRef, previewControlsDisabled, previewAddress, previewEdit, previewHistory, previewResponsive, onNavigatePreview, onPreviewBack, onPreviewForward, onSetPreviewMode, ...chatProps}: BuilderShellProps) => (
    <Stack className='fixed inset-0 z-50 min-h-0 overflow-hidden bg-background' gap='none'>
        <BuilderHeader backAction={backAction} backLabel={backLabel} backTo={backTo} publishAction={publishAction} state={chatProps.state} title={title} />
        <BuilderLayout
            chat={<ChatPanel {...chatProps} />}
            preview={
                <PreviewPanel
                    canGoBack={previewCanGoBack}
                    canGoForward={previewCanGoForward}
                    disabled={previewControlsDisabled || !['ready', 'interrupted'].includes(chatProps.state.status)}
                    editButtonRef={previewEditingButtonRef}
                    mode={previewMode}
                    responsive={previewResponsive}
                    showAddress={previewAddress}
                    showEdit={previewEdit}
                    showHistory={previewHistory}
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
