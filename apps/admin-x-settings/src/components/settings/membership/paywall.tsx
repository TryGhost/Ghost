import React from 'react';
import TopLevelGroup from '../../top-level-group';
import useSettingGroup from '../../../hooks/use-setting-group';
import {Select, SettingGroupContent, TextField, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useBrowseOffers} from '@tryghost/admin-x-framework/api/offers';

const NO_OFFER_OPTION = {
    value: '',
    label: 'None (default signup)',
    hint: 'The button opens the standard signup / upgrade flow'
};

const Paywall: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        localSettings,
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        handleEditingChange
    } = useSettingGroup();

    const [headingMembers, headingPaid, headingTiers, description, buttonText, offerCode] = getSettingValues(localSettings, [
        'paywall_heading_members', 'paywall_heading_paid', 'paywall_heading_tiers', 'paywall_description', 'paywall_button_text', 'paywall_offer_code'
    ]) as [string | null, string | null, string | null, string | null, string | null, string | null];

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
        handleEditingChange(true);
    };

    const form = (
        <SettingGroupContent className='gap-y-4' columns={1}>
            <TextField
                hint='Shown on posts restricted to members. Leave blank for the default'
                placeholder='This post is for subscribers only'
                title='Headline — members-only posts'
                value={headingMembers || ''}
                onChange={e => updateTextSetting('paywall_heading_members', e.target.value)}
            />
            <TextField
                hint='Shown on posts restricted to paid members. Leave blank for the default'
                placeholder='This post is for paying subscribers only'
                title='Headline — paid-members posts'
                value={headingPaid || ''}
                onChange={e => updateTextSetting('paywall_heading_paid', e.target.value)}
            />
            <TextField
                hint='Shown on posts restricted to specific tiers. Leave blank for the default'
                placeholder='This post is for subscribers on selected tiers only'
                title='Headline — tier-restricted posts'
                value={headingTiers || ''}
                onChange={e => updateTextSetting('paywall_heading_tiers', e.target.value)}
            />
            <TextField
                hint='Optional supporting line shown under the headline, e.g. a limited-time promotion'
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
                hint='Send readers to an offer instead of the standard signup flow'
                options={offerOptions}
                selectedOption={offerOptions.find(option => option.value === (offerCode || ''))}
                testId='paywall-offer-select'
                title='Offer'
                onSelect={(option) => {
                    updateSetting('paywall_offer_code', option?.value || null);
                    handleEditingChange(true);
                }}
            />
        </SettingGroupContent>
    );

    return (
        <TopLevelGroup
            description='Customize the message shown in place of restricted content on your site'
            isEditing={isEditing}
            keywords={keywords}
            navid='paywall'
            saveState={saveState}
            testId='paywall'
            title='Paywall'
            hideEditButton
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            {form}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Paywall, 'Paywall');
