import type {Meta, StoryObj} from '@storybook/react-vite';

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from './accordion';

const meta = {
    title: 'Components / Accordion',
    component: Accordion,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component:
                    'Disclosure component for toggling sections of content. Use `type="single"` for one-at-a-time expansion or `type="multiple"` to allow several items open.'
            }
        }
    }
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof Accordion>;

export const Default: Story = {
    args: {
        type: 'single',
        collapsible: true,
        children: [
            <AccordionItem key="item-1" value="item-1">
                <AccordionTrigger>Is it accessible?</AccordionTrigger>
                <AccordionContent>
                    Yes. It adheres to the WAI-ARIA design pattern.
                </AccordionContent>
            </AccordionItem>,
            <AccordionItem key="item-2" value="item-2">
                <AccordionTrigger>Is it styled?</AccordionTrigger>
                <AccordionContent>
                    Yes. It comes with default styles that matches the other
                    components&apos; aesthetic.
                </AccordionContent>
            </AccordionItem>,
            <AccordionItem key="item-3" value="item-3">
                <AccordionTrigger>Is it animated?</AccordionTrigger>
                <AccordionContent>
                    Yes. It&apos;s animated by default, but you can disable it
                    if you prefer.
                </AccordionContent>
            </AccordionItem>
        ]
    },
    parameters: {
        docs: {
            description: {
                story: 'Single mode with collapsible behavior; only one section is expanded at a time.'
            }
        }
    }
};

export const Multiple: Story = {
    args: {
        type: 'multiple',
        children: [
            <AccordionItem key="item-1" value="item-1">
                <AccordionTrigger>What is Ghost?</AccordionTrigger>
                <AccordionContent>
                    Ghost is a powerful platform for building modern online
                    publications. It&apos;s designed for professional
                    publishers, bloggers, and content creators who want to focus
                    on creating great content.
                </AccordionContent>
            </AccordionItem>,
            <AccordionItem key="item-2" value="item-2">
                <AccordionTrigger>How do I get started?</AccordionTrigger>
                <AccordionContent>
                    Getting started with Ghost is easy. You can either use
                    Ghost(Pro) for a hosted solution or self-host Ghost on your
                    own server. Both options come with comprehensive
                    documentation and support.
                </AccordionContent>
            </AccordionItem>,
            <AccordionItem key="item-3" value="item-3">
                <AccordionTrigger>
                    What features does Ghost offer?
                </AccordionTrigger>
                <AccordionContent>
                    Ghost offers a wide range of features including a powerful
                    editor, built-in SEO tools, membership and subscription
                    management, email newsletters, analytics, and much more.
                </AccordionContent>
            </AccordionItem>
        ]
    },
    parameters: {
        docs: {
            description: {
                story: 'Multiple mode allows several items to be expanded simultaneously.'
            }
        }
    }
};

export const CustomStyling: Story = {
    args: {
        type: 'single',
        collapsible: true,
        className: 'w-full max-w-md',
        children: [
            <AccordionItem
                key="item-1"
                className="border-blue-200 mb-2 rounded-lg border-2"
                value="item-1"
            >
                <AccordionTrigger className="bg-blue-50 rounded-t-lg px-4 py-3 hover:bg-blue-100">
                    Custom styled trigger
                </AccordionTrigger>
                <AccordionContent className="rounded-b-lg bg-white px-4 py-3">
                    This accordion item has custom styling with colored borders
                    and backgrounds.
                </AccordionContent>
            </AccordionItem>,
            <AccordionItem
                key="item-2"
                className="border-green-200 rounded-lg border-2"
                value="item-2"
            >
                <AccordionTrigger className="bg-green-50 rounded-t-lg px-4 py-3 hover:bg-green-100">
                    Another custom item
                </AccordionTrigger>
                <AccordionContent className="rounded-b-lg bg-white px-4 py-3">
                    Each item can have its own custom styling while maintaining
                    the accordion functionality.
                </AccordionContent>
            </AccordionItem>
        ]
    },
    parameters: {
        docs: {
            description: {
                story: 'Tailor borders, padding, and hover states via `className` on the wrapper and subcomponents.'
            }
        }
    }
};

export const WithDefaultOpen: Story = {
    args: {
        type: 'single',
        defaultValue: 'item-1',
        children: [
            <AccordionItem key="item-1" value="item-1">
                <AccordionTrigger>Opens by default</AccordionTrigger>
                <AccordionContent>
                    Use `defaultValue` (uncontrolled) or `value` (controlled) to manage open state.
                </AccordionContent>
            </AccordionItem>,
            <AccordionItem key="item-2" value="item-2">
                <AccordionTrigger>Second item</AccordionTrigger>
                <AccordionContent>Closed initially.</AccordionContent>
            </AccordionItem>
        ]
    },
    parameters: {
        docs: {
            description: {
                story: 'Demonstrates initial open state using `defaultValue`.'
            }
        }
    }
};
