import React from 'react';

import {CardMenu} from './CardMenu';
import {CardMenuSection} from './CardMenu';
import {CardMenuItem} from './CardMenu';

import {ReactComponent as DividerCardIcon} from '../../assets/icons/kg-card-type-divider.svg';
import {ReactComponent as ImageCardIcon} from '../../assets/icons/kg-card-type-image.svg';

export default {
    title: 'CardMenu/Card menu',
    component: CardMenu,
    subcomponent: {CardMenuSection, CardMenuItem}
};

const Template = args => <CardMenu {...args} />;

export const Default = Template.bind({});
Default.args = {
    children: [
        <CardMenuSection label="Primary" />,
        <CardMenuItem label="Divider" desc="Insert a dividing line" Icon={DividerCardIcon} />,
        <CardMenuItem label="Image" desc="Upload, or embed with /image [url]" Icon={ImageCardIcon} />
    ]
};