import Button from './Button';
import React from 'react';

import {ButtonColors} from './Button';

interface ButtonGroupProps {
    buttons: Array<{
        label: string,
        color?: ButtonColors,
    }>;
    link?: boolean;
}

const ButtonGroup: React.FC<ButtonGroupProps> = ({buttons, link}) => {
    return (
        <div className={`flex items-center ${link ? 'gap-5' : 'gap-2'}`}>
            {buttons.map(({color, label}) => (
                <Button key={color} color={color} label={label} link={link} />
            ))}
        </div>
    );
};

export default ButtonGroup;