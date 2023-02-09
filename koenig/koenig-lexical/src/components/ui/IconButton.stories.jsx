import React from 'react';

import {IconButton} from './IconButton';
import {ReactComponent as DeleteIcon} from '../../assets/icons/kg-trash.svg';

const story = {
    title: 'Generic/Icon button',
    component: IconButton,
    parameters: {
        status: {
            type: 'functional'
        }
    }
};
export default story;

const Template = (args) => {
    return (
        <IconButton {...args} />
    );
};

export const Default = Template.bind({});
Default.args = {
    Icon: DeleteIcon
};