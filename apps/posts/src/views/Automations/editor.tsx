import AutomationCanvas from './components/automation-canvas';
import AutomationHeader from './components/automation-header';
import AutomationsLayout from './components/automations-layout';
import React from 'react';
import {useParams} from '@tryghost/admin-x-framework';
import {useReadAutomation} from '@tryghost/admin-x-framework/api/automations';

const AutomationEditor: React.FC = () => {
    const {id = ''} = useParams<{id: string}>();
    const {data, isLoading, isError} = useReadAutomation(id, {
        defaultErrorHandler: false
    });

    const automation = data?.automations[0];

    return (
        <AutomationsLayout>
            <AutomationHeader isLoading={isLoading} name={automation?.name} />
            <AutomationCanvas automation={automation} isError={isError} isLoading={isLoading} />
        </AutomationsLayout>
    );
};

export default AutomationEditor;
