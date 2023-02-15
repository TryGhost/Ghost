import React from 'react';
import {AllDefaultPlugins} from '../plugins/AllDefaultPlugins';
import KoenigEditor from '../components/KoenigEditor';
import '../styles/index.css';

const KoenigFullEditor = ({
    registerAPI,
    cursorDidExitAtTop
}) => {
    return (
        <KoenigEditor
            registerAPI={registerAPI}
            cursorDidExitAtTop={cursorDidExitAtTop}
        >
            <AllDefaultPlugins />
        </KoenigEditor>
    );
};

export default KoenigFullEditor;
