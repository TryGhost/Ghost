import BetaFeatures from './labs/BetaFeatures';
import LabsBubbles from '../../../assets/images/labs-bg.svg';
import PrivateFeatures from './labs/PrivateFeatures';
import React, {useEffect, useRef, useState} from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import {Button, SettingGroupHeader, Tab, TabView, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {useGlobalData} from '../../providers/GlobalDataProvider';
import {useSearch} from '../../providers/SettingsAppProvider';

type LabsTab = 'labs-private-features' | 'labs-beta-features';

const Labs: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [selectedTab, setSelectedTab] = useState<LabsTab>('labs-beta-features');
    const [isOpen, setIsOpen] = useState(false);
    // Tracks if we opened the panel due to search-only-labs condition
    const autoOpenedRef = useRef(false);
    // Tracks if the user manually toggled the panel (overrides auto-open while the search term is unchanged)
    const userOverrodeRef = useRef(false);
    const lastFilterRef = useRef<string | undefined>(undefined);
    const {config} = useGlobalData();
    const {filter, autoOpenTarget} = useSearch();

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

    useEffect(() => {
        // Reset user override if the filter changed
        if (lastFilterRef.current !== filter) {
            lastFilterRef.current = filter;
            userOverrodeRef.current = false;
        }
    }, [filter]);

    useEffect(() => {
        const targetIsLabs = autoOpenTarget === 'labs';
        if (targetIsLabs) {
            if (!userOverrodeRef.current) {
                setIsOpen(true);
                autoOpenedRef.current = true;
            }
        } else if (autoOpenedRef.current) {
            setIsOpen(false);
            autoOpenedRef.current = false;
        }
    }, [autoOpenTarget]);

    return (
        <TopLevelGroup
            customHeader={
                <div className='z-10 flex items-start justify-between'>
                    <SettingGroupHeader description='This is a testing ground for new or experimental features. They may change, break or inexplicably disappear at any time.' title='Labs' />
                    {
                        !isOpen ?
                            <Button className='mt-[-5px]' color='clear' label='Open' size='sm' onClick={() => {
                                setIsOpen(true);
                                userOverrodeRef.current = true;
                                autoOpenedRef.current = false;
                            }} /> :
                            <Button className='mt-[-5px]' color='grey' label='Close' size='sm' onClick={() => {
                                setIsOpen(false);
                                userOverrodeRef.current = true;
                                autoOpenedRef.current = false;
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
