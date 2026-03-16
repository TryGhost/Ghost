import {Slider} from './Slider';
import type {Meta, StoryFn} from '@storybook/react-vite';

const story: Meta<typeof Slider> = {
    title: 'Generic/Slider',
    component: Slider,
    parameters: {
        status: {
            type: 'functional'
        }
    }
};
export default story;

const Template: StoryFn<typeof Slider> = args => (
    <Slider {...args} />
);

export const Default: StoryFn<typeof Slider> = Template.bind({});
Default.args = {
    min: 1,
    max: 10,
    value: 5,
    onChange: () => {}
};