import React from 'react';
import {useSearch} from '../../components/providers/ServiceProvider';

interface Props {
    title?: string;
    keywords?: string[];
    children?: React.ReactNode;
}

const SettingNavSection: React.FC<Props> = ({title, keywords, children}) => {
    const {checkVisible} = useSearch();

    if (!checkVisible(keywords || [])) {
        return null;
    }

    return (
        <>
            {title && <h2 className='mb-4 ml-2 text-[16px] tracking-tight'>{title}</h2>}
            {children &&
                <ul className="mb-14 mt-[-8px]">
                    {children}
                </ul>
            }
        </>
    );
};

export default SettingNavSection;
