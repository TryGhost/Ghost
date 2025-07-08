import React, {useEffect, useState} from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {Button, CurrencyField, Heading, Select, SettingGroupContent, confirmIfDirty, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {currencySelectGroups, validateCurrencyAmount} from '../../../utils/currency';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';

// Stripe doesn't allow amounts over 10,000 as a preset amount
const MAX_AMOUNT = 10_000;

const TipsAndDonations: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        localSettings,
        siteData,
        updateSetting,
        saveState,
        handleSave,
        handleCancel,
        focusRef,
        errors,
        validate,
        clearError,
        handleEditingChange
    } = useSettingGroup({
        onValidate: () => {
            return {
                donationsSuggestedAmount: validateCurrencyAmount(suggestedAmountInCents, donationsCurrency, {maxAmount: MAX_AMOUNT})
            };
        }
    });

    const [donationsCurrency = 'USD', donationsSuggestedAmount = '500'] = getSettingValues<string>(
        localSettings,
        ['donations_currency', 'donations_suggested_amount']
    );

    const suggestedAmountInCents = parseInt(donationsSuggestedAmount);
    const donateUrl = `${siteData?.url.replace(/\/$/, '')}/#/portal/support`;

    useEffect(() => {
        validate();
    }, [donationsCurrency]); // eslint-disable-line react-hooks/exhaustive-deps

    const [copied, setCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Watch for changes in localSettings and update editing state
    useEffect(() => {
        const hasChanges = localSettings.some(setting => setting.dirty);
        if (hasChanges && !isEditing) {
            setIsEditing(true);
            handleEditingChange(true);
        }
    }, [localSettings, isEditing, handleEditingChange]);

    const copyDonateUrl = () => {
        navigator.clipboard.writeText(donateUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const openPreview = () => {
        confirmIfDirty(saveState === 'unsaved', () => window.open(donateUrl, '_blank'));
    };

    const handleSettingChange = (key: string, value: string) => {
        updateSetting(key, value);
    };

    const handleCancelClick = () => {
        handleCancel();
        setIsEditing(false);
    };

    const handleSaveClick = async () => {
        const response = await handleSave();
        if (response) {
            setIsEditing(false);
        }
    };

    return (
        <TopLevelGroup
            description="Give your audience a simple way to support your work with one-time payments."
            isEditing={isEditing}
            keywords={keywords}
            navid='tips-and-donations'
            saveState={saveState}
            testId='tips-and-donations'
            title="Tips & donations"
            hideEditButton
            onCancel={handleCancelClick}
            onEditingChange={setIsEditing}
            onSave={handleSaveClick}
        >
            <SettingGroupContent columns={1}>
                <div className='flex max-w-[180px] items-end gap-[.6rem]'>
                    <CurrencyField
                        key={donationsSuggestedAmount}
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
                                onSelect={option => handleSettingChange('donations_currency', option?.value || 'USD')}
                            />
                        )}
                        title='Suggested amount'
                        valueInCents={parseInt(donationsSuggestedAmount)}
                        onBlur={validate}
                        onChange={cents => handleSettingChange('donations_suggested_amount', cents.toString())}
                        onKeyDown={() => clearError('donationsSuggestedAmount')}
                    />
                </div>
                <div className='w-100'>
                    <div className='flex items-center gap-2'>
                        <Heading level={6}>Shareable link</Heading>
                    </div>
                    <div className='w-100 group relative mt-0 flex items-center justify-between overflow-hidden border-b border-transparent pb-2 pt-1 hover:border-grey-300 dark:hover:border-grey-600'>
                        <span data-testid='donate-url'>{donateUrl}</span>
                        <div className='invisible flex gap-1 bg-white pl-1 group-hover:visible dark:bg-black'>
                            <Button color='clear' data-testid='preview-shareable-link' label={'Preview'} size='sm' onClick={openPreview} />
                            <Button color='light-grey' data-testid='copy-shareable-link' label={copied ? 'Copied' : 'Copy link'} size='sm' onClick={copyDonateUrl} />
                        </div>
                    </div>
                </div>
            </SettingGroupContent>
            <div className='items-center-mt-1 flex text-sm'>
                All tips and donations are subject to Stripe&apos;s <a className='ml-1 text-green' href="https://ghost.org/help/tips-donations/" rel="noopener noreferrer" target="_blank"> tipping policy</a>.
            </div>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(TipsAndDonations, 'Tips & donations');
