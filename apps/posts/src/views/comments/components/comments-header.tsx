import React from 'react';
import {Header} from '@tryghost/shade';

const CommentsHeader: React.FC<React.PropsWithChildren> = ({children}) => {
    return (
        <Header className="!pb-6" variant="inline-nav">
            <Header.Title>Comments</Header.Title>
            {children}
        </Header>
    );
};

export default CommentsHeader;
