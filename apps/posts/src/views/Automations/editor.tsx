import FullEditor from './versions/full/editor';
import React from 'react';
import V1Editor from './versions/v1/editor';
import {useAutomationVersion} from './use-automation-version';

const versions = {
    v1: V1Editor,
    full: FullEditor
} as const;

const AutomationEditor: React.FC = () => {
    const version = useAutomationVersion();
    const Component = versions[version] ?? FullEditor;
    return <Component />;
};

export default AutomationEditor;
export const Component = AutomationEditor;
