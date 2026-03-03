import {Select, type SelectOption} from '@tryghost/admin-x-design-system';

type SelectRowFieldProps = {
    label: string;
    options: SelectOption[];
    selectedOption?: SelectOption;
    testId?: string;
    onSelect: (option: SelectOption | null) => void;
};

export const SelectRowField: React.FC<SelectRowFieldProps> = ({label, options, selectedOption, testId, onSelect}) => {
    return (
        <div className='flex w-full items-center justify-between gap-2'>
            <div className='shrink-0'>{label}</div>
            <Select
                containerClassName='max-w-[200px]'
                options={options}
                selectedOption={selectedOption}
                testId={testId}
                onSelect={onSelect}
            />
        </div>
    );
};
