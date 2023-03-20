import '../styles/index.css';
import KoenigComposableEditor from './KoenigComposableEditor';
import React from 'react';
import {AllDefaultPlugins} from '../plugins/AllDefaultPlugins';

const KoenigEditor = ({
    children,
    ...props
}) => {
    return (
        <KoenigComposableEditor {...props}>
            <AllDefaultPlugins />
            {children}
        </KoenigComposableEditor>
    );
};

export default KoenigEditor;
