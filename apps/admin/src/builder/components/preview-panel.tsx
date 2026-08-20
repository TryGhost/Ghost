import {Button} from '@tryghost/shade/components';
import {Box} from '@tryghost/shade/primitives';

import type {ReactNode, Ref} from 'react';

export const PreviewPanel = ({children, editing, editingButtonRef, editingDisabled = false, onToggleEditing}: {children: ReactNode; editing?: boolean; editingButtonRef?: Ref<HTMLButtonElement>; editingDisabled?: boolean; onToggleEditing?: (enabled: boolean) => void}) => (
    <Box className='relative size-full min-h-0 overflow-hidden bg-surface-elevated'>
        {onToggleEditing && (
            <Box className='absolute top-3 right-3 z-10'>
                <Button
                    ref={editingButtonRef}
                    aria-pressed={Boolean(editing)}
                    disabled={editingDisabled}
                    size='sm'
                    type='button'
                    variant={editing ? 'default' : 'outline'}
                    onClick={() => onToggleEditing(!editing)}
                >
                    {editing ? 'Finish editing preview' : 'Edit preview'}
                </Button>
            </Box>
        )}
        {children}
    </Box>
);
