import React from 'react';
import {useAppContext} from '../AppContext';

type ContentBoxProps = {
    backgroundColor: string
    textColor: string
    children: React.ReactNode
};

export const ContentBox: React.FC<ContentBoxProps> = ({backgroundColor, textColor, children}) => {
    const {color} = useAppContext().options;

    const style = {
        '--gh-accent-color': color,
        backgroundColor,
        color: textColor
    } as React.CSSProperties;

    return (
        <section style={style}>
            {children}
        </section>
    );
};
