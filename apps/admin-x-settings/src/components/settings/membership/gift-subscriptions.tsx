import React, {useEffect, useMemo, useState} from 'react';
import TopLevelGroup from '../../top-level-group';
import useSettingGroup from '../../../hooks/use-setting-group';
import {APIError} from '@tryghost/admin-x-framework/errors';
import {Button, Checkbox, CurrencyField, Heading, HtmlField, ImageUpload, SettingGroupContent, TextField, Toggle, confirmIfDirty} from '@tryghost/admin-x-design-system';
import {getImageUrl, useUploadImage} from '@tryghost/admin-x-framework/api/images';
import {getPaidActiveTiers, useBrowseTiers, useEditTier} from '@tryghost/admin-x-framework/api/tiers';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {withErrorBoundary} from '../../error-boundary';
import type {Tier} from '@tryghost/admin-x-framework/api/tiers';

// Durations are month-counts; multiples of 12 are anchored to the yearly plan
// and price, everything else to the monthly plan and price. A duration can
// only be offered while its anchor plan is enabled in Portal settings.
const DURATION_OPTIONS = [
    {months: 1, label: '1 month', anchor: 'monthly'},
    {months: 3, label: '3 months', anchor: 'monthly'},
    {months: 6, label: '6 months', anchor: 'monthly'},
    {months: 12, label: '1 year', anchor: 'yearly'}
] as const;

// Price a tier's gift for a duration when no explicit gift price is set
const getDerivedPriceInCents = (tier: Tier, months: number) => {
    if (months % 12 === 0) {
        return (tier.yearly_price || 0) * (months / 12);
    }
    return (tier.monthly_price || 0) * months;
};

// months -> price in cents, null meaning "cleared, use derived pricing"
type PendingGiftPrices = Record<string, Record<number, number | null>>;

