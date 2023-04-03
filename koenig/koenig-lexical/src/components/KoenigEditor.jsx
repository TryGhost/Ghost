import '../styles/index.css';
import KoenigComposableEditor from './KoenigComposableEditor';
import React from 'react';
import {AllDefaultPlugins} from '../plugins/AllDefaultPlugins';
import {SharedHistoryContext} from '../context/SharedHistoryContext';

const KoenigEditor = ({
    children,
    ...props
}) => {
    return (
        <SharedHistoryContext>
            <KoenigComposableEditor {...props}>
                <AllDefaultPlugins />
                {children}
            </KoenigComposableEditor>
        </SharedHistoryContext>
    );
};

export default KoenigEditor;
