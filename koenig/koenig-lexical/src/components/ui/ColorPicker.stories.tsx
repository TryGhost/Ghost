import {ColorPicker} from './ColorPicker';
import type {Meta, StoryFn} from '@storybook/react-vite';

const story: Meta<typeof ColorPicker> = {
    title: 'Generic/Color picker (New)',
    component: ColorPicker,
    parameters: {
        status: {
            type: 'uiReady'
        }
    },
    argTypes: {
        value: {control: 'text'}
    }
};
export default story;

const Template: StoryFn<typeof ColorPicker> = (args) => {
    return (
        <div className="w-[240px]">
            <ColorPicker {...args} />
        </div>
    );
};

export const Default: StoryFn<typeof ColorPicker> = Template.bind({});
Default.args = {
    value: '#000000',
    hasTransparentOption: true,
    onChange: () => {}
};
