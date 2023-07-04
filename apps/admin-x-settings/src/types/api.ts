export type SettingValue = string | boolean | null;

export type Setting = {
    key: string;
    value: SettingValue;
}

export type Config = {
    [key: string]: any;
}

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
