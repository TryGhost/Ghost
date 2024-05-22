import React from 'react';

type ContentBoxProps = {
    children: React.ReactNode
};

export const ContentBox: React.FC<ContentBoxProps> = ({children}) => {
    return (
        <section>
            {children}
        </section>
    );
};
