import Button from './Button';
import React from 'react';

import {IButton} from './Button';

interface ButtonGroupProps {
    buttons: Array<IButton>;
    link?: boolean;
}

const ButtonGroup: React.FC<ButtonGroupProps> = ({buttons, link}) => {
    return (
        <div className={`flex items-center ${link ? 'gap-5' : 'gap-2'}`}>
            {buttons.map(({key, color, label, onClick}) => (
                <Button key={key} color={color} label={label} link={link} onClick={onClick} />
            ))}
        </div>
    );
};

export default ButtonGroup;