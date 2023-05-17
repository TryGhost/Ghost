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
            {buttons.map(({key, ...props}) => (
                <Button key={key} link={link} {...props} />
            ))}
        </div>
    );
};

export default ButtonGroup;