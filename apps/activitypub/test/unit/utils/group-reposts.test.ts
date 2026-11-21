import { GroupedActivity, groupReposts } from '../../../src/utils/group-reposts';
import { Post, PostType } from '../../../src/api/activitypub';
import { describe, expect, test } from 'vitest';
import { mapPostToActivity } from '../../../src/utils/posts';

function account(name: string, handle = `@${name.toLowerCase()}@example.com`): Post['author'] {
  return {
    id: `https://example.com/users/${name}`,
    handle,
    avatarUrl: '',
    name,
    url: `https://example.com/users/${name}`,
    followedByMe: false,
  };
}

const author = account('Author');
const ana = account('Ana');
const ben = account('Ben');
const cleo = account('Cleo');

function activity(id: string, repostedBy: Post['repostedBy'] = null) {
  const post: Post = {
    id,
    type: PostType.Note,
    title: '',
    excerpt: '',
    summary: null,
    sensitive: false,
    contentWarning: null,
    content: `Post ${id}`,
    url: `https://example.com/posts/${id}`,
    featureImageUrl: null,
    publishedAt: '2024-01-01T00:00:00Z',
    likeCount: 0,
    likedByMe: false,
    replyCount: 0,
    readingTimeMinutes: 1,
    attachments: [],
    author,
    authoredByMe: false,
    repostCount: 0,
    repostedByMe: false,
    repostedBy,
  };

  return mapPostToActivity(post);
}

function summarize(activities: GroupedActivity[]) {
  return activities.map((item) => [item.activity.id, item.reposters.map((r) => r.name)]);
}

describe('groupReposts', function () {
  test('a post reposted by several accounts shows once, at its newest position', function () {
    const grouped = groupReposts([
      activity('a', ana),
      activity('b'),
      activity('a', ben),
      activity('c', cleo),
      activity('a', cleo),
    ]);

    expect(summarize(grouped)).toEqual([
      ['a', ['Ana', 'Ben', 'Cleo']],
      ['b', []],
      ['c', ['Cleo']],
    ]);
  });

  test('an original that is reposted further down gets the reposter', function () {
    const grouped = groupReposts([activity('a'), activity('a', ana)]);

    expect(summarize(grouped)).toEqual([['a', ['Ana']]]);
    expect(grouped[0].activity.type).toBe('Create');
    expect(grouped[0].activity.actor.name).toBe('Author');
  });

  test('an original further down than its repost adds no reposter', function () {
    const grouped = groupReposts([activity('a', ana), activity('a')]);

    expect(summarize(grouped)).toEqual([['a', ['Ana']]]);
    expect(grouped[0].activity.type).toBe('Announce');
  });

  test('the same account reposting twice is named once, whatever the handle case', function () {
    const anaShouting = account('Ana', '@ANA@example.com');

    const grouped = groupReposts([activity('a', ana), activity('a', anaShouting)]);

    expect(summarize(grouped)).toEqual([['a', ['Ana']]]);
  });
});
