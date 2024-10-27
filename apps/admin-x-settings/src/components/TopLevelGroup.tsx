import React, {useEffect, useState} from 'react';
import {SettingGroup as Base, SettingGroupProps} from '@tryghost/admin-x-design-system';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {useScrollSection} from '../hooks/useScrollSection';
import {useSearch} from './providers/SettingsAppProvider';

interface TopLevelGroupProps extends Omit<SettingGroupProps, 'isVisible' | 'highlight'> {
    keywords: string[];
}

const TopLevelGroup: React.FC<TopLevelGroupProps> = ({keywords, navid, children, ...props}) => {
    const {checkVisible, noResult} = useSearch();
    const {route} = useRouting();
    const [highlight, setHighlight] = useState(false);
    const {ref} = useScrollSection(navid);

    useEffect(() => {
        setHighlight(route === navid);
        if (route === navid) {
            const timer = setTimeout(() => setHighlight(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [route, navid]);

    const hasImageChild = React.Children.toArray(children).some(
        child => React.isValidElement(child) && child.type === 'img'
    );

    const wrappedChildren = hasImageChild ? (
        <div className="-mx-5 -mb-5 overflow-hidden rounded-b-xl bg-grey-50 md:-mx-7 md:-mb-7">
            {React.Children.map(children, child => (React.isValidElement<React.ImgHTMLAttributes<HTMLImageElement>>(child) && child.type === 'img'
                ? React.cloneElement(child, {
                    className: `${child.props.className || ''} h-full w-full rounded-b-xl`.trim()
                })
                : child)
            )}
        </div>
    ) : children;

    return (
        <Base 
            ref={ref} 
            highlight={highlight} 
            isVisible={checkVisible(keywords) || noResult} 
            navid={navid} 
            {...props}
        >
            {wrappedChildren}
        </Base>
    );
};

export default TopLevelGroup;