const GiftSubscriptions: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        localSettings,
        siteData,
        updateSetting,
        saveState,
        handleSave,
        handleCancel,
        handleEditingChange
    } = useSettingGroup();

    const {mutateAsync: uploadImage} = useUploadImage();
    const handleError = useHandleError();

    const {data: {tiers: allTiers} = {tiers: []}} = useBrowseTiers();
    const {mutateAsync: editTier} = useEditTier();
    const paidTiers = getPaidActiveTiers(allTiers || []);

    const [giftPageHeading, giftPageDescription, giftPageImage] = getSettingValues<string | null>(
        localSettings,
        ['gift_page_heading', 'gift_page_description', 'gift_page_image']
    );

    const [giftSubscriptionsEnabled] = getSettingValues(localSettings, ['gift_subscriptions_enabled']) as [boolean];

    const [giftDurationsJson, portalPlansJson] = getSettingValues(localSettings, ['gift_durations', 'portal_plans']);
    const giftDurations = JSON.parse(giftDurationsJson?.toString() || '[1,12]') as number[];
    const portalPlans = JSON.parse(portalPlansJson?.toString() || '[]') as string[];

    const offeredDurations = DURATION_OPTIONS.filter(({months, anchor}) => giftDurations.includes(months) && portalPlans.includes(anchor));

    const [copied, setCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [pendingGiftPrices, setPendingGiftPrices] = useState<PendingGiftPrices>({});
    // Bumped after save/cancel to remount the currency fields, which keep local input state
    const [fieldsResetKey, setFieldsResetKey] = useState(0);

    // Text over this length is collapsed behind a "Show more" toggle on the gift page
    const descriptionRecommendedLength = 240;
    const descriptionLength = useMemo(() => {
        const div = document.createElement('div');
        div.innerHTML = giftPageDescription?.toString() || '';
        return div.innerText.trim().length;
    }, [giftPageDescription]);

    // Watch for changes in localSettings and update editing state
    useEffect(() => {
        const hasChanges = localSettings.some(setting => setting.dirty);
        if (hasChanges && !isEditing) {
            setIsEditing(true);
            handleEditingChange(true);
        }
    }, [localSettings, isEditing, handleEditingChange]);

    const giftUrl = `${siteData?.url.replace(/\/$/, '')}/#/portal/gift`;

    const copyGiftUrl = () => {
        navigator.clipboard.writeText(giftUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const openPreview = () => {
        confirmIfDirty(saveState === 'unsaved', () => window.open(giftUrl, '_blank'));
    };

    const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSetting('gift_subscriptions_enabled', e.target.checked);
    };

    const handleImageUpload = async (file: File) => {
        try {
            const imageUrl = getImageUrl(await uploadImage({file}));
            updateSetting('gift_page_image', imageUrl);
        } catch (e) {
            const error = e as APIError;
            if (error.response!.status === 415) {
                error.message = 'Unsupported file type';
            }
            handleError(error);
        }
    };

    const handleImageDelete = () => {
        updateSetting('gift_page_image', null);
    };

    const toggleDuration = (months: number, checked: boolean) => {
        const next = checked
            ? [...giftDurations, months]
            : giftDurations.filter(m => m !== months);
        updateSetting('gift_durations', JSON.stringify([...new Set(next)].sort((a, b) => a - b)));
    };

    const updateGiftPrice = (tierId: string, months: number, cents: number) => {
        setPendingGiftPrices(state => ({
            ...state,
            [tierId]: {
                ...state[tierId],
                [months]: cents > 0 ? cents : null
            }
        }));
        setIsEditing(true);
        handleEditingChange(true);
    };

    const getGiftPriceValue = (tier: Tier, months: number): number | '' => {
        const pending = pendingGiftPrices[tier.id]?.[months];
        if (pending !== undefined) {
            return pending ?? '';
        }
        return tier.gift_prices?.[months] ?? '';
    };

    const saveGiftPrices = async () => {
        for (const [tierId, prices] of Object.entries(pendingGiftPrices)) {
            const tier = paidTiers.find(({id}) => id === tierId);
            if (!tier) {
                continue;
            }
            const merged: Record<number, number | null> = {...(tier.gift_prices || {})};
            for (const [months, cents] of Object.entries(prices)) {
                merged[Number(months)] = cents;
            }
            await editTier({...tier, gift_prices: merged});
        }
        setPendingGiftPrices({});
    };

    const handleCancelClick = () => {
        setPendingGiftPrices({});
        setFieldsResetKey(key => key + 1);
        handleCancel();
        setIsEditing(false);
    };

    const handleSaveClick = async () => {
        try {
            await saveGiftPrices();
        } catch (error) {
            handleError(error);
            return;
        }
        const response = await handleSave();
        if (response) {
            setIsEditing(false);
            setFieldsResetKey(key => key + 1);
        }
    };

    const showPricing = offeredDurations.length > 0 && paidTiers.length > 0;

    return (
        <TopLevelGroup
            description={<>Allow your readers to share your work by purchasing a gift subscription for a friend or colleague. <a className='text-green' href="https://ghost.org/help/gift-subscriptions/" rel="noopener noreferrer" target="_blank">Learn more</a></>}
            isEditing={isEditing}
            keywords={keywords}
            navid='gift-subscriptions'
            saveState={saveState}
            testId='gift-subscriptions'
            title="Gift subscriptions"
            hideEditButton
            onCancel={handleCancelClick}
            onEditingChange={setIsEditing}
            onSave={handleSaveClick}
        >
            <SettingGroupContent columns={1}>
                <Toggle
                    checked={giftSubscriptionsEnabled !== false}
                    direction='rtl'
                    label='Enable gift subscriptions'
                    testId='gift-subscriptions-toggle'
                    onChange={handleToggleChange}
                />
                {giftSubscriptionsEnabled !== false && (
                    <>
                        <TextField
                            maxLength={100}
                            placeholder="Gift a membership"
                            title="Heading"
                            value={giftPageHeading || ''}
                            onChange={e => updateSetting('gift_page_heading', e.target.value || null)}
                        />
                        <HtmlField
                            hint={<>Sell the value of a gift membership to potential buyers. Recommended: <strong>{descriptionRecommendedLength}</strong> characters. You&apos;ve used <strong className={descriptionLength > descriptionRecommendedLength ? 'text-yellow-500' : 'text-green'}>{descriptionLength}</strong>{descriptionLength > descriptionRecommendedLength ? ' — longer text is collapsed behind a "Show more" toggle' : ''}</>}
                            nodes='MINIMAL_NODES'
                            placeholder={`Share a full membership to ${siteData?.title || 'your site'} with a friend or colleague`}
                            title="Description"
                            value={giftPageDescription?.toString() || ''}
                            onChange={html => updateSetting('gift_page_description', html || null)}
                        />
                        <div>
                            <Heading className='mb-2' level={6} grey>Image</Heading>
                            <ImageUpload
                                deleteButtonClassName='!top-1 !right-1'
                                height={giftPageImage ? '160px' : '60px'}
                                id='gift-page-image'
                                imageURL={giftPageImage || ''}
                                onDelete={handleImageDelete}
                                onUpload={handleImageUpload}
                            >
                                Upload gift page image
                            </ImageUpload>
                            <p className='mt-1 text-xs text-grey-700'>Shown above the heading at up to 140px tall — logos and wide images work best.</p>
                        </div>
                        <div className='w-100'>
                            <div className='flex items-center gap-2'>
                                <Heading level={6}>Durations</Heading>
                            </div>
                            <div className='mt-3 flex flex-col gap-2'>
                                {DURATION_OPTIONS.map(({months, label, anchor}) => {
                                    const anchorAvailable = portalPlans.includes(anchor);
                                    return (
                                        <Checkbox
                                            key={String(months)}
                                            checked={giftDurations.includes(months) && anchorAvailable}
                                            disabled={!anchorAvailable}
                                            hint={!anchorAvailable ? `Requires the ${anchor} plan to be enabled in Portal settings` : undefined}
                                            label={label}
                                            testId={`gift-duration-${months}`}
                                            value={String(months)}
                                            onChange={(checked) => {
                                                toggleDuration(months, checked);
                                            }}
                                        />
                                    );
                                })}
                            </div>
                            {offeredDurations.length === 0 && (
                                <p className='mt-2 text-sm text-grey-700'>No durations are available, so the gift page is currently unavailable to readers.</p>
                            )}
                        </div>
                        {showPricing && (
                            <div className='w-100'>
                                <div className='flex items-center gap-2'>
                                    <Heading level={6}>Pricing</Heading>
                                </div>
                                <p className='mt-1 text-sm text-grey-700'>Leave a price empty to charge the {paidTiers.length > 1 ? 'tier' : ''} monthly price multiplied by the duration, and the yearly price for 1 year.</p>
                                <div className='mt-3 flex flex-col gap-4'>
                                    {paidTiers.map(tier => (
                                        <div key={`${tier.id}-${fieldsResetKey}`}>
                                            {paidTiers.length > 1 && (
                                                <div className='mb-2 text-sm font-medium'>{tier.name}</div>
                                            )}
                                            <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
                                                {offeredDurations.map(({months, label}) => (
                                                    <CurrencyField
                                                        key={months}
                                                        placeholder={String(getDerivedPriceInCents(tier, months) / 100)}
                                                        rightPlaceholder={tier.currency}
                                                        title={label}
                                                        valueInCents={getGiftPriceValue(tier, months)}
                                                        onChange={(cents) => {
                                                            updateGiftPrice(tier.id, months, cents);
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className='w-100'>
                            <div className='flex items-center gap-2'>
                                <Heading level={6}>Shareable link</Heading>
                            </div>
                            <div className='group relative mt-0 flex w-100 items-center justify-between overflow-hidden border-b border-transparent pt-1 pb-2 hover:border-grey-300 dark:hover:border-grey-600'>
                                <span data-testid='gift-url'>{giftUrl}</span>
                                <div className='invisible flex gap-1 bg-white pl-1 group-hover:visible dark:bg-black'>
                                    <Button color='clear' data-testid='preview-shareable-link' label={'Preview'} size='sm' onClick={openPreview} />
                                    <Button color='light-grey' data-testid='copy-shareable-link' label={copied ? 'Copied' : 'Copy link'} size='sm' onClick={copyGiftUrl} />
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
