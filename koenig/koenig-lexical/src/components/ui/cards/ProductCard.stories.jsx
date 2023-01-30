import React from 'react';
import {ProductCard} from './ProductCard';
import {CardWrapper} from './../CardWrapper';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

const story = {
    title: 'Primary cards/Product card',
    component: ProductCard,
    subcomponent: {CardWrapper},
    argTypes: {
        display: {
            options: Object.keys(displayOptions),
            mapping: displayOptions,
            control: {
                type: 'radio',
                labels: {
                    Default: 'Default',
                    Selected: 'Selected',
                    Editing: 'Editing'
                },
                defaultValue: displayOptions.Default
            }
        }
    },
    parameters: {
        status: {
            type: 'uiReady'
        }
    }
};
export default story;

const Template = ({display, ...args}) => (
    <div className="kg-prose">
        <div className="not-kg-prose mx-auto my-8 w-[740px] min-w-[initial]">
            <CardWrapper {...display} {...args}>
                <div className="flex justify-center p-3">
                    <ProductCard {...display} {...args} />
                </div>
            </CardWrapper>
        </div>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    display: 'Editing',
    image: false,
    title: '',
    titlePlaceholder: 'Product title',
    desc: '',
    descPlaceholder: 'Description',
    button: false,
    buttonText: '',
    buttonUrl: '',
    rating: false
};

export const Populated = Template.bind({});
Populated.args = {
    display: 'Editing',
    image: true,
    title: 'Fujifilm X100V',
    titlePlaceholder: 'Product title',
    desc: 'Simple actions that lead to making everyday moments remarkable. Rediscover photography in a new and exciting way with FUJIFILM X100V mirrorless digital camera.',
    descPlaceholder: 'Description',
    button: true,
    buttonText: 'Get it now',
    buttonUrl: 'https://ghost.org/',
    rating: true
};

