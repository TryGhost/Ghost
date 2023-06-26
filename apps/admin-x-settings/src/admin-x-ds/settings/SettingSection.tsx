import React from 'react';
import SettingSectionHeader from './SettingSectionHeader';
import {useSearch} from '../../components/providers/ServiceProvider';

interface Props {
    title?: string;
    keywords?: string[];
    children?: React.ReactNode;
}

const SettingSection: React.FC<Props> = ({title, keywords = [], children}) => {
    const {checkVisible} = useSearch();

    return (
        <div className={checkVisible(keywords) ? '' : 'hidden'}>
            {title && <SettingSectionHeader sticky={true} title={title} />}
            {children &&
                <div className="mb-[100px] flex flex-col gap-9">
                    {children}
                </div>
            }
        </div>
    );
};

export default SettingSection;
