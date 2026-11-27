import AutomationStatusDialog from './automation-status-dialog';
import type { ComponentProps } from 'react';
import type { MembersCountResult } from '@tryghost/admin-x-framework/api/members';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { mockUseMembersCount } = vi.hoisted(() => ({
  mockUseMembersCount: vi.fn<() => Pick<MembersCountResult, 'count'>>(),
}));

vi.mock('@tryghost/admin-x-framework/api/members', () => ({
  useMembersCount: mockUseMembersCount,
}));

const renderDialog = (props: Partial<ComponentProps<typeof AutomationStatusDialog>>) =>
  render(
    <AutomationStatusDialog
      isError={false}
      isPending={false}
      status="active"
      triggerLabel={{ id: 'label-1', name: 'Spring ebook' }}
      open
      onConfirm={vi.fn()}
      onOpenChange={vi.fn()}
      {...props}
    />,
  );

describe('Label automation publish confirmation', () => {
  it('names the label and omits the exclusion when no members have it', () => {
    mockUseMembersCount.mockReturnValue({ count: 0 });
    renderDialog({});

    const dialog = screen.getByRole('alertdialog', { name: 'Start your automation?' });
    expect(dialog).toHaveTextContent(
      'Once published, your automation goes live. Members who get the Spring ebook label from now on will be enrolled automatically.',
    );
    expect(within(dialog).queryByText(/already labeled/)).not.toBeInTheDocument();
  });

  it.each([
    { count: 1, exclusion: 'The 1 member already labeled Spring ebook will not be enrolled.' },
    {
      count: 1234,
      exclusion: 'The 1,234 members already labeled Spring ebook will not be enrolled.',
    },
    { count: null, exclusion: 'Members already labeled Spring ebook will not be enrolled.' },
  ])('describes label enrollment with count $count', ({ count, exclusion }) => {
    mockUseMembersCount.mockReturnValue({ count });
    renderDialog({});

    const dialog = screen.getByRole('alertdialog', { name: 'Start your automation?' });
    expect(dialog).toHaveTextContent(exclusion);
  });

  it('keeps the generic publish message for other triggers', () => {
    renderDialog({ triggerLabel: undefined });

    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'Once published, your automation goes live. Any member who meets the trigger will be enrolled automatically.',
    );
  });
});
