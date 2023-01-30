import React from 'react';
import {GalleryCard} from './GalleryCard';
import {CardWrapper} from './../CardWrapper';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false}
};

const story = {
    title: 'Primary cards/Gallery card',
    component: GalleryCard,
    subcomponent: {CardWrapper},
    argTypes: {
        display: {
            options: Object.keys(displayOptions),
            mapping: displayOptions,
            control: {
                type: 'radio',
                labels: {
                    Default: 'Default',
                    Selected: 'Selected'
                },
                defaultValue: displayOptions.Default
            }
        }    
    },
    parameters: {
        status: {
            type: 'inProgress'
        }
    }
};
export default story;

const Template = ({display, ...args}) => (
    <div className="kg-prose">
        <div className="mx-auto my-8 w-[1170px] min-w-[initial]">
            <CardWrapper {...display} {...args}>
                <GalleryCard {...display} {...args} />
            </CardWrapper>
        </div>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    display: 'Selected',
    caption: ''
};

