import {Post, PostType} from '../../../src/api/activitypub';
import {mapPostToActivity} from '../../../src/utils/posts';

describe('mapPostToActivity', function () {
    let post: Post;

    beforeEach(function () {
        post = {
            id: '123',
            type: PostType.Article,
            title: 'Test Post',
            excerpt: 'Test Excerpt',
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
                url: 'https://example.com/users/123'
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
                    url: 'https://example.com/users/456'
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
                url: 'https://example.com/users/456'
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
});
