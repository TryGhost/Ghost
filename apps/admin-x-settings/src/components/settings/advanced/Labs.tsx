import AlphaFeatures from './labs/AlphaFeatures';
import BetaFeatures from './labs/BetaFeatures';
import Button from '../../../admin-x-ds/global/Button';
import LabsBubbles from '../../../assets/images/labs-bg.svg';
import MigrationOptions from './labs/MigrationOptions';
import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupHeader from '../../../admin-x-ds/settings/SettingGroupHeader';
import TabView, {Tab} from '../../../admin-x-ds/global/TabView';
import {useGlobalData} from '../../providers/GlobalDataProvider';
import {withErrorBoundary} from '../../../admin-x-ds/global/ErrorBoundary';

type LabsTab = 'labs-migration-options' | 'labs-alpha-features' | 'labs-beta-features';

const Labs: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [selectedTab, setSelectedTab] = useState<LabsTab>('labs-migration-options');
    const [isOpen, setIsOpen] = useState(false);
    const {config} = useGlobalData();

    const tabs = [
        {
            id: 'labs-migration-options',
            title: 'Migration options',
            contents: <MigrationOptions />
        },
        {
            id: 'labs-beta-features',
            title: 'Beta features',
            contents: <BetaFeatures />
        },
        config.enableDeveloperExperiments && ({
            id: 'labs-alpha-features',
            title: 'Alpha features',
            contents: <AlphaFeatures />
        })
    ].filter(Boolean) as Tab<LabsTab>[];

    return (
        <SettingGroup
            customHeader={
                <div className='z-10 flex items-start justify-between'>
                    <SettingGroupHeader description='This is a testing ground for new or experimental features. They may change, break or inexplicably disappear at any time.' title='Labs' />
                    {
                        !isOpen ?
                            <Button color='green' label='Open' link linkWithPadding onClick={() => {
                                setIsOpen(true);
                            }} /> :
                            <Button color='green' label='Close' link linkWithPadding onClick={() => {
                                setIsOpen(false);
                            }} />
                    }
                </div>
            }
            isEditing={isOpen}
            keywords={keywords}
            navid='labs'
            testId='labs'
        >
            {isOpen ?
                <TabView<'labs-migration-options' | 'labs-alpha-features' | 'labs-beta-features'> selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />
                :
                <div className='absolute inset-0 z-0 overflow-hidden opacity-70'>
                    <img className='absolute -right-6 -top-6 dark:opacity-10' src={LabsBubbles} />
                </div>
            }
        </SettingGroup>
    );
};

export default withErrorBoundary(Labs, 'Labs');
