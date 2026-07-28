import GiftPreview from './gift-preview';
import HtmlField from '../../../html-field';
import NiceModal from '@ebay/nice-modal-react';
import React, {useEffect, useMemo} from 'react';
import {APIError} from '@tryghost/admin-x-framework/errors';
import {Badge, Checkbox, Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldSet} from '@tryghost/shade/components';
import {type Dirtyable, useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import {ImageUpload, ImageUploadAction, ImageUploadActions, ImageUploadDropzone, ImageUploadImage, ImageUploadPreview} from '@tryghost/shade/patterns';
import {PreviewModalContent, TextField} from '@tryghost/admin-x-design-system';
import {type Setting, type SettingValue, getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {Text} from '@tryghost/shade/primitives';
import {type Tier, getPaidActiveTiers, useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
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

const GiftSidebar: React.FC<{
    localSettings: Setting[]
    updateSetting: (key: string, value: SettingValue) => void
    localTiers: Tier[]
}> = ({localSettings, updateSetting, localTiers}) => {
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

    // The defaults are inserted into the fields as real, editable text (rather
    // than surfaced as grey placeholders). The settings themselves stay null
    // until the value is actually edited, so the gift page keeps its
    // translatable fallbacks for sites that never customise these. The
    // description default is pre-wrapped in <p> to match the editor's own
    // serialization — its on-load event only skips marking the form dirty when
    // the normalized HTML equals the value it was given.
    const defaultHeading = 'Gift a membership';
    const defaultDescription = `<p>Share a full membership to ${siteData?.title || 'your site'} with a friend or colleague</p>`;
    const headingValue = giftPageHeading?.toString() || defaultHeading;
    const descriptionValue = giftPageDescription?.toString() || defaultDescription;

    // Soft limits, surfaced via the same "Recommended: X characters" counter
    // used by the Portal modal — the gift page renders both in full, so past
    // these they start to crowd the layout.
    const headingRecommendedLength = 60;
    const descriptionRecommendedLength = 225;
    const headingLength = headingValue.length;
    const descriptionLength = useMemo(() => {
        const div = document.createElement('div');
        div.innerHTML = descriptionValue;
        return div.innerText.trim().length;
    }, [descriptionValue]);

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

    return (
        <div className='mt-6 flex flex-col gap-8'>
            {/* Ordered to match the gift page itself: image, then heading,
                then description. */}
            <div className='flex flex-col gap-6'>
                <Field>
                    <FieldLabel htmlFor='gift-page-image'>Image</FieldLabel>
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
                                <span className='text-control font-medium'>Upload image</span>
                            </ImageUploadDropzone>
                        )}
                    </ImageUpload>
                    <FieldDescription>Shown above the heading at up to 140px tall</FieldDescription>
                </Field>
                <TextField
                    hint={<>Recommended: <strong>{headingRecommendedLength}</strong> characters. You&apos;ve used <strong className={headingLength > headingRecommendedLength ? 'text-red' : 'text-green'}>{headingLength}</strong></>}
                    title="Heading"
                    value={headingValue}
                    onChange={e => updateSetting('gift_page_heading', e.target.value || null)}
                />
                <HtmlField
                    hint={<>Recommended: <strong>{descriptionRecommendedLength}</strong> characters. You&apos;ve used <strong className={descriptionLength > descriptionRecommendedLength ? 'text-red' : 'text-green'}>{descriptionLength}</strong></>}
                    nodes='MINIMAL_NODES'
                    title="Description"
                    value={descriptionValue}
                    onChange={html => updateSetting('gift_page_description', html || null)}
                />
            </div>

            <div>
                <Text as='h5' className='text-base' weight='semibold'>Durations</Text>
                <FieldSet className='mt-4'>
                    <FieldGroup data-slot='checkbox-group'>
                        {DURATION_OPTIONS.map(({months, label, anchor}) => {
                            const anchorAvailable = portalPlans.includes(anchor);
                            const isChecked = giftDurations.includes(months) && anchorAvailable;
                            // The last offered duration can't be unchecked — at least one is required.
                            const isLastOffered = isChecked && offeredDurations.length === 1;
                            // The last offered duration is disabled without a
                            // callout — the disabled checkbox communicates it.
                            const hint = anchorAvailable ? undefined : `Requires the ${anchor} plan to be enabled in Portal settings`;
                            // 1 month and 1 year map straight onto the tier's own
                            // prices; 3 and 6 are multiplied out, so tag those.
                            const priceTag = anchorAvailable && months > 1 && anchor === 'monthly'
                                ? `${months}× monthly tier price`
                                : null;
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
                                        <FieldLabel htmlFor={`gift-duration-${months}`}>
                                            {label}
                                            {priceTag && <Badge variant='secondary'>{priceTag}</Badge>}
                                        </FieldLabel>
                                        {hint && <FieldDescription>{hint}</FieldDescription>}
                                    </FieldContent>
                                </Field>
                            );
                        })}
                    </FieldGroup>
                </FieldSet>
                {offeredDurations.length === 0 && (
                    <Text className='mt-1 text-muted-foreground' leading='normal' size='sm'>No durations are available, so the gift page is currently unavailable to readers.</Text>
                )}
            </div>

            {paidTiers.length > 1 && (
                <div>
                    <Text as='h5' className='text-base' weight='semibold'>Tiers</Text>
                    <FieldSet className='mt-4'>
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
                                        </FieldContent>
                                    </Field>
                                );
                            })}
                        </FieldGroup>
                    </FieldSet>
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

    const {formState, setFormState, saveState, handleSave, updateForm, okProps} = useForm({
        initialState: {
            settings: settings as Dirtyable<Setting>[],
            // Read-only here — used to list which tiers can be gifted. Only the
            // gift_tiers setting changes; tier records themselves don't.
            tiers: (allTiers as Tier[]) || []
        },
        savingDelay: 500,
        onSave: async () => {
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
            setFormState(state => ({...state, tiers: allTiers as Tier[]}));
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

    const sidebar = (
        <GiftSidebar
            localSettings={formState.settings}
            localTiers={formState.tiers}
            updateSetting={updateSetting}
        />
    );

    const preview = <GiftPreview localSettings={formState.settings} localTiers={formState.tiers} />;

    return (
        <PreviewModalContent
            afterClose={() => updateRoute('gift-subscriptions')}
            buttonsDisabled={okProps.disabled}
            cancelLabel='Close'
            dirty={saveState === 'unsaved'}
            okLabel={okProps.label || 'Save'}
            okVariant={okProps.variant}
            preview={preview}
            previewToolbar={false}
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
