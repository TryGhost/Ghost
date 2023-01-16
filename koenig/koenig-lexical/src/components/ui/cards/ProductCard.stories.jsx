import React from 'react';
import {ProductCard} from './ProductCard';
import {CardWrapper} from './../CardWrapper';

const story = {
    title: 'Primary cards/Product card',
    component: ProductCard,
    subcomponent: {CardWrapper},
    argTypes: {
        isSelected: {control: 'boolean'}
    },
    parameters: {
        status: {
            type: 'uiReady'
        }
    }
};
export default story;

const Template = args => (
    <div className="w-[740px]">
        <CardWrapper {...args}>
            <div className="flex justify-center p-3">
                <ProductCard {...args} />
            </div>
        </CardWrapper>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    isSelected: true,
    image: false,
    title: '',
    titlePlaceholder: 'Product title',
    desc: '',
    descPlaceholder: 'Description',
    button: false,
    buttonText: '',
    rating: false
};

export const Populated = Template.bind({});
Populated.args = {
    isSelected: true,
    image: true,
    title: 'Fujifilm X100V',
    titlePlaceholder: 'Product title',
    desc: 'Simple actions that lead to making everyday moments remarkable. Rediscover photography in a new and exciting way with FUJIFILM X100V mirrorless digital camera.',
    descPlaceholder: 'Description',
    button: true,
    buttonText: 'Get it now',
    rating: true
};

