import FeedItem from '../../../src/components/feed/feed-item';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ActorProperties } from '@tryghost/admin-x-framework/api/activitypub';
import type { ObjectWithReplyContext, ReplyContext } from '../../../src/utils/reply-context';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

const mutation = { mutate: vi.fn() };

vi.mock('@hooks/use-activity-pub-queries', () => ({
  useDeleteMutationForUser: () => mutation,
  useFollowMutationForUser: () => mutation,
  useUnfollowMutationForUser: () => mutation,
  usePreferencesForUser: () => ({ data: undefined }),
}));

vi.mock('@src/hooks/use-navigate-with-base-path', () => ({
  useNavigateWithBasePath: () => mocks.navigate,
}));

vi.mock('@src/hooks/use-sensitive-media-disclosure', () => ({
  useSensitiveMediaDisclosure: () => ({
    contentWarning: null,
    shouldHideContentWarning: false,
    shouldHideSensitiveMedia: false,
    canHideSensitiveMedia: false,
    isContentWarningRevealed: true,
    showContentWarningOverlay: false,
    contentWarningMinHeight: undefined,
    contentWarningWrapperRef: { current: null },
    revealSensitiveMedia: vi.fn(),
    hideSensitiveMedia: vi.fn(),
    revealContentWarning: vi.fn(),
  }),
}));

vi.mock('../../../src/components/feed/feed-item-menu', () => ({ default: () => null }));
vi.mock('../../../src/components/feed/feed-item-stats', () => ({ default: () => null }));
vi.mock('../../../src/components/global/ap-avatar', () => ({ default: () => null }));
vi.mock('../../../src/components/global/image-lightbox', () => ({
  default: () => null,
  useLightboxImages: () => ({
    lightboxState: { images: [], currentIndex: 0, isOpen: false },
    openLightbox: vi.fn(),
    closeLightbox: vi.fn(),
    navigateToIndex: vi.fn(),
  }),
}));
vi.mock('../../../src/components/global/profile-preview-hover-card', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function makeActor(overrides: Partial<ActorProperties> & { handle: string }): ActorProperties {
  return {
    id: `https://fake.host/users/${overrides.handle}`,
    name: 'Alice',
    preferredUsername: 'alice',
    ...overrides,
  } as ActorProperties;
}

const alice = makeActor({ name: 'Alice', handle: '@alice@fake.host' });
const reposter = makeActor({ name: 'Rita', handle: '@rita@fake.host' });

function makeObject(inReplyTo?: ReplyContext | null): ObjectWithReplyContext {
  return {
    '@context': '',
    id: 'https://fake.host/notes/1',
    type: 'Note',
    name: '',
    content: '<p>Hello world</p>',
    summary: null,
    attributedTo: alice,
    replyCount: 0,
    likeCount: 0,
    repostCount: 0,
    authored: false,
    inReplyTo,
  };
}

const bobParent: ReplyContext = {
  id: 'https://other.example/notes/parent',
  author: { name: 'Bob', handle: '@bob@other.example', url: 'https://other.example/users/bob' },
};

function renderItem(
  props: Partial<React.ComponentProps<typeof FeedItem>> & { object: ObjectWithReplyContext },
) {
  const onClick = vi.fn();
  render(<FeedItem actor={alice} layout="feed" type="Create" onClick={onClick} {...props} />);
  return { onClick };
}

describe('FeedItem reply context banner', () => {
  beforeEach(() => {
    mocks.navigate.mockClear();
  });
  afterEach(cleanup);

  it('shows no banner when the post is not a reply', () => {
    renderItem({ object: makeObject(null) });
    expect(screen.queryByTestId('reply-context-banner')).toBeNull();

    cleanup();
    renderItem({ object: makeObject(undefined) });
    expect(screen.queryByTestId('reply-context-banner')).toBeNull();
  });

  it('names the parent author when they differ from the note author', () => {
    renderItem({ object: makeObject(bobParent) });

    const banner = screen.getByTestId('reply-context-banner');
    expect(banner.textContent).toContain('Replying to');
    expect(screen.getByTestId('reply-context-profile-link').textContent).toContain('Bob');
  });

  it('falls back to the parent handle when the name is empty', () => {
    renderItem({
      object: makeObject({ ...bobParent, author: { ...bobParent.author!, name: '' } }),
    });

    expect(screen.getByTestId('reply-context-profile-link').textContent).toContain(
      '@bob@other.example',
    );
  });

  it('shows "Continuing a thread" without a profile link for self-replies', () => {
    renderItem({
      object: makeObject({
        id: 'https://fake.host/notes/0',
        author: { name: 'Alice', handle: '@alice@fake.host', url: 'https://fake.host/users/alice' },
      }),
    });

    expect(screen.getByTestId('reply-context-banner').textContent).toContain('Continuing a thread');
    expect(screen.queryByTestId('reply-context-profile-link')).toBeNull();
  });

  it('shows "Replying to a post" without a profile link when the author is unknown', () => {
    renderItem({ object: makeObject({ id: 'https://other.example/notes/parent', author: null }) });

    expect(screen.getByTestId('reply-context-banner').textContent).toContain('Replying to a post');
    expect(screen.queryByTestId('reply-context-profile-link')).toBeNull();
  });

  it('opens the parent author profile without opening the note', () => {
    const { onClick } = renderItem({ object: makeObject(bobParent) });

    const link = screen.getByTestId('reply-context-profile-link');
    expect(link.tagName).toBe('BUTTON');
    fireEvent.click(link);

    expect(mocks.navigate).toHaveBeenCalledWith('/profile/@bob@other.example');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('is a focusable button so keyboard users can activate the profile link', () => {
    const { onClick } = renderItem({ object: makeObject(bobParent) });

    const link = screen.getByTestId('reply-context-profile-link');
    expect(link.tagName).toBe('BUTTON');
    expect((link as HTMLButtonElement).type).toBe('button');

    link.focus();
    expect(document.activeElement).toBe(link);

    fireEvent.click(link);

    expect(mocks.navigate).toHaveBeenCalledWith('/profile/@bob@other.example');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('stacks the repost banner above the reply banner for reposted replies', () => {
    renderItem({
      actor: reposter,
      type: 'Announce',
      object: makeObject(bobParent),
    });

    const repost = screen.getByText('reposted').closest('div')!.parentElement!;
    const reply = screen.getByTestId('reply-context-banner');

    expect(repost.textContent).toContain('Ritareposted');
    expect(reply.textContent).toContain('Replying to');
    expect(repost.compareDocumentPosition(reply) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('compares the parent to the note author, not the reposter, for reposted replies', () => {
    renderItem({
      actor: reposter,
      type: 'Announce',
      object: makeObject({
        id: 'https://fake.host/notes/0',
        author: { name: 'Alice', handle: '@alice@fake.host', url: 'https://fake.host/users/alice' },
      }),
    });

    expect(screen.getByTestId('reply-context-banner').textContent).toContain('Continuing a thread');
  });

  it('does not render the banner in the reply layout', () => {
    renderItem({ layout: 'reply', object: makeObject(bobParent) });

    expect(screen.queryByTestId('reply-context-banner')).toBeNull();
  });
});
