import type {Meta, StoryObj} from '@storybook/react-vite';
import React from 'react';
import {
    Command,
    CommandCheck,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut
} from './command';
import {
    Calculator,
    Calendar,
    CreditCard,
    Mail,
    MessageSquare,
    PlusCircle,
    Settings,
    Smile,
    User,
    UserPlus
} from 'lucide-react';

const meta = {
    title: 'Components/Command',
    component: Command,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered'
    }
} satisfies Meta<typeof Command>;

export default meta;
type Story = StoryObj<typeof Command>;

export const Default: Story = {
    render: () => (
        <Command className="w-[450px] rounded-lg border shadow-md">
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Suggestions">
                    <CommandItem>
                        <Calendar className="mr-2 size-4" />
                        <span>Calendar</span>
                    </CommandItem>
                    <CommandItem>
                        <Smile className="mr-2 size-4" />
                        <span>Search Emoji</span>
                    </CommandItem>
                    <CommandItem>
                        <Calculator className="mr-2 size-4" />
                        <span>Calculator</span>
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Settings">
                    <CommandItem>
                        <User className="mr-2 size-4" />
                        <span>Profile</span>
                        <CommandShortcut>⌘P</CommandShortcut>
                    </CommandItem>
                    <CommandItem>
                        <CreditCard className="mr-2 size-4" />
                        <span>Billing</span>
                        <CommandShortcut>⌘B</CommandShortcut>
                    </CommandItem>
                    <CommandItem>
                        <Settings className="mr-2 size-4" />
                        <span>Settings</span>
                        <CommandShortcut>⌘S</CommandShortcut>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </Command>
    )
};

export const WithGroups: Story = {
    render: () => (
        <Command className="w-[450px] rounded-lg border shadow-md">
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Suggestions">
                    <CommandItem>
                        <Calendar className="mr-2 size-4" />
                        <span>Calendar</span>
                    </CommandItem>
                    <CommandItem>
                        <Smile className="mr-2 size-4" />
                        <span>Search Emoji</span>
                    </CommandItem>
                    <CommandItem>
                        <Calculator className="mr-2 size-4" />
                        <span>Calculator</span>
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Messages">
                    <CommandItem>
                        <Mail className="mr-2 size-4" />
                        <span>Email</span>
                    </CommandItem>
                    <CommandItem>
                        <MessageSquare className="mr-2 size-4" />
                        <span>Message</span>
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Settings">
                    <CommandItem>
                        <User className="mr-2 size-4" />
                        <span>Profile</span>
                        <CommandShortcut>⌘P</CommandShortcut>
                    </CommandItem>
                    <CommandItem>
                        <CreditCard className="mr-2 size-4" />
                        <span>Billing</span>
                        <CommandShortcut>⌘B</CommandShortcut>
                    </CommandItem>
                    <CommandItem>
                        <Settings className="mr-2 size-4" />
                        <span>Settings</span>
                        <CommandShortcut>⌘S</CommandShortcut>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </Command>
    )
};

export const WithShortcuts: Story = {
    render: () => (
        <Command className="w-[450px] rounded-lg border shadow-md">
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Actions">
                    <CommandItem>
                        <PlusCircle className="mr-2 size-4" />
                        <span>New File</span>
                        <CommandShortcut>⌘N</CommandShortcut>
                    </CommandItem>
                    <CommandItem>
                        <User className="mr-2 size-4" />
                        <span>Profile</span>
                        <CommandShortcut>⌘P</CommandShortcut>
                    </CommandItem>
                    <CommandItem>
                        <CreditCard className="mr-2 size-4" />
                        <span>Billing</span>
                        <CommandShortcut>⌘B</CommandShortcut>
                    </CommandItem>
                    <CommandItem>
                        <Settings className="mr-2 size-4" />
                        <span>Settings</span>
                        <CommandShortcut>⌘S</CommandShortcut>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </Command>
    )
};

