import React from 'react';
import SettingSectionHeader from './SettingSectionHeader';
import clsx from 'clsx';
import {useSearch} from '../../components/providers/ServiceProvider';

interface Props {
    title?: string;
    keywords?: string[];
    children?: React.ReactNode;
}

const SettingSection: React.FC<Props> = ({title, keywords = [], children}) => {
    const {checkVisible} = useSearch();

    const containerClassNames = clsx(
        'mb-[16vh]',
        checkVisible(keywords) ? '' : 'hidden'
    );

    return (
        <div className={containerClassNames}>
            {title && <SettingSectionHeader title={title} />}
            {children &&
                <div className="mb-[100px] flex flex-col gap-12">
                    {children}
                </div>
            }
        </div>
    );
};

export default SettingSection;
