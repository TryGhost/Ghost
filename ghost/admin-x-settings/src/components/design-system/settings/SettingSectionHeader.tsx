import React from 'react';

interface Props {
    title: string;
}

const SettingSectionHeader: React.FC<Props> = ({title}) => {
    return (
        <h2 className="text-grey-700 mb-4 text-xs font-semibold uppercase tracking-normal">{title}</h2>
    );
};

export default SettingSectionHeader;