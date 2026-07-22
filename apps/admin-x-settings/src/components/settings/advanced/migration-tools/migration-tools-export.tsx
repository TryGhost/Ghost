import React from 'react';
import {Button, LoadingIndicator} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
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
            <Button className='h-9 font-semibold' type='button' variant='secondary' onClick={() => downloadAllContent()}><LucideIcon.Download />Content &amp; settings</Button>
            <Button className='h-9 font-semibold' data-testid='post-analytics-export-button' disabled={isExportingPosts} type='button' variant='secondary' onClick={exportPosts}>{isExportingPosts ? <><LoadingIndicator size='sm' /><span className='sr-only'>Loading...</span></> : <><LucideIcon.TrendingUp />Post analytics</>}</Button>
        </div>
    );
};

export default MigrationToolsExport;
