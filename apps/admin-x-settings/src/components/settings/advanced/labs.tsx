import BetaFeatures from './labs/beta-features';
import LabsBubbles from '../../../assets/images/labs-bg.svg';
import PluginsManager from './labs/plugins';
import PrivateFeatures from './labs/private-features';
import React, {useState} from 'react';
import TopLevelGroup from '../../top-level-group';
import {Button, SettingGroupHeader, type Tab, TabView, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getSettingValue} from '@tryghost/admin-x-framework/api/settings';
import {useAutoExpandable} from '../../../hooks/use-auto-expandable';
import {useGlobalData} from '../../providers/global-data-provider';

type LabsTab = 'labs-private-features' | 'labs-beta-features' | 'labs-plugins';

const Labs: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [selectedTab, setSelectedTab] = useState<LabsTab>('labs-beta-features');
    const {config, settings} = useGlobalData();
    const {isOpen, openManually, closeManually} = useAutoExpandable(keywords);

    const labs = JSON.parse(getSettingValue<string>(settings, 'labs') || '{}');
    const pluginsEnabled = labs.customCardPlugins === true;

    const tabs = [
        {
            id: 'labs-beta-features',
            title: 'Beta features',
            contents: <BetaFeatures />
        },
        config.enableDeveloperExperiments && ({
            id: 'labs-private-features',
            title: 'Private features',
            contents: <PrivateFeatures />
        }),
        pluginsEnabled && ({
            id: 'labs-plugins',
            title: 'Card Plugins',
            contents: <PluginsManager />
        })
    ].filter(Boolean) as Tab<LabsTab>[];

    return (
        <TopLevelGroup
            customHeader={
                <div className='z-10 flex items-start justify-between'>
                    <SettingGroupHeader
                        description='This is a testing ground for new or experimental features. They may change, break or inexplicably disappear at any time.'
                        title='Labs'
                    />
                    <Button
                        className='mt-[-5px]'
                        color={isOpen ? 'grey' : 'clear'}
                        label={isOpen ? 'Close' : 'Open'}
                        size='sm'
                        onClick={isOpen ? closeManually : openManually}
                    />
                </div>
            }
            isEditing={isOpen}
            keywords={keywords}
            navid='labs'
            testId='labs'
        >
            {isOpen ? (
                <TabView<'labs-private-features' | 'labs-beta-features' | 'labs-plugins'>
                    selectedTab={selectedTab}
                    tabs={tabs}
                    onTabChange={setSelectedTab}
                />
            ) : (
                <div className='absolute inset-0 z-0 overflow-hidden opacity-70'>
                    <img className='absolute -top-6 -right-6 dark:opacity-10' src={LabsBubbles} />
                </div>
            )}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Labs, 'Labs');
