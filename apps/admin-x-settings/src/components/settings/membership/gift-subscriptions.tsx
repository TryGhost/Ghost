import React from 'react';
import TopLevelGroup from '../../top-level-group';
import {Banner, Button, CopyField, CopyFieldActions, CopyFieldContent, CopyFieldCopyButton, CopyFieldLabel, CopyFieldValue} from '@tryghost/shade/components';
import {SettingGroupContent} from '@tryghost/admin-x-design-system';
import {checkStripeEnabled, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {getPaidActiveTiers, useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {useGlobalData} from '../../providers/global-data-provider';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {withErrorBoundary} from '../../error-boundary';

const GiftSubscriptions: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const {settings, siteData, config} = useGlobalData();
    const {data: {tiers: allTiers} = {}} = useBrowseTiers();

    const [paidMembersEnabled, portalPlansJson] = getSettingValues(settings, ['paid_members_enabled', 'portal_plans']) as [boolean, string];
    const portalPlans = JSON.parse(portalPlansJson?.toString() || '[]') as string[];
    const stripeEnabled = checkStripeEnabled(settings, config!);

    // Gifting can only sell what the site already sells, so anything that stops
    // paid membership stops gifting too. With any of it missing there's nothing
    // to customize, so the modal — where the gift-specific tier and duration
    // switches live — stays closed and the reason is stated here instead.
    // Switching everything off inside the modal is a separate case, called out
    // in the modal itself.
    //
    // The two Portal cases are fixed under Portal → signup options, in
    // "Available tiers" and "Available prices" — the wording points at those,
    // and the Portal modal opens on that tab by default.
    //
    // Tiers arrive a render late, so nothing is judged unavailable until they
    // do — otherwise every load flashes a message before settling.
    const hasVisiblePaidTier = getPaidActiveTiers(allTiers || []).some(tier => tier.visibility === 'public');
    const hasGiftablePlan = portalPlans.includes('monthly') || portalPlans.includes('yearly');

    const settingsLink = (route: string, label: string) => (
        <button className='font-medium text-green' type='button' onClick={() => updateRoute(route)}>{label}</button>
    );

    // Ordered by what has to be true first: paid membership at all (Stripe,
    // then signup access — the two halves of paid_members_enabled), then what
    // Portal puts on sale. Each points at the screen that fixes it.
    const unavailableReason = (() => {
        if (!allTiers) {
            return null;
        }
        if (paidMembersEnabled === false) {
            return !stripeEnabled
                ? <>To offer gift subscriptions, connect {settingsLink('stripe-connect', 'Stripe')}.</>
                : <>To offer gift subscriptions, let people sign up in {settingsLink('members', 'Access settings')}.</>;
        }
        if (!hasVisiblePaidTier) {
            return <>To offer gift subscriptions, make at least one paid tier available in {settingsLink('portal/edit', 'Portal settings')}.</>;
        }
        if (!hasGiftablePlan) {
            return <>To offer gift subscriptions, make a monthly or yearly price available in {settingsLink('portal/edit', 'Portal settings')}.</>;
        }
        return null;
    })();
    const canGift = !unavailableReason;

    const giftUrl = `${siteData?.url.replace(/\/$/, '')}/#/portal/gift`;

    const openPreview = () => {
        window.open(giftUrl, '_blank');
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
            {unavailableReason && (
                // Neutral callout, matching the one analytics settings show
                // when web analytics isn't configured. The surface is
                // overridden because the banner itself isn't clickable — only
                // the link inside it is, and the default variant's card shadow
                // would suggest the whole box was a target.
                <Banner className='bg-muted shadow-none hover:shadow-none' role='status'>{unavailableReason}</Banner>
            )}
            {canGift && (
                <SettingGroupContent columns={1}>
                    {/* No global on/off switch here: where the gift option
                        shows is controlled per surface — the signup page link
                        under Portal → signup options, the account page card
                        under Portal → account page. */}
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
