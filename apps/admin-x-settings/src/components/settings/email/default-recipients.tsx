import React, {useEffect, useRef, useState} from 'react';
import TopLevelGroup from '../../top-level-group';
import useDefaultRecipientsOptions, {type SegmentOption, type SegmentOptions} from './use-default-recipients-options';
import useSettingGroup from '../../../hooks/use-setting-group';
import {ChevronDown} from 'lucide-react';
import {Field, FieldDescription, FieldLabel, MultiSelectCombobox, Popover, PopoverContent, PopoverTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, inputSurface} from '@tryghost/shade/components';
import {SettingGroupContent} from '@tryghost/admin-x-design-system';
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

    const {loadOptions, selectedSegments, setSelectedSegments} = useDefaultRecipientsOptions(selectedOption, defaultEmailRecipientsFilter);
    const [segmentOptions, setSegmentOptions] = useState<SegmentOptions>([]);

    useEffect(() => {
        if (selectedSegments) {
            setSegmentOptions(current => [...selectedSegments, ...flattenSegmentOptions(current).filter(option => !selectedSegments.some(selected => selected.value === option.value))]);
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
    const requestSegmentOptions = (query: string) => {
        segmentRequest.current += 1;
        const request = segmentRequest.current;
        setSegmentsLoading(true);
        loadOptions(query, (options) => {
            if (request === segmentRequest.current) {
                setSegmentOptions(options);
                setSegmentsLoading(false);
            }
        });
    };
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
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            <SettingGroupContent columns={1}>
                <Field>
                    <FieldLabel>Default Newsletter recipients</FieldLabel>
                    <Select value={selectedOption} onValueChange={setDefaultRecipientValue}>
                        <SelectTrigger aria-label='Default Newsletter recipients' data-testid='default-recipients-select'><SelectValue>{selectedRecipientLabel}</SelectValue></SelectTrigger>
                        <SelectContent className='z-[9999]'>
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
                {(selectedOption === 'segment') && selectedSegments && (
                    <Field>
                        <FieldLabel>Filter</FieldLabel>
                        <Popover open={segmentsOpen} onOpenChange={(open) => {
                            setSegmentsOpen(open);
                            if (open) {
                                requestSegmentOptions('');
                            }
                        }}>
                            <PopoverTrigger asChild>
                                <button aria-label='Filter' className={`${inputSurface('self')} flex h-(--control-height) w-full items-center justify-between px-3 text-control`} role='combobox' type='button'>
                                    {selectedSegments.length ? (
                                        <span className='flex min-w-0 truncate'>
                                            {selectedSegments.map((option, index) => (
                                                <React.Fragment key={option.value}>
                                                    <span>{option.label}</span>{index < selectedSegments.length - 1 ? <span>,&nbsp;</span> : null}
                                                </React.Fragment>
                                            ))}
                                        </span>
                                    ) : <span className='truncate text-muted-foreground'>Select...</span>}
                                    <ChevronDown className='ml-2 size-4 shrink-0 opacity-50' />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent align='start' className='z-[9999] w-(--radix-popover-trigger-width) p-0'>
                                <MultiSelectCombobox
                                    groupBy={option => option.metadata?.group as string | undefined}
                                    isLoading={segmentsLoading}
                                    options={flattenedSegmentOptions}
                                    shouldFilter={false}
                                    values={selectedSegments.map(option => option.value)}
                                    onChange={updateSelectedSegments}
                                    onSearchChange={requestSegmentOptions}
                                />
                            </PopoverContent>
                        </Popover>
                    </Field>
                )}
            </SettingGroupContent>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(DefaultRecipients, 'Default recipients');
