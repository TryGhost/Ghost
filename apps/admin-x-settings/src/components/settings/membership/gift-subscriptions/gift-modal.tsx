import GiftDurationsPrototype from './gift-durations-prototype';
import GiftPreview from './gift-preview';
import HtmlField from '../../../html-field';
import NiceModal from '@ebay/nice-modal-react';
import React, {useEffect, useMemo} from 'react';
import useCurrencyInput from '../../../../hooks/use-currency-input';
import {APIError} from '@tryghost/admin-x-framework/errors';
import {Checkbox, Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldSet, InputGroup, InputGroupAddon, InputGroupInput, InputGroupText, Separator} from '@tryghost/shade/components';
import {type Dirtyable, useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import {ImageUpload, ImageUploadAction, ImageUploadActions, ImageUploadDropzone, ImageUploadImage, ImageUploadPreview} from '@tryghost/shade/patterns';
import {PreviewModalContent, TextField} from '@tryghost/admin-x-design-system';
import {type Setting, type SettingValue, getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {Text} from '@tryghost/shade/primitives';
import {type Tier, getPaidActiveTiers, useBrowseTiers, useEditTier} from '@tryghost/admin-x-framework/api/tiers';
import {Trash2} from 'lucide-react';
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

// A single currency input, wired to useCurrencyInput. An empty field shows the
// derived default as a grey placeholder; typing sets an override; clearing it
// drops the override (never 0). The hook re-syncs when valueInCents changes
// externally, so external updates flow back into the field.
const GiftPriceField: React.FC<{
    title: string;
    placeholder: string;
    currency?: string;
    valueInCents: number | '';
    onChange: (cents: number) => void;
}> = ({title, placeholder, currency, valueInCents, onChange}) => {
    const input = useCurrencyInput(valueInCents, onChange);
    return (
        <Field>
            <FieldLabel>{title}</FieldLabel>
            <InputGroup className='border-transparent bg-muted'>
                <InputGroupInput
                    inputMode='decimal'
                    placeholder={placeholder}
                    value={input.value}
                    onBlur={input.onBlur}
                    onChange={event => input.onChange(event.target.value)}
                />
                <InputGroupAddon align='inline-end'><InputGroupText>{currency}</InputGroupText></InputGroupAddon>
            </InputGroup>
        </Field>
    );
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

    const [giftDurationsJson, portalPlansJson, giftTiersJson] = getSettingValues(localSettings, ['gift_durations', 'portal_plans', 'gift_tiers']);
    const giftDurations = JSON.parse(giftDurationsJson?.toString() || '[1,12]') as number[];
    const portalPlans = JSON.parse(portalPlansJson?.toString() || '[]') as string[];
    const offeredDurations = DURATION_OPTIONS.filter(({months, anchor}) => giftDurations.includes(months) && portalPlans.includes(anchor));

    const paidTiers = getPaidActiveTiers(localTiers || []);
    const giftTiers = JSON.parse(giftTiersJson?.toString() || '[]') as string[];
    // An empty gift_tiers list means "all paid tiers".
    const isTierOffered = (tierId: string) => giftTiers.length === 0 || giftTiers.includes(tierId);
    const offeredTiers = paidTiers.filter(tier => isTierOffered(tier.id));

    const toggleTier = (tierId: string, checked: boolean) => {
        const nextIds = paidTiers
            .filter(tier => (tier.id === tierId ? checked : isTierOffered(tier.id)))
            .map(tier => tier.id);
        // Must offer at least one tier; ignore an unchecking that empties the list.
        if (nextIds.length === 0) {
            return;
        }
        // Store the canonical "all" ([]) when every tier is offered.
        updateSetting('gift_tiers', JSON.stringify(nextIds.length === paidTiers.length ? [] : nextIds));
    };

    // The gift page shows the description in full (no "Show more"), so cap it at
    // a length that always fits on screen alongside the form.
    const descriptionMaxLength = 350;
    const descriptionLength = useMemo(() => {
        const div = document.createElement('div');
        div.innerHTML = giftPageDescription?.toString() || '';
        return div.innerText.trim().length;
    }, [giftPageDescription]);

    // The heading renders large on the gift page — keep it to a punchy single
    // thought so it doesn't wrap into a wall of text.
    const headingMaxLength = 60;
    // The default heading is surfaced as the placeholder (Ghost's convention for
    // signalling a default — see SEO meta, newsletter sender, portal fields): an
    // empty field shows the default in grey, a typed value renders in black, so
    // "default vs customised" is legible at a glance. An empty setting stays null
    // so the gift page keeps its translatable fallback.
    const defaultHeading = 'Gift a membership';
    const headingLength = (giftPageHeading || '').toString().length;

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
        // Must always offer at least one duration; ignore an unchecking that would
        // leave the gift page with none available to readers.
        if (!checked && offeredDurations.length <= 1) {
            return;
        }
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

    const showPricing = offeredDurations.length > 0 && offeredTiers.length > 0;

    return (
        <div className='flex flex-col gap-8 pt-4'>
            <div className='flex flex-col gap-6'>
                <TextField
                    hint={<>Leave blank to use the default. Under <strong>{headingMaxLength}</strong> characters — you&apos;ve used <strong className={headingLength > headingMaxLength ? 'text-red dark:text-red-500' : ''}>{headingLength}</strong>.</>}
                    maxLength={headingMaxLength}
                    placeholder={defaultHeading}
                    title="Heading"
                    value={giftPageHeading || ''}
                    onChange={e => updateSetting('gift_page_heading', e.target.value || null)}
                />
                <HtmlField
                    hint={<>Sell the value of a gift membership, or leave blank to use the default. Under <strong>{descriptionMaxLength}</strong> characters — you&apos;ve used <strong className={descriptionLength > descriptionMaxLength ? 'text-red dark:text-red-500' : ''}>{descriptionLength}</strong>.</>}
                    nodes='MINIMAL_NODES'
                    placeholder={`Share a full membership to ${siteData?.title || 'your site'} with a friend or colleague`}
                    title="Description"
                    value={giftPageDescription?.toString() || ''}
                    onChange={html => updateSetting('gift_page_description', html || null)}
                />
                <div>
                    <Text as='h6' className='text-base' weight='semibold'>Image</Text>
                    <FieldDescription>Shown above the heading at up to 140px tall — logos and wide images work best.</FieldDescription>
                    <div className='mt-3'>
                        <ImageUpload className={`w-full ${giftPageImage ? 'h-[120px]' : 'h-[52px]'}`}>
                            {giftPageImage ? (
                                <ImageUploadPreview>
                                    <ImageUploadImage alt='Gift page image' src={giftPageImage} />
                                    <ImageUploadActions>
                                        <ImageUploadAction aria-label='Remove gift page image' className='!top-1 !right-1' type='button' onClick={() => updateSetting('gift_page_image', null)}>
                                            <Trash2 />
                                        </ImageUploadAction>
                                    </ImageUploadActions>
                                </ImageUploadPreview>
                            ) : (
                                <ImageUploadDropzone
                                    accept={{'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']}}
                                    inputId='gift-page-image'
                                    onDropAccepted={files => files[0] && handleImageUpload(files[0])}
                                >
                                    <span className='text-control font-medium'>Upload gift page image</span>
                                </ImageUploadDropzone>
                            )}
                        </ImageUpload>
                    </div>
                </div>
            </div>

            {paidTiers.length > 1 && (
                <div>
                    <Text as='h5' className='text-base' weight='semibold'>Tiers</Text>
                    <FieldDescription>Choose which tiers readers can gift.</FieldDescription>
                    <FieldSet className='mt-3'>
                        <FieldGroup data-slot='checkbox-group'>
                            {paidTiers.map((tier) => {
                                // The last offered tier can't be unchecked — at least one is required.
                                const isLastOffered = isTierOffered(tier.id) && offeredTiers.length === 1;
                                return (
                                    <Field key={tier.id} data-disabled={isLastOffered || undefined} orientation='horizontal'>
                                        <Checkbox
                                            checked={isTierOffered(tier.id)}
                                            disabled={isLastOffered}
                                            id={`gift-tier-${tier.id}`}
                                            value={tier.id}
                                            onCheckedChange={checked => toggleTier(tier.id, checked === true)}
                                        />
                                        <FieldContent>
                                            <FieldLabel htmlFor={`gift-tier-${tier.id}`}>{tier.name}</FieldLabel>
                                            {isLastOffered && <FieldDescription>At least one tier must be giftable</FieldDescription>}
                                        </FieldContent>
                                    </Field>
                                );
                            })}
                        </FieldGroup>
                    </FieldSet>
                </div>
            )}

            <div>
                <Text as='h5' className='text-base' weight='semibold'>Durations</Text>
                <FieldDescription>Choose which subscription lengths readers can gift.</FieldDescription>
                <FieldSet className='mt-3'>
                    <FieldGroup data-slot='checkbox-group'>
                        {DURATION_OPTIONS.map(({months, label, anchor}) => {
                            const anchorAvailable = portalPlans.includes(anchor);
                            const isChecked = giftDurations.includes(months) && anchorAvailable;
                            // The last offered duration can't be unchecked — at least one is required.
                            const isLastOffered = isChecked && offeredDurations.length === 1;
                            let hint;
                            if (!anchorAvailable) {
                                hint = `Requires the ${anchor} plan to be enabled in Portal settings`;
                            } else if (isLastOffered) {
                                hint = 'At least one duration must be giftable';
                            }
                            const disabled = !anchorAvailable || isLastOffered;
                            return (
                                <Field key={String(months)} data-disabled={disabled || undefined} orientation='horizontal'>
                                    <Checkbox
                                        checked={isChecked}
                                        disabled={disabled}
                                        id={`gift-duration-${months}`}
                                        value={String(months)}
                                        onCheckedChange={checked => toggleDuration(months, checked === true)}
                                    />
                                    <FieldContent>
                                        <FieldLabel htmlFor={`gift-duration-${months}`}>{label}</FieldLabel>
                                        {hint && <FieldDescription>{hint}</FieldDescription>}
                                    </FieldContent>
                                </Field>
                            );
                        })}
                    </FieldGroup>
                </FieldSet>
                {offeredDurations.length === 0 && (
                    <FieldDescription className='mt-2'>No durations are available, so the gift page is currently unavailable to readers.</FieldDescription>
                )}
            </div>

            {showPricing && (
                <div>
                    <Text as='h5' className='text-base' weight='semibold'>Pricing</Text>
                    <FieldDescription>Set your own one-time gift price for any tier and duration. Leave a field blank to use the default shown in grey: whole-year durations use the tier&apos;s yearly price, and every other duration uses its monthly price × the number of months.</FieldDescription>
                    <div className='mt-3 flex flex-col gap-6'>
                        {offeredTiers.map((tier, i) => (
                            <React.Fragment key={tier.id}>
                                {i > 0 && <Separator />}
                                <div>
                                    {offeredTiers.length > 1 && (
                                        <Text as='h6' className='mb-3 text-base' weight='semibold'>{tier.name}</Text>
                                    )}
                                    <div className='flex flex-col gap-3'>
                                        {offeredDurations.map(({months, label}) => (
                                            <GiftPriceField
                                                key={months}
                                                currency={tier.currency}
                                                placeholder={(getDerivedPriceInCents(tier, months) / 100).toFixed(2)}
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

            <GiftDurationsPrototype initialMonths={giftDurations} tiers={offeredTiers.length ? offeredTiers : paidTiers} />
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

    const preview = <GiftPreview localSettings={formState.settings} localTiers={formState.tiers} />;

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
