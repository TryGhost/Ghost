import GiftPreview from './gift-preview';
import NiceModal from '@ebay/nice-modal-react';
import React, {useEffect, useMemo} from 'react';
import {APIError} from '@tryghost/admin-x-framework/errors';
import {Badge, Checkbox, Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldSet, Input, Textarea} from '@tryghost/shade/components';
import {type Dirtyable, useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import {ImageUpload, ImageUploadAction, ImageUploadActions, ImageUploadDropzone, ImageUploadImage, ImageUploadPreview} from '@tryghost/shade/patterns';
import {PreviewModalContent} from '@tryghost/admin-x-design-system';
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

// Matches a real HTML tag — a letter must follow the "<" — so a description
// containing a stray "<" isn't treated as markup.
const HTML_TAG_REGEX = /<\/?[a-z][^>]*>/i;

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

    const [giftDurationsJson, portalPlansJson, giftTiersDisabledJson] = getSettingValues(localSettings, ['gift_durations', 'portal_plans', 'gift_tiers_disabled']);
    const giftDurations = JSON.parse(giftDurationsJson?.toString() || '[1,3,6,12]') as number[];
    const portalPlans = JSON.parse(portalPlansJson?.toString() || '[]') as string[];
    const offeredDurations = DURATION_OPTIONS.filter(({months, anchor}) => giftDurations.includes(months) && portalPlans.includes(anchor));

    // Only tiers enabled in Portal are available here at all — a tier hidden
    // from Portal can't be gifted, so it isn't listed. Its gift setting is
    // kept, though: gift_tiers_disabled is a disabled-list that's only ever
    // edited per tier, so re-enabling a tier in Portal restores whatever it
    // was set to before.
    const paidTiers = getPaidActiveTiers(localTiers || []);
    const visibleTiers = paidTiers.filter(tier => tier.visibility === 'public');
    const giftTiersDisabled = JSON.parse(giftTiersDisabledJson?.toString() || '[]') as string[];
    // Disabled-list semantics: tiers are giftable by default, including
    // tiers created later.
    const isTierOffered = (tierId: string) => !giftTiersDisabled.includes(tierId);
    const offeredTiers = visibleTiers.filter(tier => isTierOffered(tier.id));

    const toggleTier = (tierId: string, checked: boolean) => {
        const next = checked
            ? giftTiersDisabled.filter(id => id !== tierId)
            : [...new Set([...giftTiersDisabled, tierId])];
        updateSetting('gift_tiers_disabled', JSON.stringify(next));
    };

    // Heading and description behave identically: the default is shown as a
    // placeholder, an empty setting stays null, and the gift page falls back to
    // its own translatable copy. Clearing a field therefore restores the
    // default rather than blanking the section.
    const defaultHeading = 'Gift a membership';
    const defaultDescription = `Share a full membership to ${siteData?.title || 'your site'} with a friend or colleague`;
    const headingValue = giftPageHeading?.toString() || '';
    // The description used to be edited as rich text, so a previously saved
    // value may still be HTML. Show it as plain text rather than making the
    // publisher stare at raw <p> tags; editing rewrites the setting as plain
    // text. The tag test requires a letter after the "<" so a typed "a < b"
    // isn't mistaken for markup and mangled on the round trip.
    const descriptionValue = useMemo(() => {
        const stored = giftPageDescription?.toString() || '';
        if (!HTML_TAG_REGEX.test(stored)) {
            return stored;
        }
        const div = document.createElement('div');
        div.innerHTML = stored;
        return div.innerText.trim();
    }, [giftPageDescription]);

    // Soft limits, surfaced via the same "Recommended: X characters" counter
    // used by the Portal modal — the gift page renders both in full, so past
    // these they start to crowd the layout.
    const headingRecommendedLength = 60;
    const descriptionRecommendedLength = 225;
    const headingLength = headingValue.length;
    const descriptionLength = descriptionValue.length;

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

    // Every duration may be switched off — with none left the gift page shows
    // its unavailable state, which the note under the list points out.
    const toggleDuration = (months: number, checked: boolean) => {
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
                                {/* Contained rather than the pattern's default
                                    cover: the gift page scales the image to fit
                                    within its own bounds too, so cropping it to
                                    fill here would misrepresent it. */}
                                <ImageUploadImage alt='Gift page image' className='object-contain' src={giftPageImage} />
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
                {/* Label + control + hint laid out exactly as the welcome email
                    design modal does it (member-emails/welcome-email-customize-modal). */}
                <div className='flex flex-col gap-1.5'>
                    <label className='font-medium' htmlFor='gift-page-heading'>Heading</label>
                    <Input
                        id='gift-page-heading'
                        placeholder={defaultHeading}
                        value={headingValue}
                        onChange={e => updateSetting('gift_page_heading', e.target.value || null)}
                    />
                    <p className='text-sm text-muted-foreground'>Recommended: <strong>{headingRecommendedLength}</strong> characters. You&apos;ve used <strong className={headingLength > headingRecommendedLength ? 'text-red' : 'text-green'}>{headingLength}</strong></p>
                </div>
                <div className='flex flex-col gap-1.5'>
                    <label className='font-medium' htmlFor='gift-page-description'>Description</label>
                    <Textarea
                        id='gift-page-description'
                        placeholder={defaultDescription}
                        rows={3}
                        value={descriptionValue}
                        onChange={e => updateSetting('gift_page_description', e.target.value || null)}
                    />
                    <p className='text-sm text-muted-foreground'>Recommended: <strong>{descriptionRecommendedLength}</strong> characters. You&apos;ve used <strong className={descriptionLength > descriptionRecommendedLength ? 'text-red' : 'text-green'}>{descriptionLength}</strong></p>
                </div>
            </div>

            <div>
                <Text as='h5' className='text-base' weight='semibold'>Durations</Text>
                <FieldSet className='mt-4'>
                    <FieldGroup data-slot='checkbox-group'>
                        {DURATION_OPTIONS.map(({months, label, anchor}) => {
                            const anchorAvailable = portalPlans.includes(anchor);
                            const isChecked = giftDurations.includes(months) && anchorAvailable;
                            const hint = anchorAvailable ? undefined : `Requires the ${anchor} plan to be enabled in Portal settings`;
                            // 1 month and 1 year map straight onto the tier's own
                            // prices; 3 and 6 are multiplied out, so tag those.
                            const priceTag = anchorAvailable && months > 1 && anchor === 'monthly'
                                ? `${months}× monthly tier price`
                                : null;
                            const disabled = !anchorAvailable;
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

            {visibleTiers.length > 0 && (
                <div>
                    <Text as='h5' className='text-base' weight='semibold'>Tiers</Text>
                    <FieldSet className='mt-4'>
                        <FieldGroup data-slot='checkbox-group'>
                            {visibleTiers.map(tier => (
                                <Field key={tier.id} orientation='horizontal'>
                                    <Checkbox
                                        checked={isTierOffered(tier.id)}
                                        id={`gift-tier-${tier.id}`}
                                        value={tier.id}
                                        onCheckedChange={checked => toggleTier(tier.id, checked === true)}
                                    />
                                    <FieldContent>
                                        <FieldLabel htmlFor={`gift-tier-${tier.id}`}>{tier.name}</FieldLabel>
                                    </FieldContent>
                                </Field>
                            ))}
                        </FieldGroup>
                    </FieldSet>
                    {offeredTiers.length === 0 && (
                        <Text className='mt-1 text-muted-foreground' leading='normal' size='sm'>No tiers are available, so the gift page is currently unavailable to readers.</Text>
                    )}
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
            // gift_tiers_disabled setting changes; tier records themselves don't.
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
