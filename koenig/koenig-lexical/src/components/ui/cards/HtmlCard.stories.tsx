import HtmlIndicatorIcon from '../../../assets/icons/kg-indicator-html.svg?react';
import {CardWrapper} from '../CardWrapper';
import {HtmlCard} from './HtmlCard';
import type {ComponentProps} from 'react';
import type {Meta, StoryFn} from '@storybook/react-vite';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

type StoryArgs = ComponentProps<typeof HtmlCard> & {display: keyof typeof displayOptions};

const story: Meta<StoryArgs> = {
    title: 'Primary cards/Html card',
    component: HtmlCard,
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
                }
            }
        }
    },
    parameters: {
        status: {
            type: 'functional'

        }
    }
};
export default story;

const Template: StoryFn<StoryArgs> = ({display, ...args}) => (
    <div className="kg-prose">
        <div className="mx-auto my-8 w-[740px] min-w-[initial]">
            <CardWrapper IndicatorIcon={HtmlIndicatorIcon} wrapperStyle='code-card' {...displayOptions[display]} {...args}>
                <HtmlCard {...displayOptions[display]} {...args} />
            </CardWrapper>
        </div>
    </div>
);

export const Empty: StoryFn<StoryArgs> = Template.bind({});
Empty.args = {
    html: '',
    display: 'Editing'
};

export const Progress: StoryFn<StoryArgs> = Template.bind({});
Progress.args = {
    html: `<h1>Header</h1>\n\r<p>Paragraph</p>\n\r<ul><li>List</li><li>Items</li></ul>\n\r<!-- comment -->`,
    display: 'Editing'
};

export const Populated: StoryFn<StoryArgs> = Template.bind({});
Populated.args = {
    html: `<h1>Header</h1>\n\r<p>Paragraph</p>\n\r<ul><li>List</li><li>Items</li></ul>\n\r<!-- comment -->`,
    display: 'Selected'
};
