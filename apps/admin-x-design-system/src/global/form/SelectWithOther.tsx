import React, {useEffect, useState} from 'react';
import Button from '../Button';
import Select, {SelectOption, SelectProps} from './Select';
import TextField from './TextField';

export interface SelectWithOtherProps extends Omit<SelectProps, 'onSelect' | 'selectedOption' | 'options' | 'defaultValue'> {
    selectedValue?: string;
    onSelect: (value: string) => void;
    options: SelectOption[];
    otherOption?: SelectOption;
    otherPlaceholder?: string;
    otherHint?: React.ReactNode;
    backToListLabel?: string;
    defaultListValue?: string;
    validate?: (value: string) => string | null;
    allowEmpty?: boolean;
}

const SelectWithOther: React.FC<SelectWithOtherProps> = ({
    selectedValue = '',
    onSelect,
    options = [],
    otherOption = {value: 'other', label: 'Other...'},
    otherPlaceholder = 'Enter custom value',
    otherHint,
    backToListLabel = 'Choose from list',
    defaultListValue,
    validate,
    allowEmpty = false,
    error,
    hint,
    title,
    testId,
    ...restProps
}) => {
    const {...selectProps} = restProps as Record<string, unknown>;
    const [isOtherSelected, setIsOtherSelected] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    // Check if the current value is in the predefined options
    const isCustomValue = selectedValue &&
        !options.some(opt => opt.value === selectedValue) &&
        selectedValue !== otherOption.value;

    // Initialize state based on current value
    useEffect(() => {
        if (isCustomValue) {
            setIsOtherSelected(true);
        }
    }, [isCustomValue]);

    const handleSelectChange = (option: SelectOption | null) => {
        if (!option) {
            return;
        }

        if (option.value === otherOption.value) {
            setIsOtherSelected(true);
            onSelect('');
        } else {
            setIsOtherSelected(false);
            onSelect(option.value);
        }
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;

        // Validate the input
        if (validate) {
            const validationResult = validate(value);
            setValidationError(validationResult);
        } else {
            setValidationError(null);
        }

        // Handle empty state
        if (!value && !allowEmpty) {
            setValidationError('This field is required');
        }

        onSelect(value);
    };

    const handleBackToList = () => {
        setIsOtherSelected(false);
        setValidationError(null);
        if (defaultListValue && options.find(opt => opt.value === defaultListValue)) {
            onSelect(defaultListValue);
        } else if (options.length > 0) {
            onSelect(options[0].value);
        }
    };

    // Prepare options with "Other" choice
    const optionsWithOther = React.useMemo(() => {
        const hasOtherOption = options.some(opt => opt.value === otherOption.value);
        return hasOtherOption ? options : [...options, otherOption];
    }, [options, otherOption]);

    // Determine if we're in custom input mode
    const showCustomInput = isOtherSelected || isCustomValue;

    // Prepare common props
    const hasError = error || !!validationError;
    const errorText = validationError || (typeof hint === 'string' ? hint : '');

    if (showCustomInput) {
        const customInputHint = hasError ? errorText : (otherHint && typeof otherHint === 'string' ? otherHint : '');

        return (
            <div className="relative">
                {title && (
                    <div className="mb-1.5 flex items-center justify-between">
                        <label className="block text-sm font-medium text-black dark:text-white" htmlFor={testId}>
                            {title}
                        </label>
                        <Button
                            className="-mr-1 text-xs font-normal"
                            color="green"
                            label={backToListLabel}
                            size="sm"
                            link
                            onClick={handleBackToList}
                        />
                    </div>
                )}
                <TextField
                    aria-describedby={`${testId}-hint`}
                    aria-label={title}
                    data-testid={testId}
                    error={hasError}
                    hideTitle={true}
                    hint={customInputHint}
                    id={testId}
                    placeholder={otherPlaceholder}
                    title={title}
                    value={selectedValue}
                    onChange={handleTextChange}
                />
            </div>
        );
    }

    const selectedOption = options.find(opt => opt.value === selectedValue);

    return (
        <Select
            {...selectProps}
            aria-label={title}
            async={false}
            error={error}
            hint={hint}
            options={optionsWithOther}
            selectedOption={selectedOption}
            testId={testId}
            title={title}
            onSelect={handleSelectChange}
        />
    );
};

export default SelectWithOther;