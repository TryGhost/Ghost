import {LinkToolbar} from './LinkToolbar';
import type {Meta, StoryFn} from '@storybook/react-vite';

const story: Meta<typeof LinkToolbar> = {
    title: 'Toolbar/LinkToolbar',
    component: LinkToolbar,
    parameters: {
        status: {
            type: 'functional'
        }
    }
};
export default story;

const Template: StoryFn<typeof LinkToolbar> = (args) => {
    return (
        <div className="flex">
            <LinkToolbar {...args} />
        </div>
    );
};

export const Base: StoryFn<typeof LinkToolbar> = Template.bind({});
Base.args = {
    href: 'https://ghost.org/'
};
