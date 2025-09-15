import BetaFeatures from './labs/BetaFeatures';
import LabsBubbles from '../../../assets/images/labs-bg.svg';
import PrivateFeatures from './labs/PrivateFeatures';
import React, {useEffect, useState} from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import {Button, SettingGroupHeader, Tab, TabView, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {useGlobalData} from '../../providers/GlobalDataProvider';
import {useSearch} from '../../providers/SettingsAppProvider';

type LabsTab = 'labs-private-features' | 'labs-beta-features';

const Labs: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [selectedTab, setSelectedTab] = useState<LabsTab>('labs-beta-features');
    const [isOpen, setIsOpen] = useState(false);
    const [wasManuallyControlled, setWasManuallyControlled] = useState(false);
    const [lastAutoOpenFilter, setLastAutoOpenFilter] = useState<string | null>(null);
    const {config} = useGlobalData();
    const {filter, getVisibleComponents, checkVisible} = useSearch();

    // Auto-open when Labs is the only visible component from a search
    useEffect(() => {
        const isVisible = checkVisible(keywords);
        const visibleComponents = getVisibleComponents();
        const isOnlyVisible = filter && isVisible && visibleComponents.size === 1;

        // Reset manual control state when filter changes (allows auto-open for new searches)
        if (filter !== lastAutoOpenFilter && lastAutoOpenFilter !== null) {
            setWasManuallyControlled(false);
        }

        // Auto-open only if:
        // 1. Labs is the only visible component
        // 2. User hasn't manually controlled the panel during this search session
        // 3. We haven't already auto-opened for this search term
        if (isOnlyVisible && !wasManuallyControlled && lastAutoOpenFilter !== filter) {
            setIsOpen(true);
            setLastAutoOpenFilter(filter);
        } else if (!isOnlyVisible && !wasManuallyControlled && lastAutoOpenFilter) {
            // Auto-close when Labs is no longer the only visible component
            // but only if it was auto-opened (not manually controlled)
            setIsOpen(false);
        }

        // Reset state when search is cleared
        if (!filter) {
            setWasManuallyControlled(false);
            setLastAutoOpenFilter(null);
            // Close only if it was auto-opened
            if (!wasManuallyControlled && lastAutoOpenFilter) {
                setIsOpen(false);
            }
        }
    }, [filter, wasManuallyControlled, lastAutoOpenFilter, keywords, checkVisible, getVisibleComponents]);

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
                    <SettingGroupHeader description='This is a testing ground for new or experimental features. They may change, break or inexplicably disappear at any time.' title='Labs' />
                    {
                        !isOpen ?
                            <Button className='mt-[-5px]' color='clear' label='Open' size='sm' onClick={() => {
                                setIsOpen(true);
                                setWasManuallyControlled(true); // Mark as manually controlled
                            }} /> :
                            <Button className='mt-[-5px]' color='grey' label='Close' size='sm' onClick={() => {
                                setIsOpen(false);
                                setWasManuallyControlled(true); // Mark as manually controlled
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
                <TabView<'labs-private-features' | 'labs-beta-features'> selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />
                :
                <div className='absolute inset-0 z-0 overflow-hidden opacity-70'>
                    <img className='absolute -right-6 -top-6 dark:opacity-10' src={LabsBubbles} />
                </div>
            }
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Labs, 'Labs');
