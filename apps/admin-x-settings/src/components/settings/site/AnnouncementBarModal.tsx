import AnnouncementBarPreview from './announcementBar/AnnouncementBarPreview';
import CheckboxGroup from '../../../admin-x-ds/global/form/CheckboxGroup';
import ColorIndicator from '../../../admin-x-ds/global/form/ColorIndicator';
import Form from '../../../admin-x-ds/global/form/Form';
import HtmlField from '../../../admin-x-ds/global/form/HtmlField';
import NiceModal from '@ebay/nice-modal-react';
import React, {useCallback, useState} from 'react';
import useRouting from '../../../hooks/useRouting';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {PreviewModalContent} from '../../../admin-x-ds/global/modal/PreviewModal';
import {Tab} from '../../../admin-x-ds/global/TabView';
import {getHomepageUrl} from '../../../api/site';
import {getSettingValues} from '../../../api/settings';
import {showToast} from '../../../admin-x-ds/global/Toast';
import {useBrowsePosts} from '../../../api/posts';
import {useGlobalData} from '../../providers/GlobalDataProvider';

type SidebarProps = {
    announcementContent?: string;
    announcementTextHandler: (e: string) => void;
    accentColor?: string;
    announcementBackgroundColor?: string;
    toggleColorSwatch: (e:string) => void;
    toggleVisibility: (visibility: string, value: boolean) => void;
    visibility?: string[];
    paidMembersEnabled?: boolean;
    onBlur: () => void;
};

const Sidebar: React.FC<SidebarProps> = ({
    announcementContent,
    announcementTextHandler,
    accentColor,
    announcementBackgroundColor,
    toggleColorSwatch,
    toggleVisibility,
    visibility = [],
    paidMembersEnabled,
    onBlur
}) => {
    const visibilityCheckboxes = [
        {
            label: 'Logged out visitors',
            onChange: (e:boolean) => {
                toggleVisibility('visitors', e);
            },
            value: 'visitors',
            checked: visibility.includes('visitors')
        },
        {
            label: 'Free members',
            onChange: (e:boolean) => {
                toggleVisibility('free_members', e);
            },
            value: 'free_members',
            checked: visibility.includes('free_members')
        },
        ...(paidMembersEnabled ? [{
            label: 'Paid members',
            onChange: (e: boolean) => {
                toggleVisibility('paid_members', e);
            },
            value: 'paid_members',
            checked: visibility.includes('paid_members')
        }] : [])
    ];

    return (
        <Form>
            <HtmlField
                nodes='MINIMAL_NODES'
                placeholder='Highlight breaking news, offers or updates'
                title='Announcement'
                value={announcementContent}
                onBlur={onBlur}
                onChange={announcementTextHandler}
            />
            <ColorIndicator
                isExpanded={false}
                picker={false}
                swatches={[
                    {
                        hex: '#08090c',
                        title: 'Dark',
                        value: 'dark'
                    },
                    {
                        hex: '#ffffff',
                        title: 'Light',
                        value: 'light'
                    },
                    {
                        hex: accentColor || '#ffdd00',
                        title: 'Accent',
                        value: 'accent'
                    }
                ]}
                swatchSize='lg'
                title='Background color'
                value={announcementBackgroundColor}
                onSwatchChange={(e) => {
                    if (e !== null) {
                        toggleColorSwatch(e);
                    }
                }}
                onTogglePicker={() => {}}
            />
            <CheckboxGroup
                checkboxes={visibilityCheckboxes}
                title='Visibility'
            />
        </Form>
    );
};

const AnnouncementBarModal: React.FC = () => {
    const {siteData} = useGlobalData();
    const {localSettings, updateSetting, handleSave} = useSettingGroup();
    const [announcementContent] = getSettingValues<string>(localSettings, ['announcement_content']);
    const [accentColor] = getSettingValues<string>(localSettings, ['accent_color']);
    const [announcementBackgroundColor] = getSettingValues<string>(localSettings, ['announcement_background']);
    const [announcementVisibility] = getSettingValues<string[]>(localSettings, ['announcement_visibility']);
    const [paidMembersEnabled] = getSettingValues<boolean>(localSettings, ['paid_members_enabled']);
    const visibilitySettings = JSON.parse(announcementVisibility?.toString() || '[]') as string[];
    const {updateRoute} = useRouting();
    const [selectedPreviewTab, setSelectedPreviewTab] = useState('homepage');
    const [announcementContentState, setAnnouncementContentState] = useState(announcementContent);

    const toggleColorSwatch = (e: string | null) => {
        updateSetting('announcement_background', e);
    };

    const toggleVisibility = (visibility: string, value: boolean) => {
        const index = visibilitySettings.indexOf(visibility);
        if (index === -1 && value) {
            visibilitySettings.push(visibility);
        } else {
            visibilitySettings.splice(index, 1);
        }
        updateSetting('announcement_visibility', JSON.stringify(visibilitySettings));
    };

    const announcementTextHandler = useCallback((e:string) => {
        setAnnouncementContentState(e);
    }, []);

    const sidebar = <Sidebar
        accentColor={accentColor}
        announcementBackgroundColor={announcementBackgroundColor}
        announcementContent={announcementContent}
        announcementTextHandler={(e) => {
            announcementTextHandler(e);
        }}
        paidMembersEnabled={paidMembersEnabled}
        toggleColorSwatch={toggleColorSwatch}
        toggleVisibility={toggleVisibility}
        visibility={announcementVisibility as string[]}
        onBlur={() => {
            if (announcementContentState) {
                updateSetting('announcement_content', announcementContentState);
            } else {
                updateSetting('announcement_content', null);
            }
        }}
    />;

    const {data: {posts: [latestPost]} = {posts: []}} = useBrowsePosts({
        searchParams: {
            filter: 'status:published',
            order: 'published_at DESC',
            limit: '1',
            fields: 'id,url'
        }
    });

    let previewTabs: Tab[] = [];
    if (latestPost) {
        previewTabs = [
            {id: 'homepage', title: 'Homepage'},
            {id: 'post', title: 'Post'}
        ];
    }

    const onSelectURL = (id: string) => {
        if (previewTabs.length) {
            setSelectedPreviewTab(id);
        }
    };

    let selectedTabURL = getHomepageUrl(siteData!);
    switch (selectedPreviewTab) {
    case 'homepage':
        selectedTabURL = getHomepageUrl(siteData!);
        break;
    case 'post':
        selectedTabURL = latestPost!.url;
        break;
    }

    const preview = <AnnouncementBarPreview
        announcementBackgroundColor={announcementBackgroundColor}
        announcementContent={announcementContent}
        url={selectedTabURL}
        visibility={visibilitySettings}
    />;

    return <PreviewModalContent
        afterClose={() => {
            updateRoute('announcement-bar');
        }}
        cancelLabel='Close'
        deviceSelector={true}
        dirty={false}
        okLabel='Save'
        preview={preview}
        previewBgColor='greygradient'
        previewToolbarTabs={previewTabs}
        selectedURL={selectedPreviewTab}
        sidebar={sidebar}
        testId='announcement-bar-modal'
        title='Announcement'
        titleHeadingLevel={5}
        onOk={async () => {
            if (!(await handleSave())) {
                updateRoute('announcement-bar');
                showToast({
                    type: 'pageError',
                    message: 'An error occurred while saving your changes. Please try again.'
                });
            }
        }}
        onSelectURL={onSelectURL}
    />;
};

export default NiceModal.create(AnnouncementBarModal);
