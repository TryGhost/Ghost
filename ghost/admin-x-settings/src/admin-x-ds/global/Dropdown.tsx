import React, {useState} from 'react';

import Heading from './Heading';

export interface DropdownOption {
    value: string;
    label: string;
}

interface DropdownProps {
    title?: string;
    options: DropdownOption[];
    onSelect: (value: string) => void;
    help?: React.ReactNode;
}

const Dropdown: React.FC<DropdownProps> = ({title, options, onSelect, help}) => {   
    const [selectedOption, setSelectedOption] = useState('');

    const handleOptionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedValue = event.target.value;
        setSelectedOption(selectedValue);
        onSelect(selectedValue);
    };

    return (
        <div className='flex flex-col'>
            {title && <Heading formLabel={true} grey={true}>{title}</Heading>}
            <select className={`-m-1 h-10 border-b border-grey-300 py-2 focus:border-grey-900 ${title && `mt-0`}`} value={selectedOption} onChange={handleOptionChange}>
                <option value="">Select an option</option>
                {options.map(option => (
                    <option
                        key={option.value}
                        value={option.value}
                    >
                        {option.label}
                    </option>
                ))}
            </select>
            <span className='mt-2 inline-block text-xs text-grey-700'>{help}</span>
        </div>
    );
};

export default Dropdown;