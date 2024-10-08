import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import {Button, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const ChangeTheme: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const openPreviewModal = () => {
        updateRoute('design/change-theme');
    };

    return (
        <TopLevelGroup
            customButtons={<Button className='mt-[-5px]' color='clear' label='Open' size='sm' onClick={openPreviewModal}/>}
            description="Browse and install official themes or upload one"
            keywords={keywords}
            navid='theme'
            testId='theme'
            title="Change theme"
        />
    );
};

export default withErrorBoundary(ChangeTheme, 'Branding and design');
