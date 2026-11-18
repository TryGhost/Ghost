import type { Meta, StoryObj } from '@storybook/react-vite';
import { List, ListItem, ListItemActions, ListItemContent } from './list';
import { Avatar } from './avatar';
import { Button } from './button';

const meta = {
  title: 'Components / List',
  component: List,
  tags: ['autodocs'],
  argTypes: {
    children: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Use List to show items such as posts, members or settings. Rows can include pictures, descriptions, links and buttons. Use Table when people need to compare values across columns.',
      },
    },
  },
} satisfies Meta<typeof List>;

export default meta;
type Story = StoryObj<typeof List>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'A list can mix clickable items and information-only rows. The Delete button works on its own; the rest of that row has no hover background.',
      },
    },
  },
  args: {
    children: (
      <>
        <ListItem>
          <ListItemContent asChild>
            <button className="flex items-center gap-3 py-3 text-left" type="button">
              <Avatar initials="JW" />
              <span>
                <span className="block font-medium">Jamie Wilson</span>
                <span className="block text-sm text-muted-foreground">jamie@example.com</span>
              </span>
            </button>
          </ListItemContent>
          <ListItemActions visibility="hover">
            <Button size="sm" variant="ghost">
              Edit
            </Button>
          </ListItemActions>
        </ListItem>
        <ListItem hover={false}>
          <ListItemContent className="py-3">
            <span className="block font-medium">Delete all content</span>
            <span className="block text-sm text-muted-foreground">
              Permanently delete all posts and tags.
            </span>
          </ListItemContent>
          <ListItemActions>
            <Button size="sm" variant="destructive">
              Delete
            </Button>
          </ListItemActions>
        </ListItem>
      </>
    ),
  },
};
