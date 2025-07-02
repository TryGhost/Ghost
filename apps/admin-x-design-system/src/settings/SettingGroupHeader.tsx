import React from 'react';
import Heading from '../global/Heading';

export interface SettingGroupHeaderProps {
    title?: React.ReactNode;
    description?: React.ReactNode;
    beta?: boolean;
    children?: React.ReactNode;
}

const SettingGroupHeader: React.FC<SettingGroupHeaderProps> = ({title, description, children, beta = false}) => {
    return (
        <div className="flex items-start justify-between gap-4">
            {(title || description) &&
                <div>
                    <Heading className='font-semibold' level={5}>{title}{beta && <sup className='ml-0.5 text-[10px] font-semibold uppercase tracking-wide'>Beta</sup>}</Heading>
                    {description && <p className="mt-1 hidden max-w-md group-[.is-not-editing]/setting-group:!visible group-[.is-not-editing]/setting-group:!block md:!visible md:!block">{description}</p>}
                </div>
            }
            <div>
                {children}
            </div>
        </div>
    );
};

export default SettingGroupHeader;
