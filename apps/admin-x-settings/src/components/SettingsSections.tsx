import React from 'react';
import SettingSection from '../admin-x-ds/settings/SettingSection';
import {useSearch} from './providers/ServiceProvider';

const SettingsSections: React.FC<{
    sections: Array<{
        title: string
        groups: Array<{
            searchKeywords: string[]
            component: React.ComponentType<{}>
        }>
    }>
}> = ({sections}) => {
    const {checkVisible} = useSearch();

    return <>
        {sections.map((section) => {
            const isSectionVisible = section.groups.some(group => checkVisible(group.searchKeywords));

            return (
                <div className={isSectionVisible ? '' : 'hidden'}>
                    <SettingSection key={section.title} title={section.title}>
                        {section.groups.map((group) => {
                            const isGroupVisible = checkVisible(group.searchKeywords);

                            return (
                                <div key={group.component.displayName} className={isGroupVisible ? '' : 'hidden'}>
                                    <group.component />
                                </div>
                            );
                        })}
                    </SettingSection>
                </div>
            );
        })}
    </>;
};

export default SettingsSections;
