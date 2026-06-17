import React, {useEffect, useState} from 'react';
import useFeatureFlag from '../../../../hooks/use-feature-flag';
import {Button} from '@tryghost/admin-x-design-system';
import {MediaArchiveDialog, useMediaArchive} from '../../site/media-archive-dialog';
import {blobDownloadFromEndpoint} from '@tryghost/admin-x-framework/helpers';
import {downloadAllContent} from '@tryghost/admin-x-framework/api/db';
import {useBrowseMediaLibrary} from '@tryghost/admin-x-framework/api/media-library';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

const MigrationToolsExport: React.FC = () => {
    const [isExportingPosts, setIsExportingPosts] = React.useState(false);
    const handleError = useHandleError();

    // Media archive (behind the same flag as the library). The inventory scan is
    // lazy: it only runs once the button is clicked, then the dialog opens.
    const hasMediaLibrary = useFeatureFlag('mediaLibrary');
    const [mediaRequested, setMediaRequested] = useState(false);
    const [openWhenReady, setOpenWhenReady] = useState(false);
    const {data: mediaData, isLoading: isLoadingMedia} = useBrowseMediaLibrary({enabled: mediaRequested, staleTime: 30 * 1000});
    const archive = useMediaArchive(mediaData?.media_library || []);

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

    const exportMedia = () => {
        setMediaRequested(true);
        setOpenWhenReady(true);
    };

    // Open the dialog as soon as the inventory has loaded after a click.
    useEffect(() => {
        if (openWhenReady && mediaRequested && !isLoadingMedia && mediaData) {
            setOpenWhenReady(false);
            archive.open();
        }
    }, [openWhenReady, mediaRequested, isLoadingMedia, mediaData, archive]);

    return (
        <>
            <div className='grid grid-cols-1 gap-4 pt-4 md:grid-cols-2 lg:grid-cols-3'>
                <Button className='h-9! font-semibold!' color='grey' icon='export' iconColorClass='h-4! w-auto!' label='Content & settings' onClick={() => downloadAllContent()} />
                {hasMediaLibrary && (
                    <Button className='h-9! font-semibold!' color='grey' icon='picture' iconColorClass='h-4! w-auto!' label='Media in use' loading={openWhenReady && isLoadingMedia} testId='media-export-button' onClick={exportMedia} />
                )}
                <Button className='h-9! font-semibold!' color='grey' disabled={isExportingPosts} icon='baseline-chart' iconColorClass='h-4! w-auto!' label='Post analytics' loading={isExportingPosts} testId='post-analytics-export-button' onClick={exportPosts} />
            </div>
            {hasMediaLibrary && <MediaArchiveDialog archive={archive} />}
        </>
    );
};

export default MigrationToolsExport;
