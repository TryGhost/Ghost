import Heading from '../global/Heading';
import React from 'react';
import {useSearch} from '../../components/providers/ServiceProvider';

interface Props {
    title?: string;
    description?: React.ReactNode;
    children?: React.ReactNode;
}

const SettingGroupHeader: React.FC<Props> = ({title, description, children}) => {
    const {highlightKeywords} = useSearch();

    return (
        <div className="flex items-start justify-between gap-4">
            {(title || description) &&
                <div>
                    <Heading level={5}>{highlightKeywords(title || '')}</Heading>
                    {description && <p className="mt-1 hidden max-w-lg group-[.is-not-editing]/setting-group:!visible group-[.is-not-editing]/setting-group:!block md:!visible md:!block">{highlightKeywords(description)}</p>}
                </div>
            }
            <div className='-mt-0.5'>
                {children}
            </div>
        </div>
    );
};

export default SettingGroupHeader;
