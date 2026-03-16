import populateEditor from '../../../utils/storybook/populate-storybook-editor';
import {BASIC_NODES, MINIMAL_NODES} from '../../../index';
import {CardWrapper} from './../CardWrapper';
import {ToggleCard} from './ToggleCard';
import {createEditor} from 'lexical';
import type {ComponentProps} from 'react';
import type {Meta, StoryFn} from '@storybook/react-vite';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

type StoryArgs = ComponentProps<typeof ToggleCard> & {display: keyof typeof displayOptions; heading?: string; content?: string};

const story: Meta<StoryArgs> = {
    title: 'Primary cards/Toggle card',
    component: ToggleCard,
    subcomponents: {CardWrapper},
    argTypes: {
        display: {
            options: Object.keys(displayOptions),
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

const Template: StoryFn<StoryArgs> = ({display, heading, content, ...args}) => {
    const headingEditor = createEditor({nodes: MINIMAL_NODES});
    populateEditor({editor: headingEditor, initialHtml: `${heading}`});

    const contentEditor = createEditor({nodes: BASIC_NODES});
    populateEditor({editor: contentEditor, initialHtml: `${content}`});

    return (
        <div className="kg-prose">
            <div className="not-kg-prose mx-auto my-8 min-w-[initial] max-w-[740px] py-10">
                <CardWrapper {...displayOptions[display]}>
                    <ToggleCard {...args} contentEditor={contentEditor} headingEditor={headingEditor} isEditing={displayOptions[display].isEditing} />
                </CardWrapper>
            </div>
            <div className="w-full bg-black py-10">
                <div className="not-kg-prose dark mx-auto my-8 min-w-[initial] max-w-[740px]">
                    <CardWrapper {...displayOptions[display]}>
                        <ToggleCard {...args} contentEditor={contentEditor} headingEditor={headingEditor} isEditing={displayOptions[display].isEditing} />
                    </CardWrapper>
                </div>
            </div>
        </div>
    );
};

export const Empty: StoryFn<StoryArgs> = Template.bind({});
Empty.args = {
    content: '',
    contentPlaceholder: 'Collapsible content',
    display: 'Editing',
    heading: '',
    headingPlaceholder: 'Toggle header'
};

export const Populated: StoryFn<StoryArgs> = Template.bind({});
Populated.args = {
    content: 'Toggles allow you to create collapsible sections of content which is a great way to make your content less overwhelming and easy to navigate. A common example is an FAQ section, like this one.',
    contentPlaceholder: 'Collapsible content',
    display: 'Editing',
    heading: 'When should I use Toggles?',
    headingPlaceholder: 'Toggle header'
};
