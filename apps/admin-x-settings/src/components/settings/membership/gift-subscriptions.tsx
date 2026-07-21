import React from 'react';
import TopLevelGroup from '../../top-level-group';
import {Button, Heading, Toggle} from '@tryghost/admin-x-design-system';
import {getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {withErrorBoundary} from '../../error-boundary';

const GiftSubscriptions: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const {settings, siteData} = useGlobalData();
    const {mutateAsync: editSettings} = useEditSettings();
    const handleError = useHandleError();

    const [giftSubscriptionsEnabled, paidMembersEnabled] = getSettingValues(settings, ['gift_subscriptions_enabled', 'paid_members_enabled']) as [boolean, boolean];
    const isVisibleInPortal = giftSubscriptionsEnabled !== false;
    const canGift = paidMembersEnabled !== false;

    const giftUrl = `${siteData?.url.replace(/\/$/, '')}/#/portal/gift`;

    const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            await editSettings([{key: 'gift_subscriptions_enabled', value: e.target.checked}]);
        } catch (error) {
            handleError(error);
        }
    };

    return (
        <TopLevelGroup
            customButtons={<Button className='mt-[-5px]' color='clear' disabled={!canGift} label='Customize' size='sm' onClick={() => updateRoute('gift-subscriptions/edit')}/>}
            description={<>Allow your readers to share your work by purchasing a gift subscription for a friend or colleague. <a className='text-green' href="https://ghost.org/help/gift-subscriptions/" rel="noopener noreferrer" target="_blank">Learn more</a></>}
            keywords={keywords}
            navid='gift-subscriptions'
            testId='gift-subscriptions'
            title="Gift subscriptions"
        >
            <div className='flex flex-col gap-4'>
                <div className='flex items-start justify-between gap-4'>
                    <div>
                        <Heading level={6}>Show in Portal</Heading>
                        <p className='mt-0.5 max-w-xl text-sm text-grey-700'>Display the gift option inside Portal. The shareable link below keeps working even when this is off.</p>
                    </div>
                    <Toggle checked={isVisibleInPortal} disabled={!canGift} testId='gift-subscriptions-toggle' onChange={handleToggle} />
                </div>
                {canGift && (
                    <div className='w-full border-t border-grey-100 pt-3'>
                        <div className='flex items-center gap-2'>
                            <Heading level={6}>Shareable link</Heading>
                        </div>
                        <div className='group relative mt-0 flex w-full items-center justify-between gap-2 overflow-hidden border-b border-transparent pt-1 pb-2 hover:border-grey-300 dark:hover:border-grey-600'>
                            <span className='truncate' data-testid='gift-url'>{giftUrl}</span>
                            <div className='flex gap-1 bg-white pl-1 dark:bg-black'>
                                <Button color='clear' data-testid='preview-shareable-link' label='Preview' size='sm' onClick={() => window.open(giftUrl, '_blank')} />
                                <Button color='light-grey' data-testid='copy-shareable-link' label='Copy link' size='sm' onClick={() => navigator.clipboard.writeText(giftUrl)} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(GiftSubscriptions, 'Gift subscriptions');
