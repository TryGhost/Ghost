import Recommendations from '../../../src/components/layout/sidebar/recommendations';
import { SuggestedProfile } from '../../../src/components/global/suggested-profiles';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('@components/global/profile-preview-hover-card', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@components/global/ap-avatar', () => ({
  default: () => <span aria-hidden="true">Avatar</span>,
}));

vi.mock('@components/global/follow-button', () => ({
  default: () => <button type="button">Follow</button>,
}));

vi.mock('@hooks/use-activity-pub-queries', () => ({
  useSuggestedProfilesForUser: () => ({
    suggestedProfilesQuery: { data: [], isLoading: true },
  }),
}));

vi.mock('@src/hooks/use-navigate-with-base-path', () => ({
  useNavigateWithBasePath: () => vi.fn(),
}));

vi.mock('@tryghost/admin-x-framework', () => ({
  useNavigationStack: () => ({ resetStack: vi.fn() }),
}));

afterEach(cleanup);

describe('loading profile suggestions', () => {
  it('does not expose a primary profile action while a suggestion is loading', () => {
    render(
      <SuggestedProfile
        profile={{
          id: '',
          apId: '',
          name: '',
          handle: '',
          url: '',
          avatarUrl: '',
          bannerImageUrl: null,
          bio: '',
          customFields: {},
          postCount: 0,
          likedCount: 0,
          followerCount: 0,
          followingCount: 0,
          followsMe: false,
          followedByMe: false,
          blockedByMe: false,
          domainBlockedByMe: false,
          attachment: [],
        }}
        update={vi.fn()}
        isLoading
      />,
    );

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('keeps only the existing Find more action while sidebar suggestions load', () => {
    render(<Recommendations />);

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Find more/ })).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
