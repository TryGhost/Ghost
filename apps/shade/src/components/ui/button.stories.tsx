import type {Meta, StoryObj} from '@storybook/react-vite';
import {Button} from './button';
import {ArrowUp, Smile} from 'lucide-react';

const meta = {
    title: 'Components / Button',
    component: Button,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Reusable button for interactive actions across the UI. Supports multiple visual variants and sizes to match hierarchy and context.'
            }
        }
    }
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof Button>;

// Overview
export const Primary: Story = {
    name: 'Default',
    args: {
        children: 'Primary button'
    },
    parameters: {
        docs: {
            description: {
                story: 'Main use case: call-to-action button with default styling.'
            }
        }
    }
};

// Variants
export const Destructive: Story = {
    args: {
        variant: 'destructive',
        children: 'Delete item'
    },
    parameters: {
        docs: {
            description: {
                story: 'Use for dangerous or irreversible actions (e.g., delete, remove, reset).'
            }
        }
    }
};

export const Outline: Story = {
    args: {
        variant: 'outline',
        children: 'Secondary action'
    },
    parameters: {
        docs: {
            description: {
                story: 'Use for secondary actions that still need moderate emphasis.'
            }
        }
    }
};

export const Secondary: Story = {
    args: {
        variant: 'secondary',
        children: 'Secondary'
    },
    parameters: {
        docs: {
            description: {
                story: 'Use for alternative actions when a primary button is present.'
            }
        }
    }
};

export const Ghost: Story = {
    args: {
        variant: 'ghost',
        children: 'Ghost'
    },
    parameters: {
        docs: {
            description: {
                story: 'Use for low-emphasis actions, especially in dense layouts.'
            }
        }
    }
};

export const LinkVariant: Story = {
    name: 'Link style',
    args: {
        variant: 'link',
        children: 'Learn more'
    },
    parameters: {
        docs: {
            description: {
                story: 'Use when an action should blend in with text and behave like a navigational link.'
            }
        }
    }
};

export const DropdownVariant: Story = {
    name: 'Dropdown style',
    args: {
        variant: 'dropdown',
        children: 'Menu'
    },
    parameters: {
        docs: {
            description: {
                story: 'Use to trigger menus or option lists; pairs with a chevron to indicate more options.'
            }
        }
    }
};

// Sizes
export const Small: Story = {
    args: {
        size: 'sm',
        children: 'Small button'
    },
    parameters: {
        docs: {
            description: {
                story: 'Use in compact UIs, tables, or where space is limited.'
            }
        }
    }
};

export const Large: Story = {
    args: {
        size: 'lg',
        children: 'Large button'
    },
    parameters: {
        docs: {
            description: {
                story: 'Use when prominence and larger hit targets are needed.'
            }
        }
    }
};

export const IconOnly: Story = {
    args: {
        size: 'icon',
        'aria-label': 'Move up',
        children: <ArrowUp />
    },
    parameters: {
        docs: {
            description: {
                story: 'Use when an icon sufficiently conveys meaning and space is constrained. Always provide an accessible `aria-label`.'
            }
        }
    }
};

export const WithIcon: Story = {
    args: {
        children: (
            <>
                <Smile />
                Continue
            </>
        )
    },
    parameters: {
        docs: {
            description: {
                story: 'Use to add visual affordance to actions. Keep icons before the text and ensure the label remains clear.'
            }
        }
    }
};

// States
export const Disabled: Story = {
    args: {
        disabled: true,
        children: 'Disabled'
    },
    parameters: {
        docs: {
            description: {
                story: 'Use to indicate an action is unavailable. Prefer explaining why rather than relying solely on the disabled state.'
            }
        }
    }
};
