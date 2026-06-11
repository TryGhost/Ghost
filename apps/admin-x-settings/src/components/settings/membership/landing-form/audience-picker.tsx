import React, {useEffect, useState} from 'react';
import useDefaultRecipientsOptions from '../../email/use-default-recipients-options';
import {MultiSelect, type MultiSelectOption, Select} from '@tryghost/admin-x-design-system';
import {type MultiValue} from 'react-select';

// POC Story 5.5: a controlled audience picker, reusing the Newsletter "Default
// recipients" pattern (Select + tier/label MultiSelect via useDefaultRecipientsOptions).
// Trimmed to All members / Paid-members only / Specific people. The audience is a
// comma-joined NQL-style filter string, the same shape the recipient picker emits.
const ALL = 'status:free,status:-free';
const PAID = 'status:-free';

const OPTIONS = [
    {label: 'All members', hint: 'Everyone, free or paid', value: 'all-members'},
    {label: 'Paid-members only', hint: 'People with a premium subscription', value: 'paid-only'},
    {label: 'Specific people', hint: 'Only people with any of the selected tiers or labels', value: 'segment'}
];

function optionFor(audience: string): string {
    if (!audience || audience === ALL) {
        return 'all-members';
    }
    if (audience === PAID) {
        return 'paid-only';
    }
    return 'segment';
}

const AudiencePicker: React.FC<{
    audience: string
    onChange: (audience: string) => void
    title?: string
}> = ({audience, onChange, title = 'Audience'}) => {
    const [selectedOption, setSelectedOption] = useState(optionFor(audience));
    const {loadOptions, selectedSegments, setSelectedSegments} = useDefaultRecipientsOptions(selectedOption, audience);

    useEffect(() => {
        setSelectedOption(optionFor(audience));
    }, [audience]);

    const onSelectOption = (value: string) => {
        setSelectedOption(value);
        if (value === 'all-members') {
            onChange(ALL);
        } else if (value === 'paid-only') {
            onChange(PAID);
        }
        // 'segment': keep the current filter until the member picks tiers/labels below.
    };

    const onSelectSegments = (selected: MultiValue<MultiSelectOption>) => {
        setSelectedSegments(selected);
        onChange(selected.map(({value}) => value).join(','));
    };

    return (
        <div className='flex flex-col gap-3'>
            <Select
                hint='Who should this form be shown to?'
                options={OPTIONS}
                selectedOption={OPTIONS.find(option => option.value === selectedOption)}
                testId='landing-form-audience'
                title={title}
                onSelect={option => option && onSelectOption(option.value)}
            />
            {selectedOption === 'segment' && selectedSegments && (
                <MultiSelect
                    loadOptions={loadOptions}
                    title='Filter'
                    values={selectedSegments}
                    async
                    defaultOptions
                    onChange={onSelectSegments}
                />
            )}
        </div>
    );
};

export default AudiencePicker;
