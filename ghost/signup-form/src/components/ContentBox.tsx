import React from 'react';
import {AppContext} from '../AppContext';

type Props = {
    children: React.ReactNode
};

export const ContentBox: React.FC<Props> = ({children}) => {
    const {color} = React.useContext(AppContext).options;

    const style = {
        '--gh-accent-color': color
    } as React.CSSProperties;

    return (
        <section style={style}>
            {children}
        </section>
    );
};
