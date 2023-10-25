import Button from '../../../admin-x-ds/global/Button';
import CurrencyField from '../../../admin-x-ds/global/form/CurrencyField';
import Heading from '../../../admin-x-ds/global/Heading';
import React, {useEffect, useState} from 'react';
import Select from '../../../admin-x-ds/global/form/Select';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {confirmIfDirty} from '../../../utils/modals';
import {currencySelectGroups, getSymbol, validateCurrencyAmount} from '../../../utils/currency';
import {getSettingValues} from '../../../api/settings';
import {withErrorBoundary} from '../../../admin-x-ds/global/ErrorBoundary';

// Stripe doesn't allow amounts over 10,000 as a preset amount
const MAX_AMOUNT = 10_000;

const TipsOrDonations: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        localSettings,
        siteData,
        updateSetting,
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        focusRef,
        handleEditingChange,
        errors,
        validate,
        clearError
    } = useSettingGroup({
        onValidate: () => {
            return {
                donationsSuggestedAmount: validateCurrencyAmount(suggestedAmountInCents, donationsCurrency, {maxAmount: MAX_AMOUNT})
            };
        }
    });

    const [donationsCurrency = 'USD', donationsSuggestedAmount = '0'] = getSettingValues<string>(
        localSettings,
        ['donations_currency', 'donations_suggested_amount']
    );

    const suggestedAmountInCents = parseInt(donationsSuggestedAmount);
    const suggestedAmountInDollars = suggestedAmountInCents / 100;
    const donateUrl = `${siteData?.url.replace(/\/$/, '')}/#/portal/support`;

    useEffect(() => {
        validate();
    }, [donationsCurrency]); // eslint-disable-line react-hooks/exhaustive-deps

    const [copied, setCopied] = useState(false);

    const copyDonateUrl = () => {
        navigator.clipboard.writeText(donateUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const openPreview = () => {
        confirmIfDirty(saveState === 'unsaved', () => window.open(donateUrl, '_blank'));
    };

    const values = (
        <SettingGroupContent
            columns={2}
            values={[
                {
                    heading: 'Suggested amount',
                    key: 'suggested-amount',
                    value: `${getSymbol(donationsCurrency)}${suggestedAmountInDollars}`
                },
                {
                    heading: '',
                    key: 'sharable-link',
                    value: (
                        <div className='w-100'>
                            <div className='flex items-center gap-2'>
                                <Heading level={6}>Shareable link &mdash;</Heading>
                                <button className='text-xs tracking-wide text-green' type="button" onClick={openPreview}>Preview</button>
                            </div>
                            <div className='w-100 group relative -m-1 mt-0 overflow-hidden rounded p-1 hover:bg-grey-50 dark:hover:bg-grey-900'>
                                {donateUrl}
                                <div className='invisible absolute right-0 top-[50%] flex translate-y-[-50%] gap-1 bg-white pl-1 group-hover:visible dark:bg-black'>
                                    <Button color='outline' label={copied ? 'Copied' : 'Copy'} size='sm' onClick={copyDonateUrl} />
                                </div>
                            </div>
                        </div>
                    )
                }
            ]}
        />
    );

    const inputFields = (
        <SettingGroupContent className='max-w-[180px]'>
            <CurrencyField
                error={!!errors.donationsSuggestedAmount}
                hint={errors.donationsSuggestedAmount}
                inputRef={focusRef}
                placeholder="0"
                rightPlaceholder={(
                    <Select
                        border={false}
                        containerClassName='w-14'
                        fullWidth={false}
                        options={currencySelectGroups()}
                        selectedOption={currencySelectGroups().flatMap(group => group.options).find(option => option.value === donationsCurrency)}
                        title='Currency'
                        hideTitle
                        isSearchable
                        onSelect={option => updateSetting('donations_currency', option?.value || 'USD')}
                    />
                )}
                title='Suggested amount'
                valueInCents={parseInt(donationsSuggestedAmount)}
                onBlur={validate}
                onChange={cents => updateSetting('donations_suggested_amount', cents.toString())}
                onKeyDown={() => clearError('donationsSuggestedAmount')}
            />
        </SettingGroupContent>
    );

    return (
        <SettingGroup
            description="Give your audience a one-time way to support your work, no membership required."
            isEditing={isEditing}
            keywords={keywords}
            navid='tips-or-donations'
            saveState={saveState}
            testId='tips-or-donations'
            title="Tips or donations"
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            {isEditing ? inputFields : values}
        </SettingGroup>
    );
};

export default withErrorBoundary(TipsOrDonations, 'Tips or donations');
