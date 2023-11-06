import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import useRouting from '../../../hooks/useRouting';
import {Button, withErrorBoundary} from '@tryghost/admin-x-design';

const Navigation: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const openPreviewModal = () => {
        updateRoute('navigation/edit');
    };

    return (
        <TopLevelGroup
            customButtons={<Button color='green' label='Customize' link linkWithPadding onClick={openPreviewModal}/>}
            description="Set up primary and secondary menus"
            keywords={keywords}
            navid='navigation'
            testId='navigation'
            title="Navigation"
        />
    );
};

export default withErrorBoundary(Navigation, 'Navigation');