export const WithCheckmarks: Story = {
    render: () => {
        const [selectedItems, setSelectedItems] = React.useState<string[]>(['calendar']);

        const toggleItem = (value: string) => {
            setSelectedItems(prev => (prev.includes(value)
                ? prev.filter(item => item !== value)
                : [...prev, value])
            );
        };

        return (
            <Command className="w-[450px] rounded-lg border shadow-md">
                <CommandInput placeholder="Select items..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup heading="Features">
                        <CommandItem onSelect={() => toggleItem('calendar')}>
                            <Calendar className="mr-2 size-4" />
                            <span>Calendar</span>
                            {selectedItems.includes('calendar') && <CommandCheck />}
                        </CommandItem>
                        <CommandItem onSelect={() => toggleItem('emoji')}>
                            <Smile className="mr-2 size-4" />
                            <span>Search Emoji</span>
                            {selectedItems.includes('emoji') && <CommandCheck />}
                        </CommandItem>
                        <CommandItem onSelect={() => toggleItem('calculator')}>
                            <Calculator className="mr-2 size-4" />
                            <span>Calculator</span>
                            {selectedItems.includes('calculator') && <CommandCheck />}
                        </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Communication">
                        <CommandItem onSelect={() => toggleItem('mail')}>
                            <Mail className="mr-2 size-4" />
                            <span>Email</span>
                            {selectedItems.includes('mail') && <CommandCheck />}
                        </CommandItem>
                        <CommandItem onSelect={() => toggleItem('message')}>
                            <MessageSquare className="mr-2 size-4" />
                            <span>Message</span>
                            {selectedItems.includes('message') && <CommandCheck />}
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </Command>
        );
    }
};

export const AsDialog: Story = {
    render: () => {
        const [open, setOpen] = React.useState(false);

        React.useEffect(() => {
            const down = (e: KeyboardEvent) => {
                if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    setOpen(prev => !prev);
                }
            };

            document.addEventListener('keydown', down);
            return () => document.removeEventListener('keydown', down);
        }, []);

        return (
            <>
                <p className="text-sm text-muted-foreground">
                    Press{' '}
                    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                        <span className="text-xs">⌘</span>K
                    </kbd>
                    {' '}or{' '}
                    <button
                        className="text-primary hover:underline"
                        type='button'
                        onClick={() => setOpen(true)}
                    >
                        click here
                    </button>
                </p>
                <CommandDialog open={open} onOpenChange={setOpen}>
                    <CommandInput placeholder="Type a command or search..." />
                    <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup heading="Suggestions">
                            <CommandItem>
                                <Calendar className="mr-2 size-4" />
                                <span>Calendar</span>
                            </CommandItem>
                            <CommandItem>
                                <Smile className="mr-2 size-4" />
                                <span>Search Emoji</span>
                            </CommandItem>
                            <CommandItem>
                                <Calculator className="mr-2 size-4" />
                                <span>Calculator</span>
                            </CommandItem>
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup heading="Settings">
                            <CommandItem>
                                <User className="mr-2 size-4" />
                                <span>Profile</span>
                                <CommandShortcut>⌘P</CommandShortcut>
                            </CommandItem>
                            <CommandItem>
                                <CreditCard className="mr-2 size-4" />
                                <span>Billing</span>
                                <CommandShortcut>⌘B</CommandShortcut>
                            </CommandItem>
                            <CommandItem>
                                <Settings className="mr-2 size-4" />
                                <span>Settings</span>
                                <CommandShortcut>⌘S</CommandShortcut>
                            </CommandItem>
                        </CommandGroup>
                    </CommandList>
                </CommandDialog>
            </>
        );
    }
};

export const Searchable: Story = {
    render: () => {
        const items = [
            {icon: Calendar, label: 'Calendar', group: 'Tools'},
            {icon: Smile, label: 'Search Emoji', group: 'Tools'},
            {icon: Calculator, label: 'Calculator', group: 'Tools'},
            {icon: Mail, label: 'Email', group: 'Communication'},
            {icon: MessageSquare, label: 'Message', group: 'Communication'},
            {icon: User, label: 'Profile', group: 'Settings', shortcut: '⌘P'},
            {icon: CreditCard, label: 'Billing', group: 'Settings', shortcut: '⌘B'},
            {icon: Settings, label: 'Settings', group: 'Settings', shortcut: '⌘S'},
            {icon: UserPlus, label: 'Invite User', group: 'Actions', shortcut: '⌘I'}
        ];

        const groups = Array.from(new Set(items.map(item => item.group)));

        return (
            <Command className="w-[450px] rounded-lg border shadow-md">
                <CommandInput placeholder="Search all commands..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    {groups.map(group => (
                        <React.Fragment key={group}>
                            <CommandGroup heading={group}>
                                {items
                                    .filter(item => item.group === group)
                                    .map(item => (
                                        <CommandItem key={item.label}>
                                            <item.icon className="mr-2 size-4" />
                                            <span>{item.label}</span>
                                            {item.shortcut && (
                                                <CommandShortcut>{item.shortcut}</CommandShortcut>
                                            )}
                                        </CommandItem>
                                    ))}
                            </CommandGroup>
                            {group !== groups[groups.length - 1] && <CommandSeparator />}
                        </React.Fragment>
                    ))}
                </CommandList>
            </Command>
        );
    }
};

