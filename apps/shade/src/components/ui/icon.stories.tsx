import Icon, {IconName} from '@/components/ui/icon';
import type {Meta, StoryObj} from '@storybook/react';
import {useState} from 'react';

const meta = {
    title: 'Components / Icons',
    component: Icon.Close,
    tags: ['autodocs'],
    argTypes: {
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg', 'xl'],
            defaultValue: 'md'
        }
    }
} satisfies Meta<typeof Icon.Close>;

export default meta;
type Story = StoryObj<typeof Icon.Close>;

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
