import AlphaFeatures from './labs/AlphaFeatures';
import BetaFeatures from './labs/BetaFeatures';
import LabsBubbles from '../../../assets/images/labs-bg.svg';
import React, {useState} from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import {Button, SettingGroupHeader, Tab, TabView, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {useGlobalData} from '../../providers/GlobalDataProvider';

type LabsTab = 'labs-alpha-features' | 'labs-beta-features';

const Labs: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [selectedTab, setSelectedTab] = useState<LabsTab>('labs-beta-features');
    const [isOpen, setIsOpen] = useState(false);
    const {config} = useGlobalData();

    const tabs = [
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
        <TopLevelGroup
            customHeader={
                <div className='z-10 flex items-start justify-between'>
                    <SettingGroupHeader description='This is a testing ground for new or experimental features. They may change, break or inexplicably disappear at any time.' title='Labs' />
                    {
                        !isOpen ?
                            <Button className='mt-[-5px]' color='clear' label='Open' size='sm' onClick={() => {
                                setIsOpen(true);
                            }} /> :
                            <Button className='mt-[-5px]' color='grey' label='Close' size='sm' onClick={() => {
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
                <TabView<'labs-alpha-features' | 'labs-beta-features'> selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />
                :
                <div className='absolute inset-0 z-0 overflow-hidden opacity-70'>
                    <img className='absolute -right-6 -top-6 dark:opacity-10' src={LabsBubbles} />
                </div>
            }
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Labs, 'Labs');
