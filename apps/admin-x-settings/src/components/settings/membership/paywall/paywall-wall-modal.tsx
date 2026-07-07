import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import toast from 'react-hot-toast';
import useSettingGroup from '../../../../hooks/use-setting-group';
import {Form, Modal, Select, TextField, Toggle} from '@tryghost/admin-x-design-system';
import {type RoutingModalProps, useRouting} from '@tryghost/admin-x-framework/routing';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useBrowseOffers} from '@tryghost/admin-x-framework/api/offers';

const NO_OFFER_OPTION = {
    value: '',
    label: 'None (default signup)',
    hint: 'The button opens the standard signup / upgrade flow'
};

const PaywallWallModal: React.FC<RoutingModalProps> = ({params}) => {
    const {updateRoute} = useRouting();
    const wall = params?.wall === 'signup' ? 'signup' : 'payment';

    const {localSettings, updateSetting, handleSave, okProps} = useSettingGroup({savingDelay: 500});

    const [
        headingMembers, signupDescription, signupButtonText,
        headingPaid, headingTiers, description, buttonText, offerCode
    ] = getSettingValues(localSettings, [
        'paywall_heading_members', 'paywall_signup_description', 'paywall_signup_button_text',
        'paywall_heading_paid', 'paywall_heading_tiers', 'paywall_description', 'paywall_button_text', 'paywall_offer_code'
    ]) as (string | null)[];
    const [campaignMode] = getSettingValues(localSettings, ['paywall_campaign_mode']) as boolean[];

    const {data: {offers} = {}} = useBrowseOffers();

    const offerOptions = [
        NO_OFFER_OPTION,
        ...(offers?.filter(offer => offer.status === 'active' && offer.redemption_type === 'signup').map(offer => ({
            value: offer.code,
            label: offer.name,
            hint: offer.display_title || undefined
        })) || [])
    ];

    const updateTextSetting = (key: string, value: string) => {
        updateSetting(key, value === '' ? null : value);
    };

    const isDirty = localSettings.some(setting => setting.dirty);

    return (
        <Modal
            afterClose={() => {
                updateRoute('paywall');
            }}
            cancelLabel='Close'
            dirty={isDirty}
            okColor={okProps.color}
            okLabel={okProps.label || 'Save'}
            testId={`paywall-${wall}-modal`}
            title={wall === 'signup' ? 'Sign-up wall' : 'Payment wall'}
            onOk={async () => {
                toast.remove();
                await handleSave();
            }}
        >
            <div className='mt-5'>
                {wall === 'signup' ? (
                    <Form marginBottom={false} grouped>
                        <p className='-mb-2 text-sm text-grey-800 dark:text-grey-500'>Shown to visitors on members-only posts, in place of the restricted content. The button is always a free signup &mdash; offers never apply to sign-up walls. Posts can override this message from their paywall card.</p>
                        <TextField
                            hint='Leave blank for the default'
                            placeholder='This post is for subscribers only'
                            title='Headline'
                            value={headingMembers || ''}
                            onChange={e => updateTextSetting('paywall_heading_members', e.target.value)}
                        />
                        <TextField
                            hint='Optional supporting line'
                            placeholder='Sign up for free to keep reading'
                            title='Description'
                            value={signupDescription || ''}
                            onChange={e => updateTextSetting('paywall_signup_description', e.target.value)}
                        />
                        <TextField
                            hint='Leave blank for the default ("Subscribe now")'
                            placeholder='Sign up free'
                            title='Button text'
                            value={signupButtonText || ''}
                            onChange={e => updateTextSetting('paywall_signup_button_text', e.target.value)}
                        />
                    </Form>
                ) : (
                    <Form marginBottom={false} grouped>
                        <p className='-mb-2 text-sm text-grey-800 dark:text-grey-500'>Shown on posts for paid members or specific tiers &mdash; on your site and in emails to free subscribers. Posts can override this message from their paywall card.</p>
                        <TextField
                            hint='Leave blank for the default'
                            placeholder='This post is for paying subscribers only'
                            title='Headline'
                            value={headingPaid || ''}
                            onChange={e => updateTextSetting('paywall_heading_paid', e.target.value)}
                        />
                        <TextField
                            hint='Used when a post is restricted to specific tiers. Leave blank for the default (lists the tier names)'
                            placeholder='This post is for subscribers on selected tiers only'
                            title='Headline — tier-restricted posts'
                            value={headingTiers || ''}
                            onChange={e => updateTextSetting('paywall_heading_tiers', e.target.value)}
                        />
                        <TextField
                            hint='Optional supporting line, e.g. a limited-time promotion'
                            placeholder='Get full access to every story, plus subscriber-only newsletters'
                            title='Description'
                            value={description || ''}
                            onChange={e => updateTextSetting('paywall_description', e.target.value)}
                        />
                        <TextField
                            hint='Leave blank for the default ("Subscribe now" / "Upgrade your account")'
                            placeholder='Subscribe now'
                            title='Button text'
                            value={buttonText || ''}
                            onChange={e => updateTextSetting('paywall_button_text', e.target.value)}
                        />
                        <Select
                            hint='Send readers to an offer instead of the standard signup'
                            options={offerOptions}
                            selectedOption={offerOptions.find(option => option.value === (offerCode || ''))}
                            testId='paywall-offer-select'
                            title='Offer'
                            onSelect={(option) => {
                                updateSetting('paywall_offer_code', option?.value || null);
                                if (!option?.value) {
                                    updateSetting('paywall_campaign_mode', false);
                                }
                            }}
                        />
                        {offerCode &&
                            <Toggle
                                checked={Boolean(campaignMode)}
                                direction='rtl'
                                hint='While on, this offer takes over every payment wall — including posts with their own offers — until you turn it off or archive the offer. Posts return to their own offers afterwards.'
                                label='Campaign mode'
                                testId='paywall-campaign-toggle'
                                onChange={(event) => {
                                    updateSetting('paywall_campaign_mode', event.target.checked);
                                }}
                            />
                        }
                    </Form>
                )}
            </div>
        </Modal>
    );
};

export default NiceModal.create(PaywallWallModal);
