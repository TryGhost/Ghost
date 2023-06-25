import React from 'react';
import SettingSectionHeader from './SettingSectionHeader';
import {useSearch} from '../../components/providers/ServiceProvider';

interface Props {
    title?: string;
    groups: Array<{
        element: React.ReactNode
        searchKeywords: string[]
    }>;
}

const SettingSection: React.FC<Props> = ({title, groups}) => {
    const {checkVisible} = useSearch();
    const isVisible = groups.some(({searchKeywords}) => checkVisible(searchKeywords));

    return (
        <div className={isVisible ? '' : 'hidden'}>
            {title && <SettingSectionHeader sticky={true} title={title} />}
            <div className="mb-[100px] flex flex-col gap-9">
                {groups.map(({element, searchKeywords}) => (
                    <div key={searchKeywords.join(' ')} className={checkVisible(searchKeywords) ? '' : 'hidden'}>
                        {element}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SettingSection;
