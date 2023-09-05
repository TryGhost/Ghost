import AnnouncementBarPreview from './announcementBar/AnnouncementBarPreview';
import CheckboxGroup from '../../../admin-x-ds/global/form/CheckboxGroup';
import ColorIndicator from '../../../admin-x-ds/global/form/ColorIndicator';
import Form from '../../../admin-x-ds/global/form/Form';
import HtmlField from '../../../admin-x-ds/global/form/HtmlField';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import useRouting from '../../../hooks/useRouting';
import {PreviewModalContent} from '../../../admin-x-ds/global/modal/PreviewModal';
import {useGlobalData} from '../../providers/GlobalDataProvider';

const Sidebar: React.FC = () => {
    const {config} = useGlobalData();
    return (
        <Form>
            <HtmlField
                config={config}
                nodes='MINIMAL_NODES'
                placeholder='Highlight breaking news, offers or updates'
                title='Announcement'
            />
            <ColorIndicator
                isExpanded={false}
                picker={false}
                swatches={[
                    {
                        hex: '#08090c',
                        title: 'Dark'
                    },
                    {
                        hex: '#ffffff',
                        title: 'Light'
                    },
                    {
                        hex: '#ffdd00',
                        title: 'Accent'
                    }
                ]}
                swatchSize='lg'
                title='Background color'
                onSwatchChange={() => {}}
                onTogglePicker={() => {}}
            />
            <CheckboxGroup
                checkboxes={[
                    {
                        label: 'Logged out visitors',
                        onChange: () => {},
                        value: ''
                    },
                    {
                        label: 'Free members',
                        onChange: () => {},
                        value: ''
                    },
                    {
                        label: 'Paid members',
                        onChange: () => {},
                        value: ''
                    }
                ]}
                title='Visibility'
            />
        </Form>
    );
};

const AnnouncementBarModal: React.FC = () => {
    // const modal = useModal();
    const {updateRoute} = useRouting();

    const sidebar = <Sidebar />;

    return <PreviewModalContent
        afterClose={() => {
            updateRoute('announcement-bar');
        }}
        cancelLabel='Close'
        deviceSelector={false}
        dirty={false}
        okLabel='Save'
        preview={<AnnouncementBarPreview />}
        previewBgColor='greygradient'
        sidebar={sidebar}
        testId='announcement-bar-modal'
        title='Announcement bar'
        titleHeadingLevel={5}
        onOk={() => {}}
    />;
};

export default NiceModal.create(AnnouncementBarModal);
