import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import useRouting from '../../../hooks/useRouting';
import {PreviewModalContent} from '../../../admin-x-ds/global/modal/PreviewModal';

const Sidebar: React.FC = () => {
    return (
        <div className='pt-4'>
            sidebar
        </div>
    );
};

const Preview: React.FC = () => {
    return (<>Preview</>);
};

const AnnouncementBarModal: React.FC = () => {
    // const modal = useModal();
    const {updateRoute} = useRouting();

    const sidebar = <Sidebar />;

    const preview = <Preview />;

    return <PreviewModalContent
        afterClose={() => {
            updateRoute('announcement-bar');
        }}
        deviceSelector={false}
        dirty={false}
        okLabel='Save'
        preview={preview}
        previewBgColor='greygradient'
        sidebar={sidebar}
        testId='announcement-bar-modal'
        title='Announcement bar'
        titleHeadingLevel={5}
        onOk={() => {}}
    />;
};

export default NiceModal.create(AnnouncementBarModal);
