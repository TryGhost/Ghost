import React from 'react';
import TopLevelGroup from '../../top-level-group';
import {Button, CopyField, CopyFieldActions, CopyFieldContent, CopyFieldCopyButton, CopyFieldLabel, CopyFieldValue, Field, FieldContent, FieldDescription, FieldLabel, Separator, Switch} from '@tryghost/shade/components';
import {SettingGroupContent} from '@tryghost/admin-x-design-system';
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

    const openPreview = () => {
        window.open(giftUrl, '_blank');
    };

    const handleToggle = async (checked: boolean) => {
        try {
            await editSettings([{key: 'gift_subscriptions_enabled', value: checked}]);
        } catch (error) {
            handleError(error);
        }
    };

    return (
        <TopLevelGroup
            customButtons={<Button className='mt-[-5px]' disabled={!canGift} size='sm' type='button' variant='ghost' onClick={() => updateRoute('gift-subscriptions/edit')}>Customize</Button>}
            description={<>Allow your readers to share your work by purchasing a gift subscription for a friend or colleague. <a className='text-green' href="https://ghost.org/help/gift-subscriptions/" rel="noopener noreferrer" target="_blank">Learn more</a></>}
            keywords={keywords}
            navid='gift-subscriptions'
            testId='gift-subscriptions'
            title="Gift subscriptions"
        >
            {canGift && (
                <SettingGroupContent columns={1}>
                    <Field orientation='horizontal'>
                        <FieldContent>
                            <FieldLabel htmlFor='gift-subscriptions-toggle'>Show in Portal</FieldLabel>
                            <FieldDescription>Adds a gift option to your signup page and members&apos; account area. Your shareable link keeps working even when this is off.</FieldDescription>
                        </FieldContent>
                        <Switch
                            checked={isVisibleInPortal}
                            data-testid='gift-subscriptions-toggle'
                            id='gift-subscriptions-toggle'
                            onCheckedChange={handleToggle}
                        />
                    </Field>
                    <Separator />
                    <CopyField value={giftUrl}>
                        <CopyFieldLabel>Shareable link</CopyFieldLabel>
                        <CopyFieldContent>
                            <CopyFieldValue data-testid='gift-url' />
                            <CopyFieldActions>
                                <Button data-testid='preview-shareable-link' size='sm' type='button' variant='ghost' onClick={openPreview}>Preview</Button>
                                <CopyFieldCopyButton copiedLabel='Copied' data-testid='copy-shareable-link'>Copy link</CopyFieldCopyButton>
                            </CopyFieldActions>
                        </CopyFieldContent>
                    </CopyField>
                </SettingGroupContent>
            )}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(GiftSubscriptions, 'Gift subscriptions');
