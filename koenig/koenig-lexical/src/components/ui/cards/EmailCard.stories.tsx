import EmailIndicatorIcon from '../../../assets/icons/kg-indicator-email.svg?react';
import populateEditor from '../../../utils/storybook/populate-storybook-editor';
import {BASIC_NODES} from '../../../index';
import {CardWrapper} from '../CardWrapper';
import {EmailCard} from './EmailCard';
import {createEditor} from 'lexical';
import type {ComponentProps} from 'react';
import type {Meta, StoryFn} from '@storybook/react-vite';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false},
    Editing: {isSelected: true, isEditing: true}
};

type StoryArgs = ComponentProps<typeof EmailCard> & {display: keyof typeof displayOptions; html?: string};

const story: Meta<StoryArgs> = {
    title: 'Primary cards/Email content card',
    component: EmailCard,
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

const Template: StoryFn<StoryArgs> = ({display, html, ...args}) => {
    const editor = createEditor({nodes: BASIC_NODES});
    populateEditor({editor, initialHtml: `${html}`});

    return (
        <div className="kg-prose">
            <div className="mx-auto my-8 min-w-[initial] max-w-[740px]">
                <CardWrapper IndicatorIcon={EmailIndicatorIcon} wrapperStyle='wide' {...displayOptions[display]} {...args}>
                    <EmailCard {...displayOptions[display]} {...args} htmlEditor={editor} />
                </CardWrapper>
            </div>
        </div>
    );
};

export const Default: StoryFn<StoryArgs> = Template.bind({});
Default.args = {
    display: 'Editing',
    html: `Hey <code>{first_name, "there"}</code>,`
};

