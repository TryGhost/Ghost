import React from 'react';

interface ToggleGroupProps {
    children?: React.ReactNode;
}

/**
 * A simple container to group sequencing toggle switches
 */
const ToggleGroup: React.FC<ToggleGroupProps> = ({children}) => {
    return (
        <div className='flex flex-col gap-3'>
            {children}
        </div>
    );
};

export default ToggleGroup;