import React from 'react';
import {useAppContext} from '../AppContext';

type ContentBoxProps = {
    children: React.ReactNode
};

export const ContentBox: React.FC<ContentBoxProps> = ({children}) => {
    const {color} = useAppContext().options;

    const style = {
        '--gh-accent-color': color
    } as React.CSSProperties;

    return (
        <section style={style}>
            {children}
        </section>
    );
};
