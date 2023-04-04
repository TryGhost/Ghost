import '../styles/index.css';
import KoenigComposableEditor from './KoenigComposableEditor';
import React from 'react';
import {AllDefaultPlugins} from '../plugins/AllDefaultPlugins';
import {SharedHistoryContext} from '../context/SharedHistoryContext';
import {SharedOnChangeContext} from '../context/SharedOnChangeContext';

const KoenigEditor = ({
    onChange,
    children,
    ...props
}) => {
    return (
        <SharedHistoryContext>
            <SharedOnChangeContext onChange={onChange}>
                <KoenigComposableEditor {...props}>
                    <AllDefaultPlugins />
                    {children}
                </KoenigComposableEditor>
            </SharedOnChangeContext>
        </SharedHistoryContext>
    );
};

export default KoenigEditor;
