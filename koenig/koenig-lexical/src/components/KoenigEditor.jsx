import '../styles/index.css';
import KoenigComposableEditor from './KoenigComposableEditor';
import React from 'react';
import {AllDefaultPlugins} from '../plugins/AllDefaultPlugins';

const KoenigEditor = ({
    ...props
}) => {
    return (
        <KoenigComposableEditor {...props}>
            <AllDefaultPlugins />
        </KoenigComposableEditor>
    );
};

export default KoenigEditor;
