import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tabs, TabsContent, TabsList, TabsTrigger, TabsTriggerCount } from './tabs';
import ShadeApp from '@/shade-app';

const meta = {
  title: 'Components / Tabs',
  component: Tabs,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Tabs default to underline with admin7Design on and segmented with it off. Explicit variants keep their own appearance. Button tabs use primary selected fills in Admin 7; KPI tabs retain their chart-card layout.',
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
        story: 'Button tabs keep the same font weight and width when the active tab changes.',
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
          'Use underline tabs to switch sections within a page or panel. In Admin 7, the 1px indicator overlaps the divider and the row scrolls horizontally without vertical overflow. With the flag off, the previous underline styling is preserved.',
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
