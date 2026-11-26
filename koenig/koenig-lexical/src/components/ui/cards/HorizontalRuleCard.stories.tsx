import {CardWrapper} from './../CardWrapper';
import {HorizontalRuleCard} from './HorizontalRuleCard';
import type {ComponentProps} from 'react';
import type {Meta, StoryFn} from '@storybook/react-vite';

const displayOptions = {
    Default: {isSelected: false, isEditing: false},
    Selected: {isSelected: true, isEditing: false}
};

type StoryArgs = ComponentProps<typeof HorizontalRuleCard> & {display: keyof typeof displayOptions};

const story: Meta<StoryArgs> = {
    title: 'Primary cards/Divider card',
    component: HorizontalRuleCard,
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
            type: 'functional'
        }
    }
};
export default story;

const Template: StoryFn<StoryArgs> = ({display, ...args}) => (
    <div className="kg-prose">
        <div className="mx-auto my-8 min-w-[initial] max-w-[740px]">
            <CardWrapper {...displayOptions[display]} {...args}>
                <HorizontalRuleCard />
            </CardWrapper>
        </div>
    </div>
);

export const Default: StoryFn<StoryArgs> = Template.bind({});
Default.args = {
    display: 'Selected'
};

