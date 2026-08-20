import {Stack} from '@tryghost/shade/primitives';

import {BuilderHeader} from './components/builder-header';
import {BuilderLayout} from './components/builder-layout';
import {ChatPanel} from './components/chat-panel';
import {PreviewPanel} from './components/preview-panel';

import type {ChatPanelProps} from './components/chat-panel';
import type {ReactNode, Ref} from 'react';

export type BuilderShellProps = ChatPanelProps & {
    title: string;
    preview: ReactNode;
    backTo: string;
    backLabel: string;
    publishAction?: ReactNode;
    previewEditing?: boolean;
    previewEditingButtonRef?: Ref<HTMLButtonElement>;
    previewEditingDisabled?: boolean;
    onTogglePreviewEditing?: (enabled: boolean) => void;
};

export const BuilderShell = ({title, preview, backTo, backLabel, publishAction, previewEditing, previewEditingButtonRef, previewEditingDisabled, onTogglePreviewEditing, ...chatProps}: BuilderShellProps) => (
    <Stack className='fixed inset-0 z-50 min-h-0 overflow-hidden bg-background' gap='none'>
        <BuilderHeader backLabel={backLabel} backTo={backTo} publishAction={publishAction} state={chatProps.state} title={title} />
        <BuilderLayout
            chat={<ChatPanel {...chatProps} />}
            preview={<PreviewPanel editing={previewEditing} editingButtonRef={previewEditingButtonRef} editingDisabled={previewEditingDisabled} onToggleEditing={onTogglePreviewEditing}>{preview}</PreviewPanel>}
        />
    </Stack>
);
