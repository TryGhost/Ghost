import AutomationsContent from './components/automations-content';
import AutomationsHeader from './components/automations-header';
import AutomationsLayout from './components/automations-layout';
import AutomationsList from './components/automations-list';
import React from 'react';

const Automations: React.FC = () => {
    return (
        <AutomationsLayout>
            <AutomationsHeader />
            <AutomationsContent>
                <AutomationsList />
            </AutomationsContent>
        </AutomationsLayout>
    );
};

export default Automations;
