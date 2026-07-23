import AnnouncementBarPreview from './announcement-bar/announcement-bar-preview';
import ColorSwatchField from '../../color-swatch-field';
import HtmlField from '../../html-field';
import NiceModal from '@ebay/nice-modal-react';
import React, {useRef, useState} from 'react';
import useSettingGroup from '../../../hooks/use-setting-group';
import {Checkbox, Field, FieldGroup, FieldLabel, FieldLegend, FieldSet, PreviewChrome, Tabs, TabsList, TabsTrigger, ToggleGroup, ToggleGroupItem} from '@tryghost/shade/components';
import {Laptop, Smartphone} from 'lucide-react';
import {PreviewModalContent} from '../preview-modal';
import {debounce} from '../../../utils/debounce';
import {getHomepageUrl} from '@tryghost/admin-x-framework/api/site';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {toast} from 'sonner';
import {useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {useGlobalData} from '../../providers/global-data-provider';
import {useRouting} from '@tryghost/admin-x-framework/routing';

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
            label: 'Public visitors',
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
        <FieldGroup className='mb-10 gap-8'>
            <HtmlField
                nodes='MINIMAL_NODES'
                placeholder='Highlight breaking news, offers or updates'
                title='Announcement'
                value={announcementContent}
                onBlur={onBlur}
                onChange={announcementTextHandler}
            />
            <ColorSwatchField
                size='lg'
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
                title='Background color'
                value={announcementBackgroundColor}
                onChange={(e) => {
                    if (e !== null) {
                        toggleColorSwatch(e);
                    }
                }}
            />
            <FieldSet>
                <FieldLegend variant='label'>Visibility</FieldLegend>
                <FieldGroup data-slot='checkbox-group'>
                    {visibilityCheckboxes.map(checkbox => (
                        <Field key={checkbox.value} orientation='horizontal'>
                            <Checkbox checked={checkbox.checked} id={`announcement-${checkbox.value}`} onCheckedChange={checked => checkbox.onChange(checked === true)} />
                            <FieldLabel htmlFor={`announcement-${checkbox.value}`}>{checkbox.label}</FieldLabel>
                        </Field>
                    ))}
                </FieldGroup>
            </FieldSet>
        </FieldGroup>
    );
};

const AnnouncementBarModal: React.FC = () => {
    const {siteData} = useGlobalData();
    const {localSettings, updateSetting, handleSave, okProps} = useSettingGroup({savingDelay: 500});
    const [announcementContent] = getSettingValues<string>(localSettings, ['announcement_content']);
    const [accentColor] = getSettingValues<string>(localSettings, ['accent_color']);
    const [announcementBackgroundColor] = getSettingValues<string>(localSettings, ['announcement_background']);
    const [announcementVisibility] = getSettingValues<string[]>(localSettings, ['announcement_visibility']);
    const [paidMembersEnabled] = getSettingValues<boolean>(localSettings, ['paid_members_enabled']);
    const visibilitySettings = JSON.parse(announcementVisibility?.toString() || '[]') as string[];
    const {updateRoute} = useRouting();
    const [selectedPreviewTab, setSelectedPreviewTab] = useState('homepage');
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

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

    const updateAnnouncementDebouncedRef = useRef(
        debounce((value: string) => {
            updateSetting('announcement_content', value);
        }, 500)
    );

    const sidebar = <Sidebar
        accentColor={accentColor}
        announcementBackgroundColor={announcementBackgroundColor}
        announcementContent={announcementContent}
        announcementTextHandler={(e) => {
            updateAnnouncementDebouncedRef.current(e);
        }}
        paidMembersEnabled={paidMembersEnabled}
        toggleColorSwatch={toggleColorSwatch}
        toggleVisibility={toggleVisibility}
        visibility={announcementVisibility as string[]}
        onBlur={() => {}}
    />;

    const {data: {posts: [latestPost]} = {posts: []}} = useBrowsePosts({
        searchParams: {
            filter: 'status:published',
            order: 'published_at DESC',
            limit: '1',
            fields: 'id,url'
        }
    });

    const onSelectURL = (id: string) => {
        if (latestPost) {
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

    const rawPreview = <AnnouncementBarPreview
        announcementBackgroundColor={announcementBackgroundColor}
        announcementContent={announcementContent}
        url={selectedTabURL}
        visibility={visibilitySettings}
    />;
    const preview = previewDevice === 'desktop' ? (
        <PreviewChrome data-testid='preview-desktop' device='desktop'>{rawPreview}</PreviewChrome>
    ) : (
        <PreviewChrome data-testid='preview-mobile' device='mobile'>{rawPreview}</PreviewChrome>
    );
    const previewTabs = latestPost ? (
        <Tabs value={selectedPreviewTab} variant='button-sm' onValueChange={onSelectURL}>
            <TabsList>
                <TabsTrigger value='homepage'>Homepage</TabsTrigger>
                <TabsTrigger value='post'>Post</TabsTrigger>
            </TabsList>
        </Tabs>
    ) : undefined;
    const deviceSelector = (
        <ToggleGroup type='single' value={previewDevice} onValueChange={(value) => {
            if (value === 'desktop' || value === 'mobile') {
                setPreviewDevice(value);
            }
        }}>
            <ToggleGroupItem aria-label='Desktop' value='desktop'><Laptop /></ToggleGroupItem>
            <ToggleGroupItem aria-label='Mobile' value='mobile'><Smartphone /></ToggleGroupItem>
        </ToggleGroup>
    );

    return <PreviewModalContent
        afterClose={() => {
            updateRoute('announcement-bar');
        }}
        buttonsDisabled={okProps.disabled}
        cancelLabel='Close'
        deviceSelector={deviceSelector}
        dirty={false}
        okLabel={okProps.label || 'Save'}
        okVariant={okProps.variant}
        preview={preview}
        previewBgColor='greygradient'
        previewToolbarTabs={previewTabs}
        sidebar={sidebar}
        testId='announcement-bar-modal'
        title='Announcement'
        titleHeadingLevel={5}
        onOk={async () => {
            if (!(await handleSave({fakeWhenUnchanged: true}))) {
                toast.error('An error occurred while saving your changes. Please try again.');
            }
        }}
    />;
};

export default NiceModal.create(AnnouncementBarModal);
