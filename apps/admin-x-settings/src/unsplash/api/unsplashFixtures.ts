import {Photo} from '../UnsplashTypes';

export const fixturePhotos: Photo[] = [
    {
        id: '1',
        slug: 'photo1',
        created_at: '2021-01-01',
        updated_at: '2021-01-02',
        promoted_at: null,
        width: 1080,
        height: 720,
        color: '#ffffff',
        blur_hash: 'abc123',
        description: 'A nice photo',
        alt_description: 'alt1',
        breadcrumbs: [],
        urls: {
            raw: 'http://example.com/raw1',
            full: 'http://example.com/full1',
            regular: 'http://example.com/regular1',
            small: 'http://example.com/small1',
            thumb: 'http://example.com/thumb1'
        },
        links: {
            self: 'http://example.com/self1',
            html: 'http://example.com/html1',
            download: 'http://example.com/download1',
            download_location: 'http://example.com/download_location1'
        },
        likes: 100,
        liked_by_user: true,
        current_user_collections: [],
        sponsorship: null,
        topic_submissions: [],
        user: {
            id: 'user1',
            updated_at: '2021-01-01',
            username: 'user1',
            name: 'User One',
            first_name: 'User',
            last_name: 'One',
            twitter_username: 'user1_twitter',
            portfolio_url: 'http://portfolio1.com',
            bio: 'Bio1',
            location: 'Location1',
            links: {
                self: 'http://example.com/self1',
                html: 'http://example.com/html1',
                download: 'http://example.com/download1',
                download_location: 'http://example.com/download_location1'
            },
            profile_image: {
                small: 'http://small1.com',
                medium: 'http://medium1.com',
                large: 'http://large1.com'
            },
            instagram_username: 'insta1',
            total_collections: 10,
            total_likes: 100,
            total_photos: 1000,
            accepted_tos: true,
            for_hire: false,
            social: {
                instagram_username: 'insta1',
                portfolio_url: 'http://portfolio1.com',
                twitter_username: 'user1_twitter',
                paypal_email: null
            }
        },
        ratio: 1.5,
        src: 'http://src1.com'
    },
    {
        id: '2',
        slug: 'photo1',
        created_at: '2021-01-01',
        updated_at: '2021-01-02',
        promoted_at: null,
        width: 1080,
        height: 720,
        color: '#ffffff',
        blur_hash: 'abc123',
        description: 'hello world',
        alt_description: 'alt1',
        breadcrumbs: [],
        urls: {
            raw: 'http://example.com/raw1',
            full: 'http://example.com/full1',
            regular: 'http://example.com/regular1',
            small: 'http://example.com/small1',
            thumb: 'http://example.com/thumb1'
        },
        links: {
            self: 'http://example.com/self1',
            html: 'http://example.com/html1',
            download: 'http://example.com/download1',
            download_location: 'http://example.com/download_location1'
        },
        likes: 100,
        liked_by_user: true,
        current_user_collections: [],
        sponsorship: null,
        topic_submissions: [],
        user: {
            id: 'user1',
            updated_at: '2021-01-01',
            username: 'user1',
            name: 'User One',
            first_name: 'User',
            last_name: 'One',
            twitter_username: 'user1_twitter',
            portfolio_url: 'http://portfolio1.com',
            bio: 'Bio1',
            location: 'Location1',
            links: {
                self: 'http://example.com/self1',
                html: 'http://example.com/html1',
                download: 'http://example.com/download1',
                download_location: 'http://example.com/download_location1'
            },
            profile_image: {
                small: 'http://small1.com',
                medium: 'http://medium1.com',
                large: 'http://large1.com'
            },
            instagram_username: 'insta1',
            total_collections: 10,
            total_likes: 100,
            total_photos: 1000,
            accepted_tos: true,
            for_hire: false,
            social: {
                instagram_username: 'insta1',
                portfolio_url: 'http://portfolio1.com',
                twitter_username: 'user1_twitter',
                paypal_email: null
            }
        },
        ratio: 1.5,
        src: 'http://src1.com'
    }
];
