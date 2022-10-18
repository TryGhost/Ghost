import React from 'react';

import {PlusButton} from './PlusMenu';

const story = {
    title: 'Card menu/Plus menu',
    component: PlusButton
};
export default story;

const Template = args => (
    <div className="relative ml-[66px] mt-[2px]">
        <PlusButton {...args} />
    </div>
);

export const Default = Template.bind({});
