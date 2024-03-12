export type URLS = {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
};
export type Links = {
    self: string;
    html: string;
    download: string;
    download_location: string;
};
export type ProfileImage = {
    small: string;
    medium: string;
    large: string;
};
export type User = {
    id: string;
    updated_at: string;
    username: string;
    name: string;
    first_name: string;
    last_name: string;
    twitter_username: string;
    portfolio_url: string;
    bio: string;
    location: string;
    links: Links;
    profile_image: ProfileImage;
    instagram_username: string;
    total_collections: number;
    total_likes: number;
    total_photos: number;
    accepted_tos: boolean;
    for_hire: boolean;
    social: {
        instagram_username: string;
        portfolio_url: string;
        twitter_username: string;
        paypal_email: null | string;
    };
};
export type Photo = {
    id: string;
    slug: string;
    created_at: string;
    updated_at: string;
    promoted_at: string | null;
    width: number;
    height: number;
    color: string;
    blur_hash: string;
    description: null | string;
    alt_description: string;
    breadcrumbs: [];
    urls: URLS;
    links: Links;
    likes: number;
    liked_by_user: boolean;
    current_user_collections: [];
    sponsorship: null | [];
    topic_submissions: [];
    user: User;
    ratio: number;
    src?: string;
};
export type DefaultHeaderTypes = {
    Authorization: string;
    'Accept-Version': string;
    'Content-Type': string;
    'App-Pragma': string;
    'X-Unsplash-Cache': boolean;
};
