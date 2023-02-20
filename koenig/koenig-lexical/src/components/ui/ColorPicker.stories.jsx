import React from 'react';
import {ColorPicker, ColorButton} from './ColorPicker';

const story = {
    title: 'Generic/Color picker',
    component: ColorPicker,
    subcomponents: {ColorButton},
    parameters: {
        status: {
            type: 'functional'
        }
    },
    argTypes: {
        selectedColor: {control: 'select', options: ['grey', 'blue', 'green', 'yellow', 'red', 'pink', 'purple']}
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
    selectedColor: 'grey',
    buttons: [
        {
            label: 'Grey',
            color: 'grey'
        },
        {
            label: 'Blue',
            color: 'blue'
        },
        {
            label: 'Green',
            color: 'green'
        },
        {
            label: 'Yellow',
            color: 'yellow'
        },
        {
            label: 'Red',
            color: 'red'
        },
        {
            label: 'Pink',
            color: 'pink'
        },
        {
            label: 'Purple',
            color: 'purple'
        }
    ]
};
