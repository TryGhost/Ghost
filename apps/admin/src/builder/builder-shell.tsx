import {Stack} from '@tryghost/shade/primitives';

import {BuilderHeader} from './components/builder-header';
import {BuilderLayout} from './components/builder-layout';
import {ChatPanel} from './components/chat-panel';
import {PreviewPanel} from './components/preview-panel';

import type {ChatPanelProps} from './components/chat-panel';
import type {ReactNode} from 'react';

export type BuilderShellProps = ChatPanelProps & {
    title: string;
    preview: ReactNode;
    backTo: string;
    backLabel: string;
};

export const BuilderShell = ({title, preview, backTo, backLabel, ...chatProps}: BuilderShellProps) => (
    <Stack className='fixed inset-0 z-50 min-h-0 overflow-hidden bg-background' gap='none'>
        <BuilderHeader backLabel={backLabel} backTo={backTo} state={chatProps.state} title={title} />
        <BuilderLayout
            chat={<ChatPanel {...chatProps} />}
            preview={<PreviewPanel>{preview}</PreviewPanel>}
        />
    </Stack>
);
