import React from 'react';

interface Props {
    name: string;
}

const SettingSectionHeader: React.FC<Props> = ({name}) => {
    return (
        <h2 className="text-grey-700 mb-4 text-xs font-semibold uppercase tracking-normal">{name}</h2>
    );
};

export default SettingSectionHeader;