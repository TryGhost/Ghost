import React, {useState} from 'react';
import TopLevelGroup from '../../top-level-group';
import useSettingGroup from '../../../hooks/use-setting-group';
import {Icon, Select, SettingGroupContent, TextField, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useBrowseOffers} from '@tryghost/admin-x-framework/api/offers';

const NO_OFFER_OPTION = {
    value: '',
    label: 'None (default signup)',
    hint: 'The button opens the standard signup / upgrade flow'
};

const WallSection: React.FC<{
    title: string;
    summary: string;
    isOpen: boolean;
    testId: string;
    onToggle: () => void;
    children: React.ReactNode;
}> = ({title, summary, isOpen, testId, onToggle, children}) => (
    <div className='rounded border border-grey-200 dark:border-grey-900'>
        <button className='flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left' data-testid={`${testId}-toggle`} type='button' onClick={onToggle}>
            <span>
                <span className='block text-sm font-semibold'>{title}</span>
                <span className='block text-xs text-grey-700 dark:text-grey-500'>{summary}</span>
            </span>
            <Icon className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} name='chevron-down' size='xs' />
        </button>
        {isOpen && <div className='border-t border-grey-200 p-4 dark:border-grey-900' data-testid={`${testId}-content`}>{children}</div>}
    </div>
);

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

    const [
        headingMembers, signupDescription, signupButtonText,
        headingPaid, headingTiers, description, buttonText, offerCode
    ] = getSettingValues(localSettings, [
        'paywall_heading_members', 'paywall_signup_description', 'paywall_signup_button_text',
        'paywall_heading_paid', 'paywall_heading_tiers', 'paywall_description', 'paywall_button_text', 'paywall_offer_code'
    ]) as (string | null)[];

    const [openWall, setOpenWall] = useState<'signup' | 'payment' | null>(null);

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

    const signupSummary = headingMembers || signupDescription || signupButtonText
        ? `“${headingMembers || 'This post is for subscribers only'}”`
        : 'Using the default message';
    const paymentSummary = headingPaid || description || buttonText || offerCode
        ? `“${headingPaid || 'This post is for paying subscribers only'}”${offerCode ? ' · offer attached' : ''}`
        : 'Using the default message';

    const form = (
        <SettingGroupContent className='gap-y-3' columns={1}>
            <WallSection
                isOpen={openWall === 'signup'}
                summary={signupSummary}
                testId='signup-wall'
                title='Sign-up wall'
                onToggle={() => setOpenWall(openWall === 'signup' ? null : 'signup')}
            >
                <div className='flex flex-col gap-4'>
                    <p className='m-0 text-xs text-grey-700 dark:text-grey-500'>Shown to visitors on members-only posts. The button is always a free signup — offers never apply here.</p>
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
                </div>
            </WallSection>

            <WallSection
                isOpen={openWall === 'payment'}
                summary={paymentSummary}
                testId='payment-wall'
                title='Payment wall'
                onToggle={() => setOpenWall(openWall === 'payment' ? null : 'payment')}
            >
                <div className='flex flex-col gap-4'>
                    <p className='m-0 text-xs text-grey-700 dark:text-grey-500'>Shown on posts for paid members or specific tiers, on your site and in emails to free subscribers.</p>
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
                        hint='Send readers to an offer instead of the standard signup. Applies to payment walls only'
                        options={offerOptions}
                        selectedOption={offerOptions.find(option => option.value === (offerCode || ''))}
                        testId='paywall-offer-select'
                        title='Offer'
                        onSelect={(option) => {
                            updateSetting('paywall_offer_code', option?.value || null);
                            handleEditingChange(true);
                        }}
                    />
                </div>
            </WallSection>
        </SettingGroupContent>
    );

    return (
        <TopLevelGroup
            description='Customize the two messages shown in place of restricted content: the free sign-up wall and the payment wall'
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
