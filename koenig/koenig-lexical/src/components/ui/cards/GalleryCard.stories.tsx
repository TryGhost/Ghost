import CardContext from '../../../context/CardContext';
import populateEditor from '../../../utils/storybook/populate-storybook-editor';
import {CardWrapper} from './../CardWrapper';
import {GalleryCard} from './GalleryCard';
import {MINIMAL_NODES} from '../../../index';
import {createEditor} from 'lexical';
import type {ComponentProps} from 'react';
import type {Meta, StoryFn} from '@storybook/react-vite';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false}
};

type StoryArgs = ComponentProps<typeof GalleryCard> & {display: keyof typeof displayOptions; caption?: string};

const story: Meta<StoryArgs> = {
    title: 'Primary cards/Gallery card',
    component: GalleryCard,
    subcomponents: {CardWrapper},
    argTypes: {
        display: {
            options: Object.keys(displayOptions),
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

const Template: StoryFn<StoryArgs> = ({display, caption, ...args}) => {
    const captionEditor = createEditor({nodes: MINIMAL_NODES});
    populateEditor({editor: captionEditor, initialHtml: `${caption}`});

    return (
        <div className="kg-prose">
            <div className="mx-auto my-8 w-[1170px] min-w-[initial]">
                <CardContext.Provider value={{
                    isSelected: false,
                    captionHasFocus: false,
                    isEditing: false,
                    cardWidth: 'regular',
                    setCardWidth: () => {},
                    setCaptionHasFocus: () => {},
                    setEditing: () => {},
                    nodeKey: '',
                    cardContainerRef: {current: null}
                }}>
                    <CardWrapper {...displayOptions[display]} {...args}>
                        <GalleryCard {...displayOptions[display]} {...args} captionEditor={captionEditor} />
                    </CardWrapper>
                </CardContext.Provider>
            </div>
        </div>
    );
};

export const Empty: StoryFn<StoryArgs> = Template.bind({});
Empty.args = {
    display: 'Selected',
    caption: '',
    filesDropper: {}
};

