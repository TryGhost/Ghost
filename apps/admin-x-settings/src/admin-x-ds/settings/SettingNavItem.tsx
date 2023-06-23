import React from 'react';

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
    return (
        <li><button className="block px-0 py-1 text-sm" name={navid} type='button' onClick={onClick}>{title}</button></li>
    );
};

export default SettingNavItem;