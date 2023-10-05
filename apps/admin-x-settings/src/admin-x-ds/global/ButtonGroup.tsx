import Button from './Button';
import React from 'react';

import {ButtonProps} from './Button';

interface ButtonGroupProps {
    buttons: Array<ButtonProps>;
    link?: boolean;
    linkWithPadding?: boolean;
    className?: string;
}

const ButtonGroup: React.FC<ButtonGroupProps> = ({buttons, link, linkWithPadding, className}) => {
    return (
        <div className={`flex items-center ${link ? 'gap-5' : 'gap-3'} ${className}`}>
            {buttons.map(({key, ...props}) => (
                <Button key={key} link={link} linkWithPadding={linkWithPadding} {...props} />
            ))}
        </div>
    );
};

export default ButtonGroup;