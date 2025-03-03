import React from 'react';
import {ColorPickerBeta} from './ColorPickerBeta';

const story = {
    title: 'Generic/Color picker (beta)',
    component: ColorPickerBeta,
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
            <ColorPickerBeta {...args} />
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
