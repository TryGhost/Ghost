import React from 'react';
import {AllDefaultPlugins} from '../plugins/AllDefaultPlugins';
import KoenigComposableEditor from './KoenigComposableEditor';
import '../styles/index.css';

const KoenigEditor = ({
    registerAPI,
    cursorDidExitAtTop
}) => {
    return (
        <KoenigComposableEditor
            registerAPI={registerAPI}
            cursorDidExitAtTop={cursorDidExitAtTop}
        >
            <AllDefaultPlugins />
        </KoenigComposableEditor>
    );
};

export default KoenigEditor;
