import type { Meta, StoryObj } from '@storybook/react-vite';
import { X, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Stack } from '@/components/primitives/stack';
import { tokenFieldClasses } from '@/components/ui/token-field';
import { cn } from '@/lib/utils';

const meta: Meta = {
  title: 'Recipes / Token Field',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Shared chip size, input padding and fixed chevron placement for fields containing removable tokens. Used by member labels and editor tags and authors.',
      },
    },
  },
};
export default meta;
type Story = StoryObj;
export const InputHeight: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Empty and single-row token fields stay the same height as a standard input.',
      },
    },
  },
  render: () => (
    <Stack className="w-72" gap="sm">
      <Input aria-label="Standard input" placeholder="Standard input" />
      <div className={tokenFieldClasses.field}>
        <input
          aria-label="Empty token field"
          className={tokenFieldClasses.input}
          placeholder="Search tokens"
        />
      </div>
      <div className={tokenFieldClasses.field}>
        <Badge className={tokenFieldClasses.chip} variant="secondary" asChild>
          <button aria-label="Remove News" type="button">
            News
            <X className="size-3" />
          </button>
        </Badge>
        <input aria-label="Selected token field" className={tokenFieldClasses.input} />
      </div>
    </Stack>
  ),
};
export const Wrapping: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Tokens wrap inside the field while the chevron stays at the top right. Tab to inspect chip and input focus.',
      },
    },
  },
  render: () => (
    <div className={cn(tokenFieldClasses.field, 'w-72 pr-8')}>
      {['Weekly Roundup', 'News', 'Announcements'].map((label) => (
        <Badge key={label} className={tokenFieldClasses.chip} variant="secondary" asChild>
          <button aria-label={`Remove ${label}`} type="button">
            {label}
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <input aria-label="Search tokens" className={tokenFieldClasses.input} />
      <ChevronDown className={tokenFieldClasses.chevron} />
    </div>
  ),
};
