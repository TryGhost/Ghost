import AutomationsContent from './components/automations-content';
import AutomationsHeader from './components/automations-header';
import AutomationsLayout from './components/automations-layout';
import AutomationsList from './components/automations-list';
import React from 'react';
import {useBrowseAutomations} from '@tryghost/admin-x-framework/api/automations';

const Automations: React.FC = () => {
    const {data, error, isError, isLoading} = useBrowseAutomations({
        defaultErrorHandler: false
    });

    if (isError) {
        throw error || new Error('Failed to load automations');
    }

    return (
        <AutomationsLayout>
            <AutomationsHeader />
            <AutomationsContent>
                <AutomationsList automations={data?.automations} isLoading={isLoading} />
            </AutomationsContent>
        </AutomationsLayout>
    );
};

export default Automations;
