import BetaFeatures from './labs/BetaFeatures';
import LabsBubbles from '../../../assets/images/labs-bg.svg';
import PrivateFeatures from './labs/PrivateFeatures';
import React, {useState} from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import {Button, SettingGroupHeader, Tab, TabView, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {useAutoExpandable} from '../../../hooks/useAutoExpandable';
import {useGlobalData} from '../../providers/GlobalDataProvider';

type LabsTab = 'labs-private-features' | 'labs-beta-features';

const Labs: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [selectedTab, setSelectedTab] = useState<LabsTab>('labs-beta-features');
    const {config} = useGlobalData();
    const {isOpen, openManually, closeManually} = useAutoExpandable(keywords);

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
                <TabView<'labs-private-features' | 'labs-beta-features'>
                    selectedTab={selectedTab}
                    tabs={tabs}
                    onTabChange={setSelectedTab}
                />
            ) : (
                <div className='absolute inset-0 z-0 overflow-hidden opacity-70'>
                    <img className='absolute -right-6 -top-6 dark:opacity-10' src={LabsBubbles} />
                </div>
            )}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Labs, 'Labs');
