import {Box} from '@tryghost/shade/primitives';

import type {ReactNode} from 'react';

export const PreviewPanel = ({children}: {children: ReactNode}) => (
    <Box className='size-full min-h-0 overflow-hidden bg-surface-elevated'>
        {children}
    </Box>
);
