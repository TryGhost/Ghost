import React from 'react';

interface HintProps {
    children?: React.ReactNode;
    color?: string;
}

const Hint: React.FC<HintProps> = ({children, color, ...props}) => {
    return (
        <span className={`mt-2 inline-block text-xs ${color ? `text-${color}` : `text-grey-700`}`} {...props}>{children}</span>
    );
};

export default Hint;