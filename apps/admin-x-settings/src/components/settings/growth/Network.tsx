import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import {Icon, SettingGroupContent, Toggle, withErrorBoundary} from '@tryghost/admin-x-design-system';

const Network: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const enableToggle = (
        <>
            <Toggle
                checked={true}
                direction='rtl'
                onChange={() => {}}
            />
        </>
    );

    const domainIssue = true;

    return (<TopLevelGroup
        customButtons={enableToggle}
        description='Make your content visible to millions across Flipboard, Mastodon, Threads, Bluesky, and WordPress.'
        keywords={keywords}
        navid='network'
        testId='network'
        title='Network'
    >
        <SettingGroupContent
            columns={1}
            values={[
                {
                    key: 'private',
                    value:
                        domainIssue &&
                        <div className='flex w-full gap-1.5 rounded-md border border-grey-200 bg-grey-75 p-3 text-sm'>
                            <Icon name='info' size={16} />
                            <div className='-mt-0.5'>
                                Network is disabled because your domain isn’t configured correctly. <a className='text-green' href="https://ghost.org/docs" rel="noopener noreferrer" target="_blank">Learn more &rarr;</a>
                            </div>
                        </div>
                }
            ]}
        />
    </TopLevelGroup>);
};

export default withErrorBoundary(Network, 'Network');
