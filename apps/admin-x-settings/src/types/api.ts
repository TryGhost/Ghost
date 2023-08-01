export type JSONValue = string|number|boolean|null|Date|JSONObject|JSONArray;
export interface JSONObject { [key: string]: JSONValue }
export interface JSONArray extends Array<string|number|boolean|Date|JSONObject|JSONValue> {}

export type SettingValue = string | boolean | null;

export type Setting = {
    key: string;
    value: SettingValue;
}

export type Config = {
    version: string;
    environment: string;
    editor: {
        url: string
        version: string
    };
    labs: Record<string, boolean>;
    stripeDirect: boolean;

    // Config is relatively fluid, so we only type used properties above and still support arbitrary property access when needed
    [key: string]: JSONValue;
};

export type User = {
    id: string;
    name: string;
    slug: string;
    email: string;
    profile_image: string;
    cover_image: string|null;
    bio: string;
    website: string;
    location: string;
    facebook: string;
    twitter: string;
    accessibility: string|null;
    status: string;
    meta_title: string|null;
    meta_description: string|null;
    tour: string|null;
    last_seen: string|null;
    created_at: string;
    updated_at: string;
    comment_notifications: boolean;
    free_member_signup_notification: boolean;
    paid_subscription_canceled_notification: boolean;
    paid_subscription_started_notification: boolean;
    mention_notifications: boolean;
    milestone_notifications: boolean;
    roles: UserRole[];
    url: string;
}

export type UserRoleType = 'Owner' | 'Administrator' | 'Editor' | 'Author' | 'Contributor';

export type UserRole = {
    id: string;
    name: UserRoleType;
    description: string;
    created_at: string;
    updated_at: string;
};

export type SiteData = {
    title: string;
    description: string;
    logo: string;
    icon: string;
    accent_color: string;
    url: string;
    locale: string;
    version: string;
};

export type Post = {
    id: string;
    url: string;
};

export type Member = {
    id: string;
};

export type Tier = {
    id: string;
    name: string;
    description: string | null;
    slug: string;
    active: boolean,
    type: string;
    welcome_page_url: string | null;
    created_at: string;
    updated_at: string;
    visibility: string;
    benefits: string[];
    currency?: string;
    monthly_price?: number;
    yearly_price?: number;
    trial_days: number;
}

export type Label = {
    id: string;
    name: string;
    slug: string;
    created_at: string;
    updated_at: string;
}

export type Offer = {
    id: string;
    name: string;
    code: string;
    display_title: string;
    display_description: string;
    type: string;
    cadence: string;
    amount: number;
    duration: string;
    duration_in_months: number | null;
    currency_restriction: boolean;
    currency: string | null;
    status: string;
    redemption_count: number;
    tier: {
        id: string;
        name: string;
    }
}

type CustomThemeSettingData =
    { type: 'text', value: string | null, default: string | null } |
    { type: 'color', value: string, default: string } |
    { type: 'image', value: string | null } |
    { type: 'boolean', value: boolean, default: boolean } |
    {
        type: 'select',
        value: string
        default: string
        options: string[]
    };

export type CustomThemeSetting = CustomThemeSettingData & {
    id: string
    key: string
    description?: string
    // homepage and post are the only two groups we handle, but technically theme authors can put other things in package.json
    group?: 'homepage' | 'post' | string
}

export type Theme = {
    active: boolean;
    name: string;
    package: {
        name?: string;
        description?: string;
        version?: string;
    };
    templates?: string[];
}

export type InstalledTheme = Theme & {
    errors?: ThemeProblem<'error'>[];
    warnings?: ThemeProblem<'warning'>[];
}

export type ThemeProblem<Level extends string = 'error' | 'warning'> = {
    code: string
    details: string
    failures: Array<{
        ref: string
        message?: string
        rule?: string
    }>
    fatal: boolean
    level: Level
    rule: string
}

export type Newsletter = {
    id: string;
    uuid: string;
    name: string;
    description: string | null;
    feedback_enabled: boolean;
    slug: string;
    sender_name: string | null;
    sender_email: string | null;
    sender_reply_to: string;
    status: string;
    visibility: string;
    subscribe_on_signup: boolean;
    sort_order: number;
    header_image: string | null;
    show_header_icon: boolean;
    show_header_title: boolean;
    title_font_category: string;
    title_alignment: string;
    show_feature_image: boolean;
    body_font_category: string;
    footer_content: string | null;
    show_badge: boolean;
    show_header_name: boolean;
    show_post_title_section: boolean;
    show_comment_cta: boolean;
    show_subscription_details: boolean;
    show_latest_posts: boolean;
    background_color: string;
    border_color: string | null;
    title_color: string | null;
    created_at: string;
    updated_at: string;
    count?: {
        posts?: number;
        active_members?: number;
    }
}
