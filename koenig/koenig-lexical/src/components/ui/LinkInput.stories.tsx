import {LinkInput} from './LinkInput';
import type {Meta, StoryFn} from '@storybook/react-vite';

const story: Meta<typeof LinkInput> = {
    title: 'Toolbar/LinkInput',
    component: LinkInput,
    parameters: {
        status: {
            type: 'functional'
        }
    }
};
export default story;

const Template: StoryFn<typeof LinkInput> = (args) => {
    return (
        <div className="flex">
            <LinkInput {...args} />
        </div>
    );
};

export const Empty: StoryFn<typeof LinkInput> = Template.bind({});
Empty.args = {
    href: ''
};

export const Populated: StoryFn<typeof LinkInput> = Template.bind({});
Populated.args = {
    href: 'https://ghost.org'
};