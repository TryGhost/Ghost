import React, {useState} from 'react';
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
    
    // Check if the current value is a custom value (not in predefined options)
    const isInitiallyCustomValue = selectedValue &&
        !options.some(opt => opt.value === selectedValue) &&
        selectedValue !== otherOption.value;

    const [isOtherSelected, setIsOtherSelected] = useState(isInitiallyCustomValue);
    const [validationError, setValidationError] = useState<string | null>(null);

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
    const showCustomInput = isOtherSelected || isInitiallyCustomValue;

    // Prepare common props
    const hasError = error || !!validationError;
    const errorText = validationError || (typeof hint === 'string' ? hint : '');

    if (showCustomInput) {
        const customInputHint = hasError ? errorText : (otherHint && typeof otherHint === 'string' ? otherHint : '');

        return (
            <div className="relative">
                <TextField
                    aria-describedby={`${testId}-hint`}
                    aria-label={title}
                    data-testid={testId}
                    error={hasError}
                    hideTitle={!title}
                    hint={customInputHint}
                    id={testId}
                    placeholder={otherPlaceholder}
                    title={title}
                    value={selectedValue}
                    onChange={handleTextChange}
                />
                <div className="mt-2">
                    <button
                        className="text-xs text-green-400 hover:text-green-500"
                        type="button"
                        onClick={handleBackToList}
                    >
                        {backToListLabel}
                    </button>
                </div>
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