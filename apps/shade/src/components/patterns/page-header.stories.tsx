import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { ArrowUpDown, Calendar, Ellipsis, Plus, Save, Search } from 'lucide-react';
import { PageHeader } from '@/components/patterns/page-header';
import { Filters, type Filter } from '@/components/patterns/filters';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Select, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Stack } from '@/components/primitives';
import ShadeApp from '@/shade-app';
import { formatNumber } from '@/utils';
import { FilterBar } from '@/components/patterns/filter-bar';

const meta = {
  title: 'Patterns / Page Header',
  component: PageHeader,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Page titles and action groups with shared ordering, spacing, control and tooltip conventions. See the attached Design contract for construction rules.',
      },
    },
  },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof PageHeader>;

function MoreActions() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PageHeader.Action label="More actions" iconOnly>
          <Ellipsis />
        </PageHeader.Action>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>Import members</DropdownMenuItem>
        <DropdownMenuItem>Export members</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SearchAction({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = React.useState(initialQuery);
  const [expanded, setExpanded] = React.useState(!!initialQuery);
  const restoreTriggerFocus = React.useRef(false);
  if (!expanded && !query) {
    return (
      <PageHeader.Action
        ref={(button) => {
          if (button && restoreTriggerFocus.current) {
            button.focus();
            restoreTriggerFocus.current = false;
          }
        }}
        label="Search members"
        iconOnly
        onClick={() => setExpanded(true)}
      >
        <Search />
      </PageHeader.Action>
    );
  }
  return (
    <InputGroup className="w-44" variant="secondary">
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput
        aria-label="Search members"
        placeholder="Search members..."
        value={query}
        autoFocus
        onBlur={() => {
          if (!query) {
            setExpanded(false);
          }
        }}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !query) {
            event.preventDefault();
            restoreTriggerFocus.current = true;
            setExpanded(false);
          }
        }}
      />
    </InputGroup>
  );
}

function MembersHeader({
  filtered = false,
  expandedSearch = false,
  mobile = false,
}: {
  filtered?: boolean;
  expandedSearch?: boolean;
  mobile?: boolean;
}) {
  const [filters, setFilters] = React.useState<Filter[]>(
    filtered ? [{ id: 'status', field: 'status', operator: 'is', values: ['paid'] }] : [],
  );
  const filterControls = (
    <Filters
      addButton={<Filters.Trigger />}
      fields={[
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { value: 'paid', label: 'Paid' },
            { value: 'free', label: 'Free' },
          ],
        },
      ]}
      filters={filters}
      keyboardShortcut="f"
      onChange={setFilters}
    />
  );
  return (
    <Stack className="p-6" gap="md">
      <PageHeader blurredBackground={false} sticky={false}>
        <PageHeader.Left>
          <PageHeader.Breadcrumb>Audience</PageHeader.Breadcrumb>
          <PageHeader.Title>
            Members<PageHeader.Count>{formatNumber(12345)}</PageHeader.Count>
            <PageHeader.Description>Readers and subscribers</PageHeader.Description>
          </PageHeader.Title>
        </PageHeader.Left>
        <PageHeader.Actions>
          <PageHeader.ActionGroup mobileMenuBreakpoint={mobile ? 10000 : 640}>
            {filters.length === 0 && filterControls}
            <SearchAction initialQuery={expandedSearch ? 'Jamie' : ''} />
            <MoreActions />
            {mobile && (
              <PageHeader.ActionGroup.MobileMenu>
                <PageHeader.ActionGroup.MobileMenuTrigger>
                  <PageHeader.Action label="More actions" iconOnly>
                    <Ellipsis />
                  </PageHeader.Action>
                </PageHeader.ActionGroup.MobileMenuTrigger>
                <PageHeader.ActionGroup.MobileMenuContent>
                  <DropdownMenuItem>
                    <Search />
                    Search
                  </DropdownMenuItem>
                  <DropdownMenuItem>Filter members</DropdownMenuItem>
                </PageHeader.ActionGroup.MobileMenuContent>
              </PageHeader.ActionGroup.MobileMenu>
            )}
            <PageHeader.ActionGroup.Primary>
              <PageHeader.Action fallbackVariant="default" label="New member">
                <Plus />
                <span className="hidden sm:inline">New member</span>
              </PageHeader.Action>
            </PageHeader.ActionGroup.Primary>
          </PageHeader.ActionGroup>
        </PageHeader.Actions>
      </PageHeader>
      {filters.length > 0 && <FilterBar>{filterControls}</FilterBar>}
    </Stack>
  );
}

