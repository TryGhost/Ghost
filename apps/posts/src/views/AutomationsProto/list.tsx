import FullList from './versions/full/list';
import React from 'react';
import V1List from './versions/v1/list';
import {useAutomationVersion} from './use-automation-version';

const versions = {
    v1: V1List,
    full: FullList
} as const;

const AutomationsList: React.FC = () => {
    const version = useAutomationVersion();
    const Component = versions[version] ?? FullList;
    return <Component />;
};

export default AutomationsList;
export const Component = AutomationsList;
