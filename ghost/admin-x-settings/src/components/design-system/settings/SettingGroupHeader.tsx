import React from 'react';

interface Props {
    title: string;
    description?: React.ReactNode;
    children?: React.ReactNode;
}

const SettingGroupHeader: React.FC<Props> = ({title, description, children}) => {
    return (
        <div className="flex justify-between items-start">
            <div>
                <h5>{title}</h5>
                {description && <p className="text-sm">{description}</p>}
            </div>
            {children}
        </div>
    );
}

export default SettingGroupHeader;