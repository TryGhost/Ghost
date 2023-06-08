import React from 'react';
import Select, {SelectOption} from './Select';
import clsx from 'clsx';

interface URLSelectProps {
    options: SelectOption[];
    onSelect: (value: string) => void;
}

const URLSelect: React.FC<URLSelectProps> = ({options, onSelect}) => {
    const selectClasses = clsx(
        `!h-[unset] w-full appearance-none rounded-full border border-grey-100 bg-white px-3 py-1 text-sm`
    );

    const containerClasses = clsx(
        'relative w-full max-w-[380px] self-center after:pointer-events-none',
        `after:absolute after:right-4 after:top-[9px] after:block after:h-2 after:w-2 after:rotate-45 after:border-[1px] after:border-l-0 after:border-t-0 after:border-grey-900 after:content-['']`
    );

    return (
        <Select
            containerClassName={containerClasses}
            options={options}
            selectClassName={selectClasses}
            unstyled={true}
            onSelect={onSelect}
        />
    );
};

export default URLSelect;