import React, {useState} from 'react';
import TopLevelGroup from '../../top-level-group';
import {Button, Heading, SettingGroupContent, Toggle} from '@tryghost/admin-x-design-system';
import {Separator} from '@tryghost/shade/components';
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

    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(giftUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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
            <SettingGroupContent columns={1}>
                <Toggle
                    checked={isVisibleInPortal}
                    direction='rtl'
                    disabled={!canGift}
                    gap='gap-0'
                    hint="Adds a gift option to your signup page and members' account area. Your shareable link keeps working even when this is off."
                    label='Show in Portal'
                    testId='gift-subscriptions-toggle'
                    onChange={handleToggle}
                />
                {canGift && (
                    <>
                        <Separator />
                        <div>
                            <Heading level={6}>Shareable link</Heading>
                            <div className='mt-2 flex items-center justify-between gap-3'>
                                <span className='truncate text-sm text-grey-700' data-testid='gift-url'>{giftUrl}</span>
                                <div className='flex shrink-0 gap-1'>
                                    <Button color='clear' data-testid='preview-shareable-link' label='Preview' size='sm' onClick={() => window.open(giftUrl, '_blank')} />
                                    <Button color='light-grey' data-testid='copy-shareable-link' label={copied ? 'Copied' : 'Copy'} size='sm' onClick={handleCopy} />
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </SettingGroupContent>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(GiftSubscriptions, 'Gift subscriptions');
