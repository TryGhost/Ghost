import {Dropdown} from './Dropdown';
import type {Meta, StoryFn} from '@storybook/react-vite';

const story: Meta<typeof Dropdown> = {
    title: 'Generic/Dropdown',
    component: Dropdown,
    argTypes: {
        value: {control: 'radio', options: ['Free members', 'Paid members']}
    },
    parameters: {
        status: {
            type: 'uiReady'
        }
    }
};
export default story;

const Template: StoryFn<typeof Dropdown> = args => (
    <div className="w-[240px]">
        <Dropdown {...args} />
    </div>
);

export const Default: StoryFn<typeof Dropdown> = Template.bind({});
Default.args = {
    value: 'Free members',
    menu: [{label: 'Free members', name: 'Free members'}, {label: 'Paid members', name: 'Paid members'}]
};
