import React from 'react';
import {AllDefaultPlugins} from '../plugins/AllDefaultPlugins';
import KoenigComposableEditor from './KoenigComposableEditor';
import '../styles/index.css';

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
