import React from 'react';
import {Button} from '@tryghost/admin-x-design-system';
import {blobDownloadFromEndpoint} from '@tryghost/admin-x-framework/helpers';
import {downloadAllContent} from '@tryghost/admin-x-framework/api/db';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

const MigrationToolsExport: React.FC = () => {
    const [isExportingPosts, setIsExportingPosts] = React.useState(false);
    const handleError = useHandleError();

    const exportPosts = async () => {
        if (isExportingPosts) {
            return;
        }

        setIsExportingPosts(true);

        try {
            await blobDownloadFromEndpoint('/posts/export/?limit=1000', 'posts.analytics.csv');
        } catch (e) {
            handleError(e);
        } finally {
            setIsExportingPosts(false);
        }
    };

    return (
        <div className='grid grid-cols-1 gap-4 pt-4 md:grid-cols-2 lg:grid-cols-3'>
            <Button className='h-9! font-semibold!' color='grey' icon='export' iconColorClass='h-4! w-auto!' label='Content & settings' onClick={() => downloadAllContent()} />
            <Button className='h-9! font-semibold!' color='grey' disabled={isExportingPosts} icon='baseline-chart' iconColorClass='h-4! w-auto!' label='Post analytics' loading={isExportingPosts} testId='post-analytics-export-button' onClick={exportPosts} />
        </div>
    );
};

export default MigrationToolsExport;
