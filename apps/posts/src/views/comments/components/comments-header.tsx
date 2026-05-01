import React from 'react';
import {Header} from '@tryghost/shade/primitives';

// The shade Header primitive is `@deprecated` and ships with `sticky top-0 z-50`
// plus `-mb-4 lg:-mb-8` baked in (to create the backdrop-blur overlap effect).
// We want the grid areas it provides — `[grid-area:title]`, `[grid-area:actions]`,
// `[grid-area:nav]` — because `CommentsFilters` positions itself against them.
// The overrides here neutralise the sticky+negative-margin without losing the grid.
const CommentsHeader: React.FC<React.PropsWithChildren> = ({children}) => {
    return (
        <Header className='!static !mb-0 pb-6! lg:!mb-0' variant='inline-nav'>
            <Header.Title>Comments</Header.Title>
            {children}
        </Header>
    );
};

export default CommentsHeader;
