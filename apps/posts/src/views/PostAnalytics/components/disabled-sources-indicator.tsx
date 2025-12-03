import React from 'react';
import {Button, EmptyIndicator, LucideIcon} from '@tryghost/shade';
import {useNavigate} from '@tryghost/admin-x-framework';

interface DisabledSourcesIndicatorProps {
    className?: string;
}

/**
 * Shared component for displaying the disabled member sources indicator.
 * Used to ensure consistent copy across the application.
 */
const DisabledSourcesIndicator: React.FC<DisabledSourcesIndicatorProps> = ({className}) => {
    const navigate = useNavigate();

    return (
        <EmptyIndicator
            actions={
                <Button variant='outline' onClick={() => navigate('/settings/analytics', {crossApp: true})}>
                    Open settings
                </Button>
            }
            className={className}
            description='Enable member source tracking in settings to see which content drives member growth.'
            title='Member sources have been disabled'
        >
            <LucideIcon.Activity />
        </EmptyIndicator>
    );
};

export default DisabledSourcesIndicator;
