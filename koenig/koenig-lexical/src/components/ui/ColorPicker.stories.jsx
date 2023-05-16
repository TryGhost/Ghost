import React from 'react';
import {ColorPicker} from './ColorPicker';

const story = {
    title: 'Generic/Color picker',
    component: ColorPicker,
    parameters: {
        status: {
            type: 'uiReady'
        }
    },
    argTypes: {
        selectedName: {control: 'select', options: ['grey', 'blue', 'green', 'yellow', 'red', 'pink', 'purple']}
    }
};
export default story;

const Template = (args) => {
    return (
        <div className="w-[240px]">
            <ColorPicker {...args} />
        </div>
    );
};

export const Default = Template.bind({});
Default.args = {
    swatches: [
        {title: 'Brand color', accent: true},
        {title: 'Black', hex: '#000000'},
        {title: 'Transparent', transparent: true}
    ]
};
