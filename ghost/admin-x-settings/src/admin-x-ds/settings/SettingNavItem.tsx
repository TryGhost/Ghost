import React from 'react';

interface Props {
    title: string;
}

const SettingNavItem: React.FC<Props> = ({title}) => {
    return (
        <li><a className="block px-0 py-1 text-sm" href="_blank">{title}</a></li>
    );
};

export default SettingNavItem;