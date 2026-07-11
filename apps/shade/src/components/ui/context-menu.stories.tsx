import type {Meta, StoryObj} from '@storybook/react-vite';
import {Archive, Copy, Pencil, Share, Trash} from 'lucide-react';
import {ContextMenu, ContextMenuCheckboxItem, ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuLabel, ContextMenuPortal, ContextMenuRadioGroup, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger} from './context-menu';

const meta = {
    title: 'Components / Context menu',
    component: ContextMenu,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Right-click menu for object-specific actions. Use when commands are secondary to the main surface and need pointer or long-press access.'
            }
        }
    }
} satisfies Meta<typeof ContextMenu>;

export default meta;
type Story = StoryObj<typeof ContextMenu>;

const TriggerBox = () => (
    <ContextMenuTrigger className="flex h-40 w-80 max-w-full items-center justify-center rounded-md border border-dashed border-border-default bg-surface-panel text-sm text-muted-foreground">
        Right click or long press
    </ContextMenuTrigger>
);

export const Default: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Includes groups, separators, submenus, disabled items, checkbox and radio states, destructive styling, icons, and keyboard shortcuts.'
            }
        }
    },
    args: {
        children: [
            <TriggerBox key="trigger" />,
            <ContextMenuContent key="content" className="w-56">
                <ContextMenuLabel>Post actions</ContextMenuLabel>
                <ContextMenuSeparator />
                <ContextMenuGroup>
                    <ContextMenuItem>
                        <Pencil />
                        Edit
                        <ContextMenuShortcut>E</ContextMenuShortcut>
                    </ContextMenuItem>
                    <ContextMenuItem>
                        <Copy />
                        Duplicate
                        <ContextMenuShortcut>D</ContextMenuShortcut>
                    </ContextMenuItem>
                    <ContextMenuItem>
                        <Share />
                        Share
                    </ContextMenuItem>
                </ContextMenuGroup>
                <ContextMenuSeparator />
                <ContextMenuGroup>
                    <ContextMenuCheckboxItem checked>Show in list</ContextMenuCheckboxItem>
                    <ContextMenuCheckboxItem>Pin to top</ContextMenuCheckboxItem>
                </ContextMenuGroup>
                <ContextMenuSeparator />
                <ContextMenuSub>
                    <ContextMenuSubTrigger>
                        <Archive />
                        Move to
                    </ContextMenuSubTrigger>
                    <ContextMenuPortal>
                        <ContextMenuSubContent className="w-44">
                            <ContextMenuRadioGroup value="drafts">
                                <ContextMenuRadioItem value="drafts">Drafts</ContextMenuRadioItem>
                                <ContextMenuRadioItem value="archive">Archive</ContextMenuRadioItem>
                            </ContextMenuRadioGroup>
                        </ContextMenuSubContent>
                    </ContextMenuPortal>
                </ContextMenuSub>
                <ContextMenuItem disabled>Locked action</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem variant="destructive">
                    <Trash />
                    Delete
                </ContextMenuItem>
            </ContextMenuContent>
        ]
    }
};
