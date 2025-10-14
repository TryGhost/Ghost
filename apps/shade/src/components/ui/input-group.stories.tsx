import type {Meta, StoryObj} from '@storybook/react-vite';
import {Copy, Link, Search, X} from 'lucide-react';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
    InputGroupText,
    InputGroupTextarea
} from './input-group';

const meta = {
    title: 'Components/Input Group',
    component: InputGroup,
    parameters: {
        docs: {
            description: {
                component: 'Display additional information or actions alongside an input or textarea. Use addons to provide context, actions, or keyboard shortcuts that enhance the input experience.'
            }
        }
    },
    tags: ['autodocs']
} satisfies Meta<typeof InputGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => (
        <InputGroup>
            <InputGroupAddon>
                <Search />
            </InputGroupAddon>
            <InputGroupInput placeholder="Search..." />
        </InputGroup>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Basic input group with an icon addon at the start. Use for search inputs or fields that benefit from visual context.'
            }
        }
    }
};

export const WithTextPrefix: Story = {
    render: () => (
        <InputGroup>
            <InputGroupAddon>
                <InputGroupText>https://</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput placeholder="example.com" />
        </InputGroup>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Text prefix addon for URL or formatted inputs. Useful when the input has a predictable format or protocol.'
            }
        }
    }
};

export const WithEndAddon: Story = {
    render: () => (
        <InputGroup>
            <InputGroupInput placeholder="Enter your email" type="email" />
            <InputGroupAddon align="inline-end">
                <InputGroupText>@example.com</InputGroupText>
            </InputGroupAddon>
        </InputGroup>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Addon positioned at the end for suffixes or trailing context. Commonly used for domain inputs or unit indicators.'
            }
        }
    }
};

export const WithButtons: Story = {
    render: () => (
        <InputGroup>
            <InputGroupInput defaultValue="sk_live_abc123..." placeholder="API key" type="text" />
            <InputGroupAddon align="inline-end">
                <InputGroupButton size="icon-xs">
                    <Copy />
                </InputGroupButton>
                <InputGroupButton size="icon-xs">
                    <X />
                </InputGroupButton>
            </InputGroupAddon>
        </InputGroup>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Interactive buttons for actions like copy, clear, or submit. Buttons inherit appropriate styling and sizing.'
            }
        }
    }
};

export const WithKeyboardShortcut: Story = {
    render: () => (
        <InputGroup>
            <InputGroupAddon>
                <Search />
            </InputGroupAddon>
            <InputGroupInput placeholder="Search..." />
            <InputGroupAddon align="inline-end">
                <InputGroupText>⌘K</InputGroupText>
            </InputGroupAddon>
        </InputGroup>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Display keyboard shortcuts for accessibility and user guidance. Helps users discover quick navigation patterns.'
            }
        }
    }
};

export const WithBlockStartAddon: Story = {
    render: () => (
        <InputGroup>
            <InputGroupAddon align="block-start">
                <InputGroupText>Website URL</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput placeholder="https://example.com" />
        </InputGroup>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Block-start alignment places the addon above the input. Use for labels or descriptive text that needs more space.'
            }
        }
    }
};

export const WithBlockEndAddon: Story = {
    render: () => (
        <InputGroup>
            <InputGroupInput defaultValue="Building the future of..." placeholder="Write your bio..." />
            <InputGroupAddon align="block-end">
                <InputGroupText>27 / 160</InputGroupText>
            </InputGroupAddon>
        </InputGroup>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Block-end alignment for character counts, validation messages, or helper text below the input.'
            }
        }
    }
};

export const WithTextarea: Story = {
    render: () => (
        <InputGroup>
            <InputGroupAddon align="block-start">
                <InputGroupText>Description</InputGroupText>
            </InputGroupAddon>
            <InputGroupTextarea placeholder="Enter a detailed description..." rows={4} />
            <InputGroupAddon align="block-end">
                <InputGroupText>0 / 500</InputGroupText>
            </InputGroupAddon>
        </InputGroup>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Textarea variant with block-aligned addons for multi-line inputs. Ideal for comments, descriptions, or long-form content.'
            }
        }
    }
};

export const ErrorState: Story = {
    render: () => (
        <InputGroup>
            <InputGroupAddon>
                <Link />
            </InputGroupAddon>
            <InputGroupInput
                aria-invalid="true"
                defaultValue="invalid url"
                placeholder="https://example.com"
            />
        </InputGroup>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Error state indicated by aria-invalid attribute. The entire group displays error styling for clear feedback.'
            }
        }
    }
};

export const Disabled: Story = {
    render: () => (
        <div className="flex flex-col gap-4">
            <InputGroup data-disabled="true">
                <InputGroupAddon>
                    <Search />
                </InputGroupAddon>
                <InputGroupInput placeholder="Disabled input" disabled />
            </InputGroup>

            <InputGroup data-disabled="true">
                <InputGroupInput defaultValue="Disabled with value" disabled />
                <InputGroupAddon align="inline-end">
                    <InputGroupButton size="icon-xs" disabled>
                        <Copy />
                    </InputGroupButton>
                </InputGroupAddon>
            </InputGroup>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Disabled state reduces opacity across all group elements. Add data-disabled="true" to the InputGroup for consistent styling.'
            }
        }
    }
};

export const Complex: Story = {
    render: () => (
        <InputGroup>
            <InputGroupAddon align="block-start">
                <InputGroupText>Repository URL</InputGroupText>
            </InputGroupAddon>
            <InputGroupAddon>
                <InputGroupText>https://github.com/</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput defaultValue="TryGhost/Ghost" placeholder="username/repo" />
            <InputGroupAddon align="inline-end">
                <InputGroupButton size="xs">
                    Copy
                    <Copy />
                </InputGroupButton>
            </InputGroupAddon>
        </InputGroup>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Combine multiple addons with different alignments for complex inputs. Mix text, buttons, and labels as needed.'
            }
        }
    }
};
