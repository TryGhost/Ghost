import CardContext from '../../../context/CardContext';
import React from 'react';
import populateEditor from '../../../utils/storybook/populate-storybook-editor';
import {CardWrapper} from './../CardWrapper';
import {GalleryCard} from './GalleryCard';
import {MINIMAL_NODES} from '../../../index.js';
import {createEditor} from 'lexical';

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
            type: 'Functional'
        }
    }
};
export default story;

const Template = ({display, caption, ...args}) => {
    const captionEditor = createEditor({nodes: MINIMAL_NODES});
    populateEditor({editor: captionEditor, initialHtml: `${caption}`});

    return (
        <div className="kg-prose">
            <div className="mx-auto my-8 w-[1170px] min-w-[initial]">
                <CardContext.Provider value={{setCaptionHasFocus: () => {}}}>
                    <CardWrapper {...display} {...args}>
                        <GalleryCard {...display} {...args} captionEditor={captionEditor} />
                    </CardWrapper>
                </CardContext.Provider>
            </div>
        </div>
    );
};

export const Empty = Template.bind({});
Empty.args = {
    display: 'Selected',
    caption: '',
    filesDropper: {}
};

