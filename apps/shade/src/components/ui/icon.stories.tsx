import Icon, {IconName} from '@/components/ui/icon';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';

const meta = {
    title: 'Components / Custom icons',
    component: Icon.Typography,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component:
                    'Custom SVG icons auto-generated from `src/assets/icons`. Import via `Icon.<Name>` and adjust with `size` and `className`.'
            }
        }
    },
    argTypes: {
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg', 'xl'],
            defaultValue: 'md'
        }
    }
} satisfies Meta<typeof Icon.Typography>;

export default meta;
type Story = StoryObj<typeof Icon.Typography>;

export const IconGallery = {
    render: (args: Story['args']) => {
        const icons = Object.keys(Icon) as IconName[];
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [copiedIcon, setCopiedIcon] = useState<string | null>(null);

        const copyToClipboard = (iconName: string) => {
            const componentString = `<Icon.${iconName}${args?.size ? ` size="${args.size}"` : ''} />`;
            navigator.clipboard.writeText(componentString);
            setCopiedIcon(iconName);
            setTimeout(() => setCopiedIcon(null), 2000);
        };

        return (
            <div className='sb-icon-grid'>
                {icons.map((iconName) => {
                    const IconComponent = Icon[iconName];
                    return (
                        <div
                            key={iconName}
                            className='sb-icon'
                            title='Click to copy component code'
                            onClick={() => copyToClipboard(iconName)}>
                            <IconComponent {...args} />
                            <span className="mt-2 text-sm">{copiedIcon === iconName ? 'Copied!' : iconName}</span>
                        </div>
                    );
                })}
            </div>
        );
    }
};

export const Sizes: Story = {
    render: () => (
        <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-1">
                <Icon.Typography size="sm" />
                <span className="text-xs text-muted-foreground">sm</span>
            </div>
            <div className="flex flex-col items-center gap-1">
                <Icon.Typography size="md" />
                <span className="text-xs text-muted-foreground">md</span>
            </div>
            <div className="flex flex-col items-center gap-1">
                <Icon.Typography size="lg" />
                <span className="text-xs text-muted-foreground">lg</span>
            </div>
            <div className="flex flex-col items-center gap-1">
                <Icon.Typography size="xl" />
                <span className="text-xs text-muted-foreground">xl</span>
            </div>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Choose from `sm`, `md`, `lg`, `xl` sizes or override via Tailwind classes.'
            }
        }
    }
};

export const ColorsAndClasses: Story = {
    render: () => (
        <div className="flex items-center gap-6">
            <Icon.Typography className="text-foreground" />
            <Icon.Typography className="text-muted-foreground" />
            <Icon.Typography className="text-emerald-500" />
            <Icon.Typography className="text-rose-500" />
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Style with `className` to change color via Tailwind (e.g., `text-muted-foreground`, `text-emerald-500`).'
            }
        }
    }
};
