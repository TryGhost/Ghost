import {Toggle} from './Toggle';
import type {Meta, StoryFn} from '@storybook/react-vite';

const story: Meta<typeof Toggle> = {
    title: 'Generic/Toggle',
    component: Toggle,
    parameters: {
        status: {
            type: 'functional'
        }
    }
};
export default story;

const Template: StoryFn<typeof Toggle> = args => (
    <Toggle {...args} />
);

export const Default: StoryFn<typeof Toggle> = Template.bind({});
Default.args = {
    isChecked: true
};
