import React, {useEffect, useRef, useState} from 'react';
import TopLevelGroup from '../../top-level-group';
import useDefaultRecipientsOptions, {type SegmentOption, type SegmentOptions} from './use-default-recipients-options';
import useSettingGroup from '../../../hooks/use-setting-group';
import {Combobox, ComboboxContent, ComboboxTrigger, ComboboxValue, Field, FieldDescription, FieldError, FieldLabel, MultiSelectCombobox, Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@tryghost/shade/components';
import {SettingGroupContent} from '@tryghost/shade/patterns';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {withErrorBoundary} from '../../error-boundary';

type RefipientValueArgs = {
    defaultEmailRecipients: string;
    defaultEmailRecipientsFilter: string|null;
};

const RECIPIENT_FILTER_OPTIONS = [{
    label: 'Whoever has access to the post',
    hint: 'Free posts to everyone, premium posts sent to paid members',
    value: 'visibility'
}, {
    label: 'All members',
    hint: 'Everyone who is subscribed to newsletter updates, whether free or paid members',
    value: 'all-members'
}, {
    label: 'Paid-members only',
    hint: 'People who have a premium subscription',
    value: 'paid-only'
}, {
    label: 'Specific people',
    hint: 'Only people with any of the selected tiers or labels',
    value: 'segment'
}, {
    label: 'Usually nobody',
    hint: 'Newsletters are off for new posts, but can be enabled when needed',
    value: 'none'
}];

const flattenSegmentOptions = (options: SegmentOptions): SegmentOption[] => options.flatMap(option => 'options' in option ? option.options : [option]);

function getDefaultRecipientValue({
    defaultEmailRecipients,
    defaultEmailRecipientsFilter
}: RefipientValueArgs): string {
    if (defaultEmailRecipients === 'filter') {
        if (defaultEmailRecipientsFilter === 'status:free,status:-free') {
            return 'all-members';
        } else if (defaultEmailRecipientsFilter === 'status:-free') {
            return 'paid-only';
        } else if (defaultEmailRecipientsFilter === null) {
            return 'none';
        } else {
            return 'segment';
        }
    }

    return defaultEmailRecipients;
}

const DefaultRecipients: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [segmentsOpen, setSegmentsOpen] = useState(false);
    const [segmentsLoading, setSegmentsLoading] = useState(false);
    const segmentRequest = useRef(0);
    const segmentSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const {
        localSettings,
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        handleEditingChange
    } = useSettingGroup();

    const [defaultEmailRecipients, defaultEmailRecipientsFilter] = getSettingValues(localSettings, [
        'editor_default_email_recipients', 'editor_default_email_recipients_filter'
    ]) as [string, string|null];

    const [selectedOption, setSelectedOption] = useState(getDefaultRecipientValue({
        defaultEmailRecipients,
        defaultEmailRecipientsFilter
    }));
    const selectedRecipientLabel = RECIPIENT_FILTER_OPTIONS.find(option => option.value === selectedOption)?.label;

    const {hydrationState, loadOptions, resetSelectedSegments, retrySelectedSegments, selectedSegments, setSelectedSegments} = useDefaultRecipientsOptions(selectedOption, defaultEmailRecipientsFilter);
    const [segmentOptions, setSegmentOptions] = useState<SegmentOptions>([]);
    const loadOptionsRef = useRef(loadOptions);
    const selectedSegmentsRef = useRef(selectedSegments);
    loadOptionsRef.current = loadOptions;
    selectedSegmentsRef.current = selectedSegments;

    useEffect(() => {
        if (selectedSegments) {
            setSegmentOptions((current) => {
                const currentValues = new Set(flattenSegmentOptions(current).map(option => option.value));
                const missingSelected = selectedSegments.filter(option => !currentValues.has(option.value));
                return missingSelected.length ? [...missingSelected, ...current] : current;
            });
        }
    }, [selectedSegments]);

    // Update local state when settings change (e.g., after cancel)
    useEffect(() => {
        const newValue = getDefaultRecipientValue({
            defaultEmailRecipients,
            defaultEmailRecipientsFilter
        });
        setSelectedOption(newValue);
    }, [defaultEmailRecipients, defaultEmailRecipientsFilter]);

    const setDefaultRecipientValue = (value: string) => {
        if (['visibility', 'disabled'].includes(value)) {
            updateSetting('editor_default_email_recipients', value);
            updateSetting('editor_default_email_recipients_filter', null);
        } else {
            updateSetting('editor_default_email_recipients', 'filter');
        }

        if (value === 'all-members') {
            updateSetting('editor_default_email_recipients_filter', 'status:free,status:-free');
        }

        if (value === 'paid-only') {
            updateSetting('editor_default_email_recipients_filter', 'status:-free');
        }

        if (value === 'none') {
            updateSetting('editor_default_email_recipients_filter', null);
        }

        setSelectedOption(value);
        if (!isEditing) {
            handleEditingChange(true);
        }
    };

    const updateSelectedSegments = (values: string[]) => {
        const availableOptions = [...(selectedSegments || []), ...flattenSegmentOptions(segmentOptions)];
        const selected = values.map(value => availableOptions.find(option => option.value === value)).filter(option => option !== undefined);
        setSelectedSegments(selected);

        if (values.length) {
            updateSetting('editor_default_email_recipients_filter', values.join(','));
        } else {
            updateSetting('editor_default_email_recipients_filter', null);
            setSelectedOption('none');
        }
        if (!isEditing) {
            handleEditingChange(true);
        }
    };
    const requestSegmentOptions = (query: string, deferred = false) => {
        segmentRequest.current += 1;
        const request = segmentRequest.current;
        setSegmentsLoading(true);
        if (segmentSearchTimer.current) {
            clearTimeout(segmentSearchTimer.current);
        }
        const runRequest = () => {
            void loadOptionsRef.current(query, (options) => {
                if (request === segmentRequest.current) {
                    setSegmentOptions(options);
                }
            }).catch(() => {
                if (request === segmentRequest.current) {
                    setSegmentOptions(selectedSegmentsRef.current || []);
                }
            }).finally(() => {
                if (request === segmentRequest.current) {
                    setSegmentsLoading(false);
                }
            });
        };
        if (deferred) {
            segmentSearchTimer.current = setTimeout(runRequest, 500);
        } else {
            runRequest();
        }
    };

    useEffect(() => {
        return () => {
            segmentRequest.current += 1;
            if (segmentSearchTimer.current) {
                clearTimeout(segmentSearchTimer.current);
            }
        };
    }, []);
    const flattenedSegmentOptions = segmentOptions.flatMap(option => 'options' in option
        ? option.options.map(groupOption => ({...groupOption, metadata: {group: option.label}}))
        : [option]);

    return (
        <TopLevelGroup
            description='When you publish new content, who do you usually want to send it to?'
            isEditing={isEditing}
            keywords={keywords}
            navid='default-recipients'
            saveState={saveState}
            testId='default-recipients'
            title='Default recipients'
            hideEditButton
            onCancel={() => {
                resetSelectedSegments();
                handleCancel();
            }}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            <SettingGroupContent columns={1}>
                <Field>
                    <FieldLabel>Default Newsletter recipients</FieldLabel>
                    <Select value={selectedOption} onValueChange={setDefaultRecipientValue}>
                        <SelectTrigger aria-label='Default Newsletter recipients' data-testid='default-recipients-select'><SelectValue>{selectedRecipientLabel}</SelectValue></SelectTrigger>
                        <SelectContent>
                            {RECIPIENT_FILTER_OPTIONS.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                    <span className='flex flex-col'>
                                        <span>{option.label}</span>
                                        <span className='text-sm text-muted-foreground'>{option.hint}</span>
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FieldDescription>Who should receive your posts by default?</FieldDescription>
                </Field>
                {(selectedOption === 'segment') && (
                    <Field>
                        <FieldLabel>Filter</FieldLabel>
                        {selectedSegments ? (
                            <Combobox open={segmentsOpen} onOpenChange={(open) => {
                                setSegmentsOpen(open);
                                if (open) {
                                    requestSegmentOptions('');
                                }
                            }}>
                                <ComboboxTrigger aria-label='Filter'>
                                    <ComboboxValue placeholder={!selectedSegments.length}>
                                        {selectedSegments.length ? selectedSegments.map((option, index) => (
                                            <React.Fragment key={option.value}>
                                                <span>{option.label}</span>{index < selectedSegments.length - 1 ? <span>,&nbsp;</span> : null}
                                            </React.Fragment>
                                        )) : 'Select...'}
                                    </ComboboxValue>
                                </ComboboxTrigger>
                                <ComboboxContent>
                                    <MultiSelectCombobox
                                        groupBy={option => option.metadata?.group as string | undefined}
                                        isLoading={segmentsLoading}
                                        options={flattenedSegmentOptions}
                                        shouldFilter={false}
                                        values={selectedSegments.map(option => option.value)}
                                        onChange={updateSelectedSegments}
                                        onSearchChange={query => requestSegmentOptions(query, true)}
                                    />
                                </ComboboxContent>
                            </Combobox>
                        ) : (
                            <Combobox open={false} onOpenChange={() => {
                                if (hydrationState === 'error') {
                                    void retrySelectedSegments();
                                }
                            }}>
                                <ComboboxTrigger aria-label='Filter' disabled={hydrationState !== 'error'}>
                                    <ComboboxValue placeholder>{hydrationState === 'error' ? 'Retry loading saved filter' : 'Loading saved filter…'}</ComboboxValue>
                                </ComboboxTrigger>
                            </Combobox>
                        )}
                        {hydrationState === 'error' && <FieldError>Could not load the saved filter. Try again.</FieldError>}
                    </Field>
                )}
            </SettingGroupContent>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(DefaultRecipients, 'Default recipients');
