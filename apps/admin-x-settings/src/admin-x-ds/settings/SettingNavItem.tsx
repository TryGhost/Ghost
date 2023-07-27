import React from 'react';
import clsx from 'clsx';
import useRouting from '../../hooks/useRouting';

interface Props {
    title: React.ReactNode;
    navid?: string;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const SettingNavItem: React.FC<Props> = ({
    title,
    navid = '',
    onClick = () => {}
}) => {
    const {scrolledRoute} = useRouting();

    const classNames = clsx(
        'block px-0 py-1 text-sm',
        (scrolledRoute === navid) && 'font-bold'
    );

    return (
        <li><button className={classNames} name={navid} type='button' onClick={onClick}>{title}</button></li>
    );
};

export default SettingNavItem;