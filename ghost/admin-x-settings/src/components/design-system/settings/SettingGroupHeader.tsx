import React from 'react';

interface Props {
    title: string;
    description?: React.ReactNode;
}

const SettingGroupHeader: React.FC<Props> = ({title, description}) => {
    return (
        <div>
            <h5>{title}</h5>
            {description && <p className="text-sm">{description}</p>}
        </div>
    );
}

export default SettingGroupHeader;