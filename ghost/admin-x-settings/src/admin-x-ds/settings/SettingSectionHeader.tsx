import React from 'react';

interface Props {
    title: string;
}

const SettingSectionHeader: React.FC<Props> = ({title}) => {
    return (
        <h2 className="mb-4 text-2xs font-semibold uppercase tracking-wide text-grey-700">{title}</h2>
    );
};

export default SettingSectionHeader;