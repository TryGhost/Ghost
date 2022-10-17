import React from 'react';

import {PlusButton} from './PlusMenu';

export default {
    title: 'Card menu/Plus menu',
    component: PlusButton
};

const Template = args => (
    <div className="relative ml-[66px] mt-[2px]">
        <PlusButton {...args} />
    </div>
);

export const Default = Template.bind({});   