import React from 'react';
import populateNestedEditor from '../../../utils/populateNestedEditor';
import {BASIC_NODES} from '../../../index.js';
import {CardWrapper} from '../CardWrapper';
import {EmailCard} from './EmailCard';
import {ReactComponent as EmailIndicatorIcon} from '../../../assets/icons/kg-indicator-email.svg';
import {createEditor} from 'lexical';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

const story = {
    title: 'Primary cards/Email content card',
    component: EmailCard,
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

const Template = ({display, html, ...args}) => {
    const editor = createEditor({nodes: BASIC_NODES});
    populateNestedEditor({editor, initialHtml: `<p>${html}</p>`});

    return (
        <div className="kg-prose">
            <div className="mx-auto my-8 min-w-[initial] max-w-[740px]">
                <CardWrapper IndicatorIcon={EmailIndicatorIcon} wrapperStyle='wide' {...display} {...args}>
                    <EmailCard {...display} {...args} htmlEditor={editor} />
                </CardWrapper>
            </div>
        </div>
    );
};

export const Default = Template.bind({});
Default.args = {
    display: 'Editing',
    html: `Hey <code>{first_name, "there"}</code>,`
};

