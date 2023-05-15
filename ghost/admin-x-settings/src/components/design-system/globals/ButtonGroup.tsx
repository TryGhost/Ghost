import React from 'react';
import Button from './Button';

import { ButtonColors } from './Button';

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
                <Button label={label} color={color} link={link} />
            ))}
        </div>
    );
}

export default ButtonGroup;