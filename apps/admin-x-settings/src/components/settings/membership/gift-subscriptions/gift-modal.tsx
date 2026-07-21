import GiftPreview from './gift-preview';
import NiceModal from '@ebay/nice-modal-react';
import React, {useEffect, useMemo} from 'react';
import {APIError} from '@tryghost/admin-x-framework/errors';
import {Checkbox, CurrencyField, Heading, HtmlField, ImageUpload, PreviewModalContent, TextField} from '@tryghost/admin-x-design-system';
import {type Dirtyable, useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import {Separator} from '@tryghost/shade/components';
import {type Setting, type SettingValue, getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {type Tier, getPaidActiveTiers, useBrowseTiers, useEditTier} from '@tryghost/admin-x-framework/api/tiers';
import {getImageUrl, useUploadImage} from '@tryghost/admin-x-framework/api/images';
import {useGlobalData} from '../../../providers/global-data-provider';
import {useRouting} from '@tryghost/admin-x-framework/routing';

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

const GiftSidebar: React.FC<{
    localSettings: Setting[]
    updateSetting: (key: string, value: SettingValue) => void
    localTiers: Tier[]
    updateTier: (tier: Tier) => void
}> = ({localSettings, updateSetting, localTiers, updateTier}) => {
    const {siteData} = useGlobalData();
    const {mutateAsync: uploadImage} = useUploadImage();
    const handleError = useHandleError();

    const [giftPageHeading, giftPageDescription, giftPageImage] = getSettingValues<string | null>(
        localSettings,
        ['gift_page_heading', 'gift_page_description', 'gift_page_image']
    );

    const [giftDurationsJson, portalPlansJson] = getSettingValues(localSettings, ['gift_durations', 'portal_plans']);
    const giftDurations = JSON.parse(giftDurationsJson?.toString() || '[1,12]') as number[];
    const portalPlans = JSON.parse(portalPlansJson?.toString() || '[]') as string[];
    const offeredDurations = DURATION_OPTIONS.filter(({months, anchor}) => giftDurations.includes(months) && portalPlans.includes(anchor));

    const paidTiers = getPaidActiveTiers(localTiers || []);

    // The gift page shows the description in full (no "Show more"), so cap it at
    // a length that always fits on screen alongside the form.
    const descriptionMaxLength = 350;
    const descriptionLength = useMemo(() => {
        const div = document.createElement('div');
        div.innerHTML = giftPageDescription?.toString() || '';
        return div.innerText.trim().length;
    }, [giftPageDescription]);

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

    const toggleDuration = (months: number, checked: boolean) => {
        const next = checked
            ? [...giftDurations, months]
            : giftDurations.filter(m => m !== months);
        updateSetting('gift_durations', JSON.stringify([...new Set(next)].sort((a, b) => a - b)));
    };

    const updateGiftPrice = (tier: Tier, months: number, cents: number) => {
        updateTier({
            ...tier,
            gift_prices: {
                ...(tier.gift_prices || {}),
                [months]: cents > 0 ? cents : null
            }
        });
    };

    const showPricing = offeredDurations.length > 0 && paidTiers.length > 0;

    return (
        <div className='flex flex-col gap-8 pt-4'>
            <div className='flex flex-col gap-6'>
                <TextField
                    maxLength={100}
                    placeholder="Gift a membership"
                    title="Heading"
                    value={giftPageHeading || ''}
                    onChange={e => updateSetting('gift_page_heading', e.target.value || null)}
                />
                <HtmlField
                    hint={<>Sell the value of a gift membership to potential buyers. Shown in full on the gift page — keep it under <strong>{descriptionMaxLength}</strong> characters so it fits. You&apos;ve used <strong className={descriptionLength > descriptionMaxLength ? 'text-red' : 'text-green'}>{descriptionLength}</strong></>}
                    maxLength={descriptionMaxLength}
                    nodes='MINIMAL_NODES'
                    placeholder={`Share a full membership to ${siteData?.title || 'your site'} with a friend or colleague`}
                    title="Description"
                    value={giftPageDescription?.toString() || ''}
                    onChange={html => updateSetting('gift_page_description', html || null)}
                />
                <div>
                    <Heading className='mb-2' level={6}>Image</Heading>
                    <ImageUpload
                        deleteButtonClassName='!top-1 !right-1'
                        height={giftPageImage ? '120px' : '52px'}
                        id='gift-page-image'
                        imageURL={giftPageImage || ''}
                        onDelete={() => updateSetting('gift_page_image', null)}
                        onUpload={handleImageUpload}
                    >
                        Upload gift page image
                    </ImageUpload>
                    <p className='mt-1 text-xs text-grey-700'>Shown above the heading at up to 140px tall — logos and wide images work best.</p>
                </div>
            </div>

            <div>
                <Heading level={6}>Durations</Heading>
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
                                value={String(months)}
                                onChange={checked => toggleDuration(months, checked)}
                            />
                        );
                    })}
                </div>
                {offeredDurations.length === 0 && (
                    <p className='mt-2 text-sm text-grey-700'>No durations are available, so the gift page is currently unavailable to readers.</p>
                )}
            </div>

            {showPricing && (
                <div>
                    <Heading level={6}>Pricing</Heading>
                    <p className='mt-1 text-sm text-grey-700'>Set a one-time gift price per duration, or leave a field blank to charge the default shown in grey (the monthly price × the duration, and the yearly price for a year).</p>
                    <div className='mt-4 flex flex-col gap-6'>
                        {paidTiers.map((tier, i) => (
                            <React.Fragment key={tier.id}>
                                {i > 0 && <Separator />}
                                <div>
                                    {paidTiers.length > 1 && (
                                        <Heading className='mb-3' level={6}>{tier.name}</Heading>
                                    )}
                                    <div className='flex flex-col gap-3'>
                                        {offeredDurations.map(({months, label}) => (
                                            <CurrencyField
                                                key={months}
                                                placeholder={String(getDerivedPriceInCents(tier, months) / 100)}
                                                rightPlaceholder={tier.currency}
                                                title={label}
                                                valueInCents={tier.gift_prices?.[months] ?? ''}
                                                onChange={cents => updateGiftPrice(tier, months, cents)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const GiftModal: React.FC = () => {
    const {updateRoute} = useRouting();
    const handleError = useHandleError();
    const {settings} = useGlobalData();
    const {mutateAsync: editSettings} = useEditSettings();
    const {data: {tiers: allTiers} = {}} = useBrowseTiers();
    const {mutateAsync: editTier} = useEditTier();

    const {formState, setFormState, saveState, handleSave, updateForm, okProps} = useForm({
        initialState: {
            settings: settings as Dirtyable<Setting>[],
            tiers: (allTiers as Dirtyable<Tier>[]) || []
        },
        savingDelay: 500,
        onSave: async () => {
            await Promise.all(formState.tiers.filter(({dirty}) => dirty).map(tier => editTier(tier)));
            setFormState(state => ({...state, tiers: state.tiers.map(tier => ({...tier, dirty: false}))}));

            const changedSettings = formState.settings.filter(setting => setting.dirty);
            if (changedSettings.length) {
                await editSettings(changedSettings);
                setFormState(state => ({...state, settings: state.settings.map(setting => ({...setting, dirty: false}))}));
            }
        },
        onSaveError: handleError
    });

    useEffect(() => {
        if (!formState.tiers.length && allTiers?.length) {
            setFormState(state => ({...state, tiers: allTiers as Dirtyable<Tier>[]}));
        }
    }, [allTiers, formState.tiers, setFormState]);

    const updateSetting = (key: string, value: SettingValue) => {
        updateForm(state => ({
            ...state,
            settings: state.settings.map(setting => (
                setting.key === key ? {...setting, value, dirty: true} : setting
            ))
        }));
    };

    const updateTier = (newTier: Tier) => {
        updateForm(state => ({
            ...state,
            tiers: state.tiers.map(tier => (
                tier.id === newTier.id ? {...newTier, dirty: true} : tier
            ))
        }));
    };

    const sidebar = (
        <div className='pt-4'>
            <GiftSidebar
                localSettings={formState.settings}
                localTiers={formState.tiers}
                updateSetting={updateSetting}
                updateTier={updateTier}
            />
        </div>
    );

    const preview = <GiftPreview localSettings={formState.settings} />;

    return (
        <PreviewModalContent
            afterClose={() => updateRoute('gift-subscriptions')}
            buttonsDisabled={okProps.disabled}
            cancelLabel='Close'
            deviceSelector={false}
            dirty={saveState === 'unsaved'}
            okColor={okProps.color}
            okLabel={okProps.label || 'Save'}
            preview={preview}
            previewBgColor='greygradient'
            sidebar={sidebar}
            testId='gift-modal'
            title='Gift subscriptions'
            onOk={async () => {
                await handleSave({force: true});
            }}
        />
    );
};

export default NiceModal.create(GiftModal);
