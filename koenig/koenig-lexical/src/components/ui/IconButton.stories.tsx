import DeleteIcon from '../../assets/icons/kg-trash.svg?react';
import {IconButton} from './IconButton';
import type {Meta, StoryFn} from '@storybook/react-vite';

const story: Meta<typeof IconButton> = {
    title: 'Generic/Icon button',
    component: IconButton,
    parameters: {
        status: {
            type: 'functional'
        }
    }
};
export default story;

const Template: StoryFn<typeof IconButton> = (args) => {
    return (
        <IconButton {...args} />
    );
};

export const Default: StoryFn<typeof IconButton> = Template.bind({});
Default.args = {
    Icon: DeleteIcon
};
