import Heading from '../global/Heading';
import React from 'react';

interface Props {
    title?: string;
    description?: React.ReactNode;
    children?: React.ReactNode;
}

const SettingGroupHeader: React.FC<Props> = ({title, description, children}) => {
    return (
        <div className="flex items-start justify-between">
            {(title || description) && 
                <div>
                    <Heading level={5}>{title}</Heading>
                    {description && <p className="text-sm">{description}</p>}
                </div>
            }
            {children}
        </div>
    );
};

export default SettingGroupHeader;