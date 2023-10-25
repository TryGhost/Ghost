import Icon from '../global/Icon';
import React from 'react';
import clsx from 'clsx';
import {useScrollSectionContext, useScrollSectionNav} from '../../hooks/useScrollSection';
import {useSearch} from '../../components/providers/ServiceProvider';

interface Props {
    title: React.ReactNode;
    navid?: string;
    icon?: string;
    keywords?: string[];
    onClick?: (e:React.MouseEvent<HTMLAnchorElement>) => void;
}

const SettingNavItem: React.FC<Props> = ({
    title,
    navid = '',
    icon,
    keywords,
    onClick
}) => {
    const {ref, props} = useScrollSectionNav(navid);
    const {currentSection} = useScrollSectionContext();
    const {checkVisible} = useSearch();

    const classNames = clsx(
        'w-100 flex h-8 cursor-pointer items-center rounded-md px-2 py-1 text-left text-sm transition-all hover:bg-grey-100 focus:bg-grey-100 dark:text-grey-300 dark:hover:bg-grey-925 dark:focus:bg-grey-900',
        (currentSection === navid) && 'bg-grey-200 dark:bg-grey-900',
        !checkVisible(keywords || []) && 'hidden'
    );

    return (
        <li ref={ref} {...props}><a className={classNames} id={navid} onClick={onClick}>
            {icon && <Icon className='mr-[7px]' name={icon} size='sm' />}
            {title}
        </a></li>
    );
};

export default SettingNavItem;
