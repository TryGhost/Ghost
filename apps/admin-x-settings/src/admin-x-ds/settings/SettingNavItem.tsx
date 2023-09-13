import React from 'react';
import clsx from 'clsx';
import {useScrollSectionContext} from '../../hooks/useScrollSection';
import {useSearch} from '../../components/providers/ServiceProvider';

interface Props {
    title: React.ReactNode;
    navid?: string;
    keywords?: string[];
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const SettingNavItem: React.FC<Props> = ({
    title,
    navid = '',
    keywords,
    onClick = () => {}
}) => {
    const {currentSection} = useScrollSectionContext();
    const {checkVisible} = useSearch();

    const classNames = clsx(
        'block px-0 py-1 text-sm dark:text-white',
        (currentSection === navid) && 'font-bold',
        !checkVisible(keywords || []) && 'hidden'
    );

    return (
        <li><button className={classNames} name={navid} type='button' onClick={onClick}>{title}</button></li>
    );
};

export default SettingNavItem;
