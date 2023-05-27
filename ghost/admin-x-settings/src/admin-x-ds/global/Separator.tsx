import React from 'react';

interface SeparatorProps {
    color?: string;
}

const Separator: React.FC<SeparatorProps> = ({color}) => {
    return <hr className={`border-${color ? color : 'grey-300'}`} />;
};

export default Separator;