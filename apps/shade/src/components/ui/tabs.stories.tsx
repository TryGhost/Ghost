import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChevronDown } from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsDropdownTrigger,
  TabsList,
  TabsTrigger,
  TabsTriggerCount,
} from './tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from './dropdown-menu';
import ShadeApp from '@/shade-app';

const meta = {
  title: 'Components / Tabs',
  component: Tabs,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Tabs default to underline with admin7Design on and segmented with it off. Explicit variants keep their own appearance. Button tabs, including Settings previews, share PageMenu’s muted active fill, outlined inactive items, stable active hover, and ghost-button pressed background. KPI tabs retain their chart-card layout.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '24px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  args: {
    defaultValue: 'account',
    children: [
      <TabsList key="list">
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>,

      <TabsContent key="account" value="account">
        Account contents
      </TabsContent>,

      <TabsContent key="password" value="password">
        Password contents
      </TabsContent>,
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Default tabs use underline styling in Admin 7. Turn the design flag off to compare the previous segmented default.',
      },
    },
  },
};

export const StableSelectionWidth: Story = {
  args: {
    defaultValue: 'signup',
    variant: 'button',
    children: [
      <TabsList key="list">
        <TabsTrigger value="signup">Signup options</TabsTrigger>
        <TabsTrigger value="appearance">Look &amp; feel</TabsTrigger>
        <TabsTrigger value="account">Account page</TabsTrigger>
      </TabsList>,

      <TabsContent key="signup" value="signup">
        Signup options
      </TabsContent>,

      <TabsContent key="appearance" value="appearance">
        Appearance options
      </TabsContent>,

      <TabsContent key="account" value="account">
        Account page options
      </TabsContent>,
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Use button tabs for preview navigation, as in Theme, Design, and Portal settings. Selection uses a muted fill and inactive tabs have outlines in Admin 7; widths stay stable when switching.',
      },
    },
  },
};

export const AppLevelPillButtonSmall: Story = {
  render: () => (
    <ShadeApp darkMode={false}>
      <Tabs defaultValue="all" variant="button-sm">
        <TabsList>
          <TabsTrigger value="all">All content</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="sources" disabled>
            Sources
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </ShadeApp>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Button-small tabs share the Admin 7 selected and inactive colors, including hover, focus and disabled states.',
      },
    },
  },
};

export const Segmented: Story = {
  args: {
    defaultValue: 'overview',
    variant: 'segmented',
    children: [
      <TabsList key="list">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
      </TabsList>,

      <TabsContent key="overview" value="overview">
        <div className="p-4">Overview content here</div>
      </TabsContent>,

      <TabsContent key="analytics" value="analytics">
        <div className="p-4">Analytics content here</div>
      </TabsContent>,

      <TabsContent key="reports" value="reports">
        <div className="p-4">Reports content here</div>
      </TabsContent>,
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Use segmented tabs for a control with a shared background and a distinct selected segment.',
      },
    },
  },
};

export const Underline: Story = {
  args: {
    defaultValue: 'home',
    variant: 'underline',
    children: [
      <TabsList key="list">
        <TabsTrigger value="home">
          Home<TabsTriggerCount>12</TabsTriggerCount>
        </TabsTrigger>
        <TabsTrigger value="about">
          About<TabsTriggerCount>4</TabsTriggerCount>
        </TabsTrigger>
        <TabsTrigger value="services">
          Services<TabsTriggerCount>28</TabsTriggerCount>
        </TabsTrigger>
        <TabsTrigger value="contact">
          Contact<TabsTriggerCount>2</TabsTriggerCount>
        </TabsTrigger>
      </TabsList>,

      <TabsContent key="home" value="home">
        <div className="p-4">Home page content</div>
      </TabsContent>,

      <TabsContent key="about" value="about">
        <div className="p-4">About page content</div>
      </TabsContent>,

      <TabsContent key="services" value="services">
        <div className="p-4">Services page content</div>
      </TabsContent>,

      <TabsContent key="contact" value="contact">
        <div className="p-4">Contact page content</div>
      </TabsContent>,
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Use underline tabs to switch sections within a page or panel. In Admin 7, 14px labels have 10px vertical padding, regular inactive text and semibold selected text. Hidden semibold label copies reserve width without duplicating count badges. The 1px indicator overlaps the divider with no vertical scrolling. Flag-off styling is preserved.',
      },
    },
  },
};

export const UnderlineStableSelectionWidth: Story = {
  args: {
    ...StableSelectionWidth.args,
    variant: 'underline',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Switch between long underline labels: the selected text becomes semibold while all tab widths and positions remain fixed in Admin 7.',
      },
    },
  },
};

export const UnderlineRichLabels: Story = {
  render: () => (
    <Tabs defaultValue="order" variant="underline">
      <TabsList>
        <TabsTrigger value="order">
          <span data-testid="rich-tab-label">
            Order <strong>details</strong>
          </span>
        </TabsTrigger>
        <TabsTrigger data-testid="direct-rich-tab-label" value="direct">
          Order <strong>details</strong>
        </TabsTrigger>
        <TabsTrigger value="shipping">Shipping details</TabsTrigger>
      </TabsList>
    </Tabs>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Inline formatting keeps the space between words when underline labels reserve their selected width.',
      },
    },
  },
};

export const CountBackgrounds: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {(['segmented', 'button', 'underline', 'pill'] as const).map((variant) => (
        <div key={variant}>
          <div className="mb-2 text-sm font-semibold capitalize">{variant}</div>
          <Tabs defaultValue="active" variant={variant}>
            <TabsList>
              <TabsTrigger value="active">
                Active
                <TabsTriggerCount>12</TabsTriggerCount>
              </TabsTrigger>
              <TabsTrigger value="inactive">
                Inactive
                <TabsTriggerCount>4</TabsTriggerCount>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Count pills retain a distinct semantic background across common tab variants and selection states.',
      },
    },
  },
};

const MEMBER_METRICS = { free: 'Free members', paid: 'Paid members' } as const;

const DropdownTabs = ({
  orientation,
  variant,
}: {
  orientation?: 'horizontal' | 'vertical';
  variant: 'button' | 'underline';
}) => {
  const [tab, setTab] = useState('visitors');
  const [metric, setMetric] = useState<keyof typeof MEMBER_METRICS>('free');
  return (
    <Tabs orientation={orientation} value={tab} variant={variant} onValueChange={setTab}>
      <TabsList className={orientation === 'vertical' ? 'w-48 flex-col items-stretch' : undefined}>
        <TabsTrigger value="visitors">Visitors</TabsTrigger>
        <DropdownMenu>
          <TabsDropdownTrigger value="members">
            {tab === 'members' ? MEMBER_METRICS[metric] : 'Members'}
            <ChevronDown />
          </TabsDropdownTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuRadioGroup
              value={metric}
              onValueChange={(value) => {
                setMetric(value as keyof typeof MEMBER_METRICS);
                setTab('members');
              }}
            >
              <DropdownMenuRadioItem value="free">Free members</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="paid">Paid members</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <TabsTrigger value="revenue">Revenue</TabsTrigger>
        <DropdownMenu>
          <TabsDropdownTrigger value="sources" disabled>
            Sources
            <ChevronDown />
          </TabsDropdownTrigger>
          <DropdownMenuContent />
        </DropdownMenu>
      </TabsList>
      <TabsContent className="p-4" value="visitors">
        Ranked by visitors
      </TabsContent>
      <TabsContent className="p-4" value="members">
        Ranked by {MEMBER_METRICS[metric].toLowerCase()}
      </TabsContent>
      <TabsContent className="p-4" value="revenue">
        Ranked by revenue
      </TabsContent>
    </Tabs>
  );
};

export const WithDropdown: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <DropdownTabs variant="button" />
      <DropdownTabs variant="underline" />
      <DropdownTabs orientation="vertical" variant="button" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Wrap TabsDropdownTrigger in a DropdownMenu when a tab picks between related views. The tab opens the menu, choosing an item selects the tab, and arrow keys reach it like any other tab. In a vertical list, ArrowDown moves on; Enter or Space opens the menu.',
      },
    },
  },
};
