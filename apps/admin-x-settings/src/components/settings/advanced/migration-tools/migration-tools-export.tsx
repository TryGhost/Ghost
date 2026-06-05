import React from 'react';
import {Button} from '@tryghost/admin-x-design-system';
import {downloadAllContent} from '@tryghost/admin-x-framework/api/db';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {slugify} from '@tryghost/string';
import {useGlobalData} from '../../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {usePostsExports} from '@tryghost/admin-x-framework/api/posts';

export const getPostAnalyticsExportFileName = (siteTitle?: string | null) => {
    const titlePrefix = siteTitle ? `${slugify(siteTitle)}.` : '';
    const today = new Date().toISOString().split('T')[0];

    return `${titlePrefix}ghost.analytics.${today}.csv`;
};

const MigrationToolsExport: React.FC = () => {
    const [isExportingPosts, setIsExportingPosts] = React.useState(false);
    const {settings} = useGlobalData();
    const [siteTitle] = getSettingValues<string>(settings, ['title']);
    const {refetch: postsData} = usePostsExports({
        searchParams: {
            limit: '1000'
        },
        enabled: false
    });
    const handleError = useHandleError();

    const exportPosts = async () => {
        if (isExportingPosts) {
            return;
        }

        setIsExportingPosts(true);

        try {
            const {data} = await postsData();
            if (data) {
                const blob = new Blob([data], {type: 'text/csv'});
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.setAttribute('hidden', '');
                a.setAttribute('href', url);
                a.setAttribute('download', getPostAnalyticsExportFileName(siteTitle));
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }
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
