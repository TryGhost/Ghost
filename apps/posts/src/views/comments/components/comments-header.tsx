import React from 'react';
import {Header} from '@tryghost/shade';

const CommentsHeader: React.FC<React.PropsWithChildren> = ({children}) => {
    return (
        <Header className="relative !pb-6 md:sticky" variant="inline-nav">
            <Header.Title>Comments</Header.Title>
            {children}
        </Header>
    );
};

export default CommentsHeader;
