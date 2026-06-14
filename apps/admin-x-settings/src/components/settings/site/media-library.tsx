import React from 'react';
import TopLevelGroup from '../../top-level-group';
import {Button, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const MediaLibrary: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();

    return (
        <TopLevelGroup
            customButtons={<Button className='mt-[-5px]' color='clear' label='Open' size='sm' onClick={() => updateRoute('media-library/browse')}/>}
            description='Browse the images, files, and media currently used across your site'
            keywords={keywords}
            navid='media-library'
            testId='media-library'
            title='Media library'
        />
    );
};

export default withErrorBoundary(MediaLibrary, 'Media library');
