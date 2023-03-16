import React from 'react';
import {CardWrapper} from '../CardWrapper';
import {HtmlCard} from './HtmlCard.jsx';
import {ReactComponent as HtmlIndicatorIcon} from '../../../assets/icons/kg-indicator-html.svg';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

const story = {
    title: 'Primary cards/Html card',
    component: HtmlCard,
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

const Template = ({display, ...args}) => (
    <div className="kg-prose">
        <div className="mx-auto my-8 w-[740px] min-w-[initial]">
            <CardWrapper IndicatorIcon={HtmlIndicatorIcon} wrapperStyle='code-card' {...display} {...args}>
                <HtmlCard updateCode={() => {}} {...display} {...args} />
            </CardWrapper>
        </div>
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    html: '',
    display: 'Editing'
};

export const Progress = Template.bind({});
Progress.args = {
    html: `<h1>Header</h1>\n\r<p>Paragraph</p>\n\r<ul><li>List</li><li>Items</li></ul>\n\r<!-- comment -->`,
    display: 'Editing'
};

export const Populated = Template.bind({});
Populated.args = {
    html: `<h1>Header</h1>\n\r<p>Paragraph</p>\n\r<ul><li>List</li><li>Items</li></ul>\n\r<!-- comment -->`,
    display: 'Selected'
};