export const WithDisabledItems: Story = {
    render: () => (
        <Command className="w-[450px] rounded-lg border shadow-md">
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Actions">
                    <CommandItem>
                        <Calendar className="mr-2 size-4" />
                        <span>Calendar</span>
                    </CommandItem>
                    <CommandItem disabled>
                        <Smile className="mr-2 size-4" />
                        <span>Search Emoji (Disabled)</span>
                    </CommandItem>
                    <CommandItem>
                        <Calculator className="mr-2 size-4" />
                        <span>Calculator</span>
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Settings">
                    <CommandItem>
                        <User className="mr-2 size-4" />
                        <span>Profile</span>
                        <CommandShortcut>⌘P</CommandShortcut>
                    </CommandItem>
                    <CommandItem disabled>
                        <CreditCard className="mr-2 size-4" />
                        <span>Billing (Coming Soon)</span>
                        <CommandShortcut>⌘B</CommandShortcut>
                    </CommandItem>
                    <CommandItem>
                        <Settings className="mr-2 size-4" />
                        <span>Settings</span>
                        <CommandShortcut>⌘S</CommandShortcut>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </Command>
    )
};

export const Minimal: Story = {
    render: () => (
        <Command className="w-[450px] rounded-lg border shadow-md">
            <CommandInput placeholder="Search..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                    <CommandItem>Apple</CommandItem>
                    <CommandItem>Banana</CommandItem>
                    <CommandItem>Cherry</CommandItem>
                    <CommandItem>Date</CommandItem>
                    <CommandItem>Elderberry</CommandItem>
                </CommandGroup>
            </CommandList>
        </Command>
    )
};

export const LongList: Story = {
    render: () => {
        const fruits = [
            'Apple', 'Apricot', 'Avocado', 'Banana', 'Blackberry', 'Blueberry',
            'Cherry', 'Coconut', 'Cranberry', 'Date', 'Dragonfruit', 'Elderberry',
            'Fig', 'Grape', 'Grapefruit', 'Guava', 'Kiwi', 'Lemon', 'Lime',
            'Mango', 'Melon', 'Orange', 'Papaya', 'Peach', 'Pear', 'Pineapple',
            'Plum', 'Pomegranate', 'Raspberry', 'Strawberry', 'Tangerine', 'Watermelon'
        ];

        return (
            <Command className="w-[450px] rounded-lg border shadow-md">
                <CommandInput placeholder="Search fruits..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup heading="Fruits">
                        {fruits.map(fruit => (
                            <CommandItem key={fruit}>
                                <Smile className="mr-2 size-4" />
                                <span>{fruit}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </Command>
        );
    }
};

export const CustomStyling: Story = {
    render: () => (
        <Command className="w-[500px] rounded-xl border-2 border-primary bg-gradient-to-b from-background to-secondary/20 shadow-xl">
            <CommandInput
                className="text-base"
                placeholder="Type a command or search..."
            />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Favorites">
                    <CommandItem className="py-3">
                        <Calendar className="mr-3 size-5" />
                        <span className="font-medium">Calendar</span>
                        <CommandShortcut className="rounded bg-primary/10 px-2 py-1 text-xs">
                            ⌘C
                        </CommandShortcut>
                    </CommandItem>
                    <CommandItem className="py-3">
                        <Settings className="mr-3 size-5" />
                        <span className="font-medium">Settings</span>
                        <CommandShortcut className="rounded bg-primary/10 px-2 py-1 text-xs">
                            ⌘S
                        </CommandShortcut>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </Command>
    )
};
