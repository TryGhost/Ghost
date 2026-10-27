import ImgFullIcon from '../../assets/icons/kg-img-full.svg?react';
import ImgRegularIcon from '../../assets/icons/kg-img-regular.svg?react';
import ImgWideIcon from '../../assets/icons/kg-img-wide.svg?react';
import {ButtonGroup, ButtonGroupIconButton} from './ButtonGroup';
import type {Meta, StoryFn} from '@storybook/react-vite';

const story: Meta<typeof ButtonGroup> = {
    title: 'Generic/Button group (beta)',
    component: ButtonGroup,
    subcomponents: {ButtonGroupIconButton},
    parameters: {
        status: {
            type: 'functional'
        }
    },
    argTypes: {
        selectedName: {control: 'select', options: ['regular', 'wide', 'full']}
    }
};
export default story;

const Template: StoryFn<typeof ButtonGroup> = (args) => {
    return (
        <ButtonGroup {...args} />
    );
};

export const CardWidth: StoryFn<typeof ButtonGroup> = Template.bind({});
CardWidth.args = {
    selectedName: 'regular',
    buttons: [
        {
            label: 'Regular',
            name: 'regular',
            Icon: ImgRegularIcon
        },
        {
            label: 'Wide',
            name: 'wide',
            Icon: ImgWideIcon
        },
        {
            label: 'Full',
            name: 'full',
            Icon: ImgFullIcon
        }
    ]
};
