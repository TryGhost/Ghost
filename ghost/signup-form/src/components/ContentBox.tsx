import React from 'react';
import {useAppContext} from '../AppContext';

type ContentBoxProps = {
    isDarkMode: boolean;
    children: React.ReactNode
};

export const ContentBox: React.FC<ContentBoxProps> = ({isDarkMode, children}) => {
    const {color} = useAppContext().options;

    const style = {
        '--gh-accent-color': color
    } as React.CSSProperties;

    return (
        <section className={isDarkMode ? 'dark' : ''} style={style}>
            {children}
        </section>
    );
};
