import AutomationCanvas from './components/automation-canvas';
import AutomationHeader from './components/automation-header';
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
        <div className='flex h-full w-full flex-col' data-testid='automation-editor'>
            <AutomationHeader automation={automation} isLoading={isLoading} />
            <AutomationCanvas automation={automation} isError={isError} isLoading={isLoading} />
        </div>
    );
};

export default AutomationEditor;