export const Structure: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Canonical list header: labelled filters, search, more actions, then the separated primary. Open menus and hover or Tab to inspect their states.',
      },
    },
  },
  render: () => <MembersHeader />,
};
export const Basic: Story = {
  parameters: {
    docs: {
      description: {
        story: 'A simple list can omit optional controls while preserving the same action slots.',
      },
    },
  },
  render: () => (
    <PageHeader>
      <PageHeader.Left>
        <PageHeader.Title>Posts</PageHeader.Title>
      </PageHeader.Left>
      <PageHeader.Actions>
        <PageHeader.ActionGroup>
          <PageHeader.Action label="Sort">
            <ArrowUpDown />
            Newest first
          </PageHeader.Action>
          <PageHeader.ActionGroup.Primary>
            <PageHeader.Action label="New post">
              <Plus />
              New post
            </PageHeader.Action>
          </PageHeader.ActionGroup.Primary>
        </PageHeader.ActionGroup>
      </PageHeader.Actions>
    </PageHeader>
  ),
};
export const Subview: Story = {
  name: 'No primary action',
  parameters: {
    docs: {
      description: {
        story:
          'Analytics needs no invented primary action. Labelled controls retain their usage order.',
      },
    },
  },
  render: () => (
    <PageHeader>
      <PageHeader.Left>
        <PageHeader.Title>Analytics</PageHeader.Title>
      </PageHeader.Left>
      <PageHeader.Actions>
        <PageHeader.ActionGroup>
          <Select defaultValue="30">
            <PageHeader.SelectTrigger label="Date range">
              <Calendar />
              <SelectValue />
            </PageHeader.SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </PageHeader.ActionGroup>
      </PageHeader.Actions>
    </PageHeader>
  ),
};
export const FilteredList: Story = {
  name: 'Active filters',
  parameters: {
    docs: {
      description: {
        story:
          'Active filters move to a separate row; the remaining header utilities keep their order.',
      },
    },
  },
  render: () => <MembersHeader filtered />,
};
export const ExpandedSearch: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Search expands in place, focuses the input, and keeps a nonempty query visible.',
      },
    },
  },
  render: () => <MembersHeader expandedSearch />,
};
export const MobileMenu: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Secondary actions can collapse into an explicit mobile menu. Keep the primary accessible when its visible label is hidden.',
      },
    },
  },
  render: () => <MembersHeader mobile />,
};
export const DetailPage: Story = {
  name: 'Detail page',
  parameters: {
    docs: {
      description: {
        story: 'Detail headers use the same controls with a breadcrumb and a single save action.',
      },
    },
  },
  render: () => (
    <PageHeader>
      <PageHeader.Left>
        <PageHeader.Breadcrumb>Members</PageHeader.Breadcrumb>
        <PageHeader.Title>Jamie Larson</PageHeader.Title>
      </PageHeader.Left>
      <PageHeader.Actions>
        <PageHeader.ActionGroup>
          <MoreActions />
          <PageHeader.ActionGroup.Primary>
            <PageHeader.Action label="Save">
              <Save />
              Save
            </PageHeader.Action>
          </PageHeader.ActionGroup.Primary>
        </PageHeader.ActionGroup>
      </PageHeader.Actions>
    </PageHeader>
  ),
};
export const DisabledActions: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Disabled controls retain their geometry and stay unavailable to pointer and keyboard activation.',
      },
    },
  },
  render: () => (
    <PageHeader.ActionGroup>
      <PageHeader.Action label="Filter" disabled>
        <ArrowUpDown />
        Filter
      </PageHeader.Action>
      <PageHeader.Action label="Search" disabled iconOnly>
        <Search />
      </PageHeader.Action>
      <PageHeader.ActionGroup.Primary>
        <PageHeader.Action label="New member" disabled>
          <Plus />
          New member
        </PageHeader.Action>
      </PageHeader.ActionGroup.Primary>
    </PageHeader.ActionGroup>
  ),
};
export const Admin7Disabled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The provider with Admin 7 disabled preserves the old control appearance and disables new header tooltips. Existing pages retain their historical action order locally.',
      },
    },
  },
  render: () => (
    <ShadeApp admin7={{ pill: false }} darkMode={false}>
      <PageHeader.ActionGroup>
        <PageHeader.Action label="Sort">
          <ArrowUpDown />
          Newest first
        </PageHeader.Action>
        <PageHeader.ActionGroup.Primary>
          <PageHeader.Action fallbackVariant="default" label="New post">
            <Plus />
            New post
          </PageHeader.Action>
        </PageHeader.ActionGroup.Primary>
      </PageHeader.ActionGroup>
    </ShadeApp>
  ),
};
