import Button from './Button';
import React from 'react';

import {IButton} from './Button';

interface ButtonGroupProps {
    buttons: Array<IButton>;
    link?: boolean;
    className?: string;
}

const ButtonGroup: React.FC<ButtonGroupProps> = ({buttons, link, className}) => {
    return (
        <div className={`flex items-center ${link ? 'gap-5' : 'gap-3'} ${className}`}>
            {buttons.map(({key, ...props}) => (
                <Button key={key} link={link} {...props} />
            ))}
        </div>
    );
};

export default ButtonGroup;