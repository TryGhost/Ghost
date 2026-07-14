import {Input} from './Input';

const story = {
    title: 'Generic/Input',
    component: Input,
    parameters: {
        status: {
            type: 'uiReady'
        }
    }
};
export default story;

const Template = args => (
    <div className="w-[240px]">
        <Input {...args} />
    </div>
);

export const Default = Template.bind({});
