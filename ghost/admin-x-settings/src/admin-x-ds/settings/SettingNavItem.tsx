import React from 'react';

interface Props {
    title: React.ReactNode;
    href?: string;
}

const SettingNavItem: React.FC<Props> = ({title, href}) => {
    return (
        <li><a className="block px-0 py-1 text-sm" href={href}>{title}</a></li>
    );
};

export default SettingNavItem;