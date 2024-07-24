import React, {useEffect, useState} from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {Button, CurrencyField, Heading, Select, SettingGroupContent, confirmIfDirty, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {currencySelectGroups, getSymbol, validateCurrencyAmount} from '../../../utils/currency';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';

// Stripe doesn't allow amounts over 10,000 as a preset amount
const MAX_AMOUNT = 10_000;

const TipsAndDonations: React.FC<{ keywords: string[] }> = ({keywords}) => {
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
            columns={1}
            values={[
                {
                    heading: 'Suggested amount',
                    key: 'suggested-amount',
                    value: `${getSymbol(donationsCurrency)}${suggestedAmountInDollars}`
                },
                {
                    heading: '',
                    key: 'shareable-link',
                    value: (
                        <div className='w-100'>
                            <div className='flex items-center gap-2'>
                                <Heading level={6}>Shareable link</Heading>
                            </div>
                            <div className='w-100 group relative mt-0 flex items-center justify-between overflow-hidden border-b border-transparent pb-2 pt-1 hover:border-grey-300 dark:hover:border-grey-600'>
                                {donateUrl}
                                <div className='invisible flex gap-1 bg-white pl-1 group-hover:visible dark:bg-black'>
                                    <Button color='clear' label={'Preview'} size='sm' onClick={openPreview} />
                                    <Button color='light-grey' label={copied ? 'Copied' : 'Copy link'} size='sm' onClick={copyDonateUrl} />
                                </div>
                            </div>
                        </div>
                    )
                }
            ]}
        />
    );

    const inputFields = (
        <SettingGroupContent columns={1}>
            <div className='flex max-w-[220px] items-end gap-[.6rem]'>
                <CurrencyField
                    error={!!errors.donationsSuggestedAmount}
                    hint={errors.donationsSuggestedAmount}
                    inputRef={focusRef}
                    placeholder="5"
                    rightPlaceholder={(
                        <Select
                            border={false}
                            clearBg={true}
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
            </div>
            <div className='w-100'>
                <div className='flex items-center gap-2'>
                    <Heading level={6}>Shareable link</Heading>
                </div>
                <div className='w-100 group relative mt-0 flex items-center justify-between overflow-hidden border-b border-transparent pb-2 pt-1 hover:border-grey-300 dark:hover:border-grey-600'>
                    {donateUrl}
                    <div className='invisible flex gap-1 bg-white pl-1 group-hover:visible dark:bg-black'>
                        <Button color='clear' label={'Preview'} size='sm' onClick={openPreview} />
                        <Button color='light-grey' label={copied ? 'Copied' : 'Copy link'} size='sm' onClick={copyDonateUrl} />
                    </div>
                </div>
            </div>
        </SettingGroupContent>
    );

    return (
        <TopLevelGroup
            description="Give your audience a one-time way to support your work, no membership required."
            isEditing={isEditing}
            keywords={keywords}
            navid='tips-and-donations'
            saveState={saveState}
            testId='tips-and-donations'
            title="Tips & donations"
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            {isEditing ? inputFields : values}
            <div className='items-center-mt-1 flex text-sm'>
                All tips and donations are subject to Stripe&apos;s <a className='ml-1 text-green' href="https://ghost.org/help/tips-donations/" rel="noopener noreferrer" target="_blank"> tipping policy</a>.
            </div>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(TipsAndDonations, 'Tips & donations');
