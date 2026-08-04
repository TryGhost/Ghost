import React from 'react';
import TopLevelGroup from '@/settings/app/components/top-level-group';
import {Banner, Button, CopyField, CopyFieldActions, CopyFieldContent, CopyFieldCopyButton, CopyFieldLabel, CopyFieldValue} from '@tryghost/shade/components';
import {checkStripeEnabled, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {getPaidActiveTiers, useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {useGlobalData} from '@/settings/app/components/providers/global-data-provider';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {SettingGroupContent} from '@tryghost/shade/patterns';
import {withErrorBoundary} from '@/settings/app/components/error-boundary';

const GiftSubscriptions: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const {settings, siteData, config} = useGlobalData();
    const {data: {tiers: allTiers} = {}} = useBrowseTiers();

    const [paidMembersEnabled, portalPlansJson] = getSettingValues(settings, ['paid_members_enabled', 'portal_plans']) as [boolean, string];
    const portalPlans = JSON.parse(portalPlansJson || '[]') as string[];
    const stripeEnabled = checkStripeEnabled(settings, config);
    const paidTiers = getPaidActiveTiers(allTiers || []).filter(tier => tier.visibility === 'public');
    const hasSellableTier = paidTiers.some(tier => (
        (portalPlans.includes('monthly') && Number(tier.monthly_price) > 0)
        || (portalPlans.includes('yearly') && Number(tier.yearly_price) > 0)
    ));
    const paidSignupAvailable = allTiers === undefined || (paidMembersEnabled !== false && stripeEnabled && hasSellableTier);
    const giftUrl = `${siteData?.url.replace(/\/$/, '')}/#/portal/gift`;

    const openPreview = () => {
        window.open(giftUrl, '_blank');
    };

    return (
        <TopLevelGroup
            customButtons={<Button className='mt-[-5px]' disabled={!paidSignupAvailable} size='sm' type='button' variant='ghost' onClick={() => updateRoute('gift-subscriptions/edit')}>Customize</Button>}
            description={<>Allow your readers to share your work by purchasing a gift subscription for a friend or colleague. <a className='text-green' href="https://ghost.org/help/gift-subscriptions/" rel="noopener noreferrer" target="_blank">Learn more</a></>}
            keywords={keywords}
            navid='gift-subscriptions'
            testId='gift-subscriptions'
            title="Gift subscriptions"
        >
            {!paidSignupAvailable ? (
                <Banner className='bg-muted shadow-none hover:shadow-none' role='status'>
                    Gift subscriptions are unavailable because Portal has no paid membership options. Make a paid tier and monthly or yearly price available in <button className='font-medium text-green' type='button' onClick={() => updateRoute('portal/edit')}>Portal settings</button>.
                </Banner>
            ) : (
                <SettingGroupContent columns={1}>
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
