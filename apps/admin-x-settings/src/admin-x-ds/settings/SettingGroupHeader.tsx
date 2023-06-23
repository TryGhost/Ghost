import Heading from '../global/Heading';
import React from 'react';

interface Props {
    title?: string;
    description?: React.ReactNode;
    children?: React.ReactNode;
}

const SettingGroupHeader: React.FC<Props> = ({title, description, children}) => {
    return (
        <div className="flex items-start justify-between gap-4">
            {(title || description) && 
                <div>
                    <Heading level={5}>{title}</Heading>
                    {description && <p className="mt-0.5 max-w-lg text-sm">{description}</p>}
                </div>
            }
            {children}
        </div>
    );
};

export default SettingGroupHeader;