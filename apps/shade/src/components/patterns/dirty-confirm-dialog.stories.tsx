import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';

import {DirtyConfirmDialog, useDirtyConfirmation} from '@/components/patterns/dirty-confirm-dialog';
import {Button} from '@/components/ui/button';
import {Inline, Text} from '@/components/primitives';

const meta = {
    title: 'Patterns / Dirty Confirm Dialog',
    component: DirtyConfirmDialog,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Confirms navigation away from a surface with unsaved changes.'
            }
        }
    }
} satisfies Meta<typeof DirtyConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const InteractiveExample = () => {
    const [status, setStatus] = useState('Unsaved changes remain');
    const {confirm, dialogProps} = useDirtyConfirmation();

    return (
        <>
            <Inline align='center' gap='md'>
                <Button onClick={() => confirm(true, () => setStatus('Left the dirty surface'))}>Leave page</Button>
                <Text tone='secondary'>{status}</Text>
            </Inline>
            <DirtyConfirmDialog {...dialogProps} />
        </>
    );
};

export const Interactive: Story = {
    args: {
        open: false,
        onConfirm: () => undefined,
        onOpenChange: () => undefined
    },
    render: () => <InteractiveExample />,
    parameters: {
        docs: {
            description: {
                story: 'Use when an action would discard unsaved changes; Stay preserves the current surface and Leave runs the pending action.'
            }
        }
    }
};

export const Open: Story = {
    args: {
        open: true,
        onConfirm: () => undefined,
        onOpenChange: () => undefined
    },
    parameters: {
        docs: {
            description: {
                story: 'The open state shows the standard unsaved-changes title, supporting copy, and safe/destructive actions.'
            }
        }
    }
};
