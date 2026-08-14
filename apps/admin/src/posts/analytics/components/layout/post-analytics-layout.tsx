import React from 'react';
import {Box, Container} from '@tryghost/shade/primitives';

const PostAnalyticsLayout: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children}) => {
    return (
        <Box className='size-full'>
            <Container className='relative flex h-full flex-col' size='page'>
                <div className='grid w-full grow'>
                    <div className='flex h-full flex-col px-8'>
                        {children}
                    </div>
                </div>
            </Container>
        </Box>
    );
};

export default PostAnalyticsLayout;
