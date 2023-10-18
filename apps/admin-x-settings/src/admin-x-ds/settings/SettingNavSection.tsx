import React from 'react';
import SettingSectionHeader from './SettingSectionHeader';
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
            {title && <SettingSectionHeader title={title} />}
            {children &&
                <ul className="-mt-1 mb-10">
                    {children}
                </ul>
            }
        </>
    );
};

export default SettingNavSection;
