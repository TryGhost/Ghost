import React from 'react';
import {Button} from '@tryghost/admin-x-design-system';
import {downloadAllContent} from '@tryghost/admin-x-framework/api/db';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {usePostsExports} from '@tryghost/admin-x-framework/api/posts';

const MigrationToolsExport: React.FC = () => {
    const {refetch: postsData} = usePostsExports({
        searchParams: {
            limit: '1000'
        },
        enabled: false
    });
    const handleError = useHandleError();

    const exportPosts = async () => {
        try {
            const {data} = await postsData();
            if (data) {
                const blob = new Blob([data], {type: 'text/csv'});
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.setAttribute('hidden', '');
                a.setAttribute('href', url);
                a.setAttribute('download', `post-analytics.${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }
        } catch (e) {
            handleError(e);
        }
    };

    return (
        <div className='flex flex-wrap items-center gap-4 pt-4'>
            <Button className='!h-9 !font-semibold' color='grey' icon='export' iconColorClass='!h-4 !w-auto' label='Export content & settings' onClick={() => downloadAllContent()} />
            <Button className='!h-9 !font-semibold' color='grey' icon='baseline-chart' iconColorClass='!h-4 !w-auto' label='Export post analytics' onClick={exportPosts} />
        </div>
    );
};

export default MigrationToolsExport;
