import React, {useEffect, useState} from 'react';
import {type OkProps} from '@tryghost/admin-x-framework/hooks';
import {PreviewModalContent, type Tab, TabView} from '@tryghost/admin-x-design-system';

type CustomizationModalProps = {
    title: string;
    testId: string;
    tabs: Tab[];
    preview: React.ReactNode;
    dirty: boolean;
    okProps: OkProps;
    onOk: () => Promise<void>;
    afterClose: () => void;
};

const Sidebar: React.FC<{tabs: Tab[]}> = ({tabs}) => {
    const [selectedTab, setSelectedTab] = useState(tabs[0]?.id || '');

    useEffect(() => {
        if (!tabs.find(tab => tab.id === selectedTab)) {
            setSelectedTab(tabs[0]?.id || '');
        }
    }, [selectedTab, tabs]);

    return (
        <div className='flex flex-col'>
            <div className='px-7 pb-7 pt-0'>
                <TabView selectedTab={selectedTab} stickyHeader={true} tabs={tabs} onTabChange={setSelectedTab} />
            </div>
        </div>
    );
};

const CustomizationModal: React.FC<CustomizationModalProps> = ({title, testId, tabs, preview, dirty, okProps, onOk, afterClose}) => {
    const sidebar = <Sidebar tabs={tabs} />;

    return (
        <PreviewModalContent
            afterClose={afterClose}
            buttonsDisabled={okProps.disabled}
            cancelLabel='Close'
            deviceSelector={false}
            dirty={dirty}
            okColor={okProps.color}
            okLabel={okProps.label || 'Save'}
            preview={preview}
            previewBgColor='grey'
            previewToolbar={false}
            sidebar={sidebar}
            sidebarPadding={false}
            testId={testId}
            title={title}
            onOk={onOk}
        />
    );
};

export default CustomizationModal;
