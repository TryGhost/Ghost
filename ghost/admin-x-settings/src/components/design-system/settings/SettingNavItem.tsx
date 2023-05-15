import React from 'react';

interface Props {
    name: string;
}

const SettingNavItem: React.FC<Props> = ({name}) => {
    return (
        <li><a className="block px-0 py-1 text-sm" href="_blank">{name}</a></li>
    );
};

export default SettingNavItem;