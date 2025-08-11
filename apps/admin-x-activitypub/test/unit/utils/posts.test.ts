import {Post, PostType} from '../../../src/api/activitypub';
import {mapActivityToPost, mapPostToActivity} from '../../../src/utils/posts';

describe('Post utils', function () {
    describe('mapPostToActivity', function () {
        let post: Post;

        beforeEach(function () {
            post = {
                id: '123',
                type: PostType.Article,
                title: 'Test Post',
                excerpt: 'Test Excerpt',
                summary: 'Test Summary',
                content: 'Test Content',
                url: 'https://example.com/posts/123',
                featureImageUrl: 'https://example.com/posts/123/feature.jpg',
                publishedAt: '2024-01-01T00:00:00Z',
                likeCount: 2,
                likedByMe: true,
                replyCount: 3,
                readingTimeMinutes: 4,
                attachments: [
                    {
                        type: 'Image',
                        mediaType: 'image/jpeg',
                        name: 'test.jpg',
                        url: 'https://example.com/test.jpg'
                    },
                    {
                        type: 'Image',
                        mediaType: 'image/jpeg',
                        name: 'test1.jpg',
                        url: 'https://example.com/test1.jpg'
                    }
                ],
                author: {
                    id: 'https://example.com/users/123',
                    handle: '@testuser@example.com',
                    avatarUrl: 'https://example.com/users/123/avatar.jpg',
                    name: 'Test User',
                    url: 'https://example.com/users/123',
                    followedByMe: false
                },
                authoredByMe: true,
                repostCount: 5,
                repostedByMe: false,
                repostedBy: null
            };
        });

        test('it sets the correct activity type', function () {
            expect(
                mapPostToActivity(post).type
            ).toBe('Create');

            expect(
                mapPostToActivity({
                    ...post,
                    repostedBy: {
                        id: 'https://example.com/users/456',
                        handle: '@testuser2@example.com',
                        avatarUrl: 'https://example.com/users/456/avatar.jpg',
                        name: 'Test User 2',
                        url: 'https://example.com/users/456',
                        followedByMe: true
                    }
                }).type
            ).toBe('Announce');
        });

        test('it sets the correct actor', function () {
            let actor = mapPostToActivity(post).actor;

            expect(actor.id).toBe('https://example.com/users/123');
            expect(actor.icon.url).toBe('https://example.com/users/123/avatar.jpg');
            expect(actor.name).toBe('Test User');
            expect(actor.preferredUsername).toBe('testuser');

            // When the post has been reposted, the actor should be the reposter
            actor = mapPostToActivity({
                ...post,
                repostedBy: {
                    id: 'https://example.com/users/456',
                    handle: '@testuser2@example.com',
                    avatarUrl: 'https://example.com/users/456/avatar.jpg',
                    name: 'Test User 2',
                    url: 'https://example.com/users/456',
                    followedByMe: false
                }
            }).actor;

            expect(actor.id).toBe('https://example.com/users/456');
            expect(actor.icon.url).toBe('https://example.com/users/456/avatar.jpg');
            expect(actor.name).toBe('Test User 2');
            expect(actor.preferredUsername).toBe('testuser2');
        });

        test('it sets the correct object type', function () {
            expect(
                mapPostToActivity(post).object.type
            ).toBe('Article');

            expect(
                mapPostToActivity({
                    ...post,
                    type: PostType.Note
                }).object.type
            ).toBe('Note');

            expect(
                mapPostToActivity({
                    ...post,
                    type: PostType.Tombstone
                }).object.type
            ).toBe('Tombstone');
        });

        test('it sets the correct object', function () {
            const object = mapPostToActivity(post).object;

            expect(object.type).toBe('Article');
            expect(object.name).toBe('Test Post');
            expect(object.content).toBe('Test Content');
            expect(object.summary).toBe('Test Summary');
            expect(object.url).toBe('https://example.com/posts/123');
            expect(object.attributedTo.id).toBe('https://example.com/users/123');
            expect(object.published).toBe('2024-01-01T00:00:00Z');
            expect(object.preview.content).toBe('Test Excerpt');
            expect(object.id).toBe('123');
            expect(object.replyCount).toBe(3);
            expect(object.liked).toBe(true);
            expect(object.reposted).toBe(false);
            expect(object.repostCount).toBe(5);
        });

        test('it sets the correct attachments', function () {
            const object = mapPostToActivity(post).object;

            expect(object.attachment).toHaveLength(2);
            expect(object.attachment[0]).toEqual({
                type: 'Image',
                mediaType: 'image/jpeg',
                name: 'test.jpg',
                url: 'https://example.com/test.jpg'
            });
            expect(object.attachment[1]).toEqual({
                type: 'Image',
                mediaType: 'image/jpeg',
                name: 'test1.jpg',
                url: 'https://example.com/test1.jpg'
            });
        });

        test('it maps followedByMe property correctly', function () {
            // Test for regular posts (non-reposts)
            const activity = mapPostToActivity({
                ...post,
                author: {
                    ...post.author,
                    followedByMe: true
                }
            });

            expect(activity.actor.followedByMe).toBe(true);

            // Test for reposts
            const repostActivity = mapPostToActivity({
                ...post,
                repostedBy: {
                    id: 'https://example.com/users/456',
                    handle: '@testuser2@example.com',
                    avatarUrl: 'https://example.com/users/456/avatar.jpg',
                    name: 'Test User 2',
                    url: 'https://example.com/users/456',
                    followedByMe: true
                }
            });

            expect(repostActivity.actor.followedByMe).toBe(true);
            expect(repostActivity.object.attributedTo.followedByMe).toBe(false); // Original author from post.author
        });

        test('it maps reposted property correctly', function () {
            // Test for regular posts
            const activity = mapPostToActivity({
                ...post,
                repostedByMe: true
            });

            expect(activity.object.reposted).toBe(true);

            // Test for reposts
            const repostActivity = mapPostToActivity({
                ...post,
                repostedByMe: false,
                repostedBy: {
                    id: 'https://example.com/users/456',
                    handle: '@testuser2@example.com',
                    avatarUrl: 'https://example.com/users/456/avatar.jpg',
                    name: 'Test User 2',
                    url: 'https://example.com/users/456',
                    followedByMe: true
                }
            });

            expect(repostActivity.object.reposted).toBe(false);
        });
    });

    describe('mapActivityToPost', function () {
        it('should map a regular post activity to Post', function () {
            const activity = {
                type: 'Create',
                object: {
                    id: 'https://example.com/posts/123',
                    type: 'Note',
                    name: 'Test Post',
                    content: 'Test Content',
                    url: 'https://example.com/posts/123',
                    image: 'https://example.com/image.jpg',
                    published: '2024-03-20T12:00:00.000Z',
                    liked: true,
                    replyCount: 5,
                    attachment: [],
                    authored: true,
                    reposted: false,
                    repostCount: 0,
                    attributedTo: {
                        id: 'https://example.com/users/1',
                        name: 'Test User',
                        preferredUsername: 'testuser',
                        icon: {url: 'https://example.com/avatar.jpg'}
                    }
                },
                actor: {
                    id: 'https://example.com/users/1',
                    name: 'Test User',
                    preferredUsername: 'testuser',
                    icon: {url: 'https://example.com/avatar.jpg'}
                }
            };

            const result = mapActivityToPost(activity);

            expect(result).toEqual({
                id: 'https://example.com/posts/123',
                type: PostType.Note,
                title: 'Test Post',
                excerpt: '',
                summary: null,
                content: 'Test Content',
                url: 'https://example.com/posts/123',
                featureImageUrl: 'https://example.com/image.jpg',
                publishedAt: '2024-03-20T12:00:00.000Z',
                likeCount: 0,
                likedByMe: true,
                replyCount: 5,
                readingTimeMinutes: 0,
                attachments: [],
                author: {
                    id: 'https://example.com/users/1',
                    handle: '@testuser@example.com',
                    name: 'Test User',
                    url: 'https://example.com/users/1',
                    avatarUrl: 'https://example.com/avatar.jpg',
                    followedByMe: false
                },
                authoredByMe: true,
                repostCount: 0,
                repostedByMe: false,
                repostedBy: null
            });
        });

        it('should map followedByMe from attributedTo in regular posts', function () {
            const activity = {
                type: 'Create',
                object: {
                    id: 'https://example.com/posts/123',
                    type: 'Note',
                    name: 'Test Post',
                    content: 'Test Content',
                    url: 'https://example.com/posts/123',
                    published: '2024-03-20T12:00:00.000Z',
                    attachment: [],
                    attributedTo: {
                        id: 'https://example.com/users/1',
                        name: 'Test User',
                        preferredUsername: 'testuser',
                        icon: {url: 'https://example.com/avatar.jpg'},
                        followedByMe: true
                    }
                },
                actor: {
                    id: 'https://example.com/users/1',
                    name: 'Test User',
                    preferredUsername: 'testuser'
                }
            };

            const result = mapActivityToPost(activity);

            expect(result.author.followedByMe).toBe(true);
        });

        it('should map a repost activity to Post', function () {
            const activity = {
                type: 'Announce',
                object: {
                    id: 'https://example.com/posts/123',
                    type: 'Note',
                    name: 'Original Post',
                    content: 'Original Content',
                    url: 'https://example.com/posts/123',
                    image: 'https://example.com/image.jpg',
                    published: '2024-03-20T12:00:00.000Z',
                    liked: false,
                    replyCount: 3,
                    attachment: [],
                    authored: false,
                    reposted: true,
                    repostCount: 1,
                    attributedTo: {
                        id: 'https://example.com/users/1',
                        name: 'Original Author',
                        preferredUsername: 'originalauthor',
                        icon: {url: 'https://example.com/avatar1.jpg'}
                    }
                },
                actor: {
                    id: 'https://example.com/users/2',
                    name: 'Reposter',
                    preferredUsername: 'reposter',
                    icon: {url: 'https://example.com/avatar2.jpg'}
                }
            };

            const result = mapActivityToPost(activity);

            expect(result).toEqual({
                id: 'https://example.com/posts/123',
                type: PostType.Note,
                title: 'Original Post',
                excerpt: '',
                summary: null,
                content: 'Original Content',
                url: 'https://example.com/posts/123',
                featureImageUrl: 'https://example.com/image.jpg',
                publishedAt: '2024-03-20T12:00:00.000Z',
                likeCount: 0,
                likedByMe: false,
                replyCount: 3,
                readingTimeMinutes: 0,
                attachments: [],
                author: {
                    id: 'https://example.com/users/1',
                    handle: '@originalauthor@example.com',
                    name: 'Original Author',
                    url: 'https://example.com/users/1',
                    avatarUrl: 'https://example.com/avatar1.jpg',
                    followedByMe: false
                },
                authoredByMe: false,
                repostCount: 1,
                repostedByMe: true,
                repostedBy: {
                    id: 'https://example.com/users/2',
                    handle: '@reposter@example.com',
                    name: 'Reposter',
                    url: 'https://example.com/users/2',
                    avatarUrl: 'https://example.com/avatar2.jpg',
                    followedByMe: false
                }
            });
        });

        it('should map followedByMe for both author and reposter in reposts', function () {
            const activity = {
                type: 'Announce',
                object: {
                    id: 'https://example.com/posts/123',
                    type: 'Note',
                    content: 'Original Content',
                    url: 'https://example.com/posts/123',
                    published: '2024-03-20T12:00:00.000Z',
                    attachment: [],
                    attributedTo: {
                        id: 'https://example.com/users/1',
                        name: 'Original Author',
                        preferredUsername: 'originalauthor',
                        icon: {url: 'https://example.com/avatar1.jpg'},
                        followedByMe: true
                    }
                },
                actor: {
                    id: 'https://example.com/users/2',
                    name: 'Reposter',
                    preferredUsername: 'reposter',
                    icon: {url: 'https://example.com/avatar2.jpg'},
                    followedByMe: true
                }
            };

            const result = mapActivityToPost(activity);

            expect(result.author.followedByMe).toBe(true);
            expect(result.repostedBy?.followedByMe).toBe(true);
        });
    });
});
