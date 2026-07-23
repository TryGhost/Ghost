import React, {useEffect, useState} from 'react';
import TopLevelGroup from '../../top-level-group';
import useCurrencyInput from '../../../hooks/use-currency-input';
import useSettingGroup from '../../../hooks/use-setting-group';
import {Button, CopyField, CopyFieldActions, CopyFieldContent, CopyFieldCopyButton, CopyFieldLabel, CopyFieldValue, Field, FieldError, FieldLabel, InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, MultiSelectCombobox, Popover, PopoverContent, PopoverTrigger} from '@tryghost/shade/components';
import {ChevronDown} from 'lucide-react';
import {DirtyConfirmDialog, useDirtyConfirmation} from '@tryghost/shade/patterns';
import {SettingGroupContent} from '@tryghost/shade/patterns';
import {currencySelectGroups, validateCurrencyAmount} from '../../../utils/currency';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {withErrorBoundary} from '../../error-boundary';

// Stripe doesn't allow amounts over 10,000 as a preset amount
const MAX_AMOUNT = 10_000;

const TipsAndDonations: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [currencyOpen, setCurrencyOpen] = useState(false);
    const {confirm, dialogProps} = useDirtyConfirmation();
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
    const suggestedAmountInput = useCurrencyInput(suggestedAmountInCents, cents => handleSettingChange('donations_suggested_amount', cents.toString()));
    const donateUrl = `${siteData?.url.replace(/\/$/, '')}/#/portal/support`;
    const currencyOptions = currencySelectGroups().flatMap(group => group.options.map(option => ({...option, metadata: {groupKey: group.key, groupLabel: group.label}})));

    useEffect(() => {
        validate();
    }, [donationsCurrency]);  

    const [isEditing, setIsEditing] = useState(false);

    // Watch for changes in localSettings and update editing state
    useEffect(() => {
        const hasChanges = localSettings.some(setting => setting.dirty);
        if (hasChanges && !isEditing) {
            setIsEditing(true);
            handleEditingChange(true);
        }
    }, [localSettings, isEditing, handleEditingChange]);

    const openPreview = () => {
        confirm(saveState === 'unsaved', () => window.open(donateUrl, '_blank'));
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
                    <Field className='max-w-[180px]' data-invalid={Boolean(errors.donationsSuggestedAmount) || undefined}>
                        <FieldLabel htmlFor='donations-suggested-amount'>Suggested amount</FieldLabel>
                        <InputGroup className='h-[var(--control-height)] border-transparent bg-muted' data-invalid={Boolean(errors.donationsSuggestedAmount) || undefined}>
                            <InputGroupInput
                                ref={focusRef}
                                aria-invalid={Boolean(errors.donationsSuggestedAmount) || undefined}
                                id='donations-suggested-amount'
                                inputMode='decimal'
                                placeholder='5'
                                value={suggestedAmountInput.value}
                                onBlur={() => {
                                    suggestedAmountInput.onBlur();
                                    validate();
                                }}
                                onChange={event => suggestedAmountInput.onChange(event.target.value)}
                                onKeyDown={() => clearError('donationsSuggestedAmount')}
                            />
                            <InputGroupAddon align='inline-end'>
                                <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                                    <PopoverTrigger asChild>
                                        <InputGroupButton aria-expanded={currencyOpen} aria-label='Currency' role='combobox'>
                                            {donationsCurrency}
                                            <ChevronDown className='size-3.5 opacity-50' />
                                        </InputGroupButton>
                                    </PopoverTrigger>
                                    <PopoverContent align='end' className='z-[9999] w-64 p-0'>
                                        <MultiSelectCombobox
                                            groupBy={option => ({
                                                key: option.metadata?.groupKey as string,
                                                label: option.metadata?.groupLabel as string
                                            })}
                                            i18n={{searchPlaceholder: 'Search currencies...'}}
                                            isMultiSelect={false}
                                            options={currencyOptions}
                                            values={[donationsCurrency]}
                                            autoCloseOnSelect
                                            onChange={(values) => {
                                                if (values[0]) {
                                                    handleSettingChange('donations_currency', values[0]);
                                                }
                                            }}
                                            onClose={() => setCurrencyOpen(false)}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </InputGroupAddon>
                        </InputGroup>
                        {errors.donationsSuggestedAmount && <FieldError>{errors.donationsSuggestedAmount}</FieldError>}
                    </Field>
                    <CopyField value={donateUrl}>
                        <CopyFieldLabel>Shareable link</CopyFieldLabel>
                        <CopyFieldContent>
                            <CopyFieldValue data-testid='donate-url' />
                            <CopyFieldActions>
                                <Button data-testid='preview-shareable-link' size='sm' type='button' variant='ghost' onClick={openPreview}>Preview</Button>
                                <CopyFieldCopyButton copiedLabel='Copied' data-testid='copy-shareable-link'>Copy link</CopyFieldCopyButton>
                            </CopyFieldActions>
                        </CopyFieldContent>
                    </CopyField>
            </SettingGroupContent>
            <div className='items-center-mt-1 flex'>
                All tips and donations are subject to Stripe&apos;s <a className='ml-1 font-medium text-green' href="https://ghost.org/help/tips-donations/" rel="noopener noreferrer" target="_blank"> tipping policy</a>.
            </div>
            <DirtyConfirmDialog {...dialogProps} />
        </TopLevelGroup>
    );
};

export default withErrorBoundary(TipsAndDonations, 'Tips & donations');
