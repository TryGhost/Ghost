import Button from '../../../admin-x-ds/global/Button';
import CodeBlock from './code/CodeBlock';
import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import TabView from '../../../admin-x-ds/global/TabView';
import useSettingGroup from '../../../hooks/useSettingGroup';

const CodeInjection: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        // localSettings,
        isEditing,
        saveState,
        // focusRef,
        handleSave,
        handleCancel,
        // updateSetting,
        handleEditingChange
    } = useSettingGroup();

    const [selectedTab, setSelectedTab] = useState('header');

    const tabs = [
        {
            id: 'header',
            title: 'Site header',
            contents: (<CodeBlock hint='Code here will be injected into the {{ghost_head}} tag on every page of the site' />)
        },
        {
            id: 'footer',
            title: 'Site footer',
            contents: (<CodeBlock hint='Code here will be injected into the {{ghost_foot}} tag on every page of the site' />)
        }
    ];

    return (
        <SettingGroup
            description="Add custom code to your publication"
            isEditing={isEditing}
            keywords={keywords}
            navid='code-injection'
            saveState={saveState}
            testId='code-injection'
            title="Code injection"
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            {isEditing &&
            <div className='relative'>
                <TabView selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />
                <Button className='absolute right-0 top-1 text-sm' label='Fullscreen' unstyled />
            </div>

            }
        </SettingGroup>
    );
};

export default CodeInjection;
