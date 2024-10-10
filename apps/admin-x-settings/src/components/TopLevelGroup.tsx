import React, {useEffect, useState} from 'react';
import {SettingGroup as Base, SettingGroupProps} from '@tryghost/admin-x-design-system';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {useScrollSection} from '../hooks/useScrollSection';
import {useSearch} from './providers/SettingsAppProvider';

const TopLevelGroup: React.FC<Omit<SettingGroupProps, 'isVisible' | 'highlight'> & {keywords: string[]}> = ({keywords, navid, ...props}) => {
    const {checkVisible, noResult} = useSearch();
    const {route} = useRouting();
    const [highlight, setHighlight] = useState(false);
    const {ref} = useScrollSection(navid);

    useEffect(() => {
        setHighlight(route === navid);
    }, [route, navid]);

    useEffect(() => {
        if (highlight) {
            setTimeout(() => {
                setHighlight(false);
            }, 2000);
        }
    }, [highlight]);

    return <Base ref={ref} highlight={highlight} isVisible={checkVisible(keywords) || noResult} navid={navid} {...props} />;
};

export default TopLevelGroup;
