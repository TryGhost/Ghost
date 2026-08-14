import BetaFeatures from './labs/beta-features';
import LabsBubbles from '../../../assets/images/labs-bg.svg';
import PrivateFeatures from './labs/private-features';
import React, {useState} from 'react';
import TopLevelGroup from '../../top-level-group';
import {Button, Tabs, TabsContent, TabsList, TabsTrigger} from '@tryghost/shade/components';
import {useAutoExpandable} from '../../../hooks/use-auto-expandable';
import {useGlobalData} from '../../providers/global-data-provider';
import {withErrorBoundary} from '../../error-boundary';

type LabsTab = 'labs-private-features' | 'labs-beta-features';

const Labs: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [selectedTab, setSelectedTab] = useState<LabsTab>('labs-beta-features');
    const {config} = useGlobalData();
    const {isOpen, openManually, closeManually} = useAutoExpandable(keywords);

    return (
        <TopLevelGroup
            customButtons={(
                <Button
                    className='mt-[-5px]'
                    size='sm'
                    type='button'
                    variant={isOpen ? 'secondary' : 'ghost'}
                    onClick={isOpen ? closeManually : openManually}
                >{isOpen ? 'Close' : 'Open'}</Button>
            )}
            description='This is a testing ground for new or experimental features. They may change, break or inexplicably disappear at any time.'
            isEditing={isOpen}
            keywords={keywords}
            navid='labs'
            testId='labs'
            title='Labs'
        >
            {isOpen ? (
                <Tabs value={selectedTab} variant='underline' onValueChange={value => setSelectedTab(value as LabsTab)}>
                    <TabsList>
                        <TabsTrigger value='labs-beta-features'>Beta features</TabsTrigger>
                        {config.enableDeveloperExperiments && <TabsTrigger value='labs-private-features'>Private features</TabsTrigger>}
                    </TabsList>
                    <TabsContent value='labs-beta-features'><BetaFeatures /></TabsContent>
                    {config.enableDeveloperExperiments && <TabsContent value='labs-private-features'><PrivateFeatures /></TabsContent>}
                </Tabs>
            ) : (
                <div className='absolute inset-0 z-0 overflow-hidden opacity-70'>
                    <img className='absolute -top-6 -right-6 dark:opacity-10' src={LabsBubbles} />
                </div>
            )}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Labs, 'Labs');
