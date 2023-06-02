import Icon from './Icon';
import React from 'react';

interface IconButtonProps {
    iconName: string;
}

const IconButton: React.FC<IconButtonProps> = ({iconName}) => {
    return (
        <button aria-expanded="true" aria-haspopup="true" className="flex items-center rounded-sm bg-grey-100 px-2 py-1 text-grey-400 hover:text-grey-600" id="menu-button" type="button">
            <span className="sr-only">Open menu</span>
            <Icon color="grey-900" name={iconName} />
        </button>
    );
};

export default IconButton;
