import React from 'react';

interface Props {
    name: string;
}

const SettingGroupHeader: React.FC<Props> = ({name}) => {
    return (
        <h2 className="text-xs mb-4 uppercase font-semibold tracking-normal text-grey-700">{name}</h2>
    );
}

export default SettingGroupHeader;