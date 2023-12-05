import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import {SettingGroupHeader, withErrorBoundary} from '@tryghost/admin-x-design-system';

const DangerZone: React.FC<{ keywords: string[] }> = ({keywords}) => {
    return (
        <TopLevelGroup
            customHeader={
                <SettingGroupHeader description='Careful with this.' title='Danger zone' />
            }
            keywords={keywords}
            navid='dangerzone'
            testId='dangezone'
        >
            Button...
        </TopLevelGroup>
    );
};

export default withErrorBoundary(DangerZone, 'Danger zone');
