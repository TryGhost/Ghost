// Tinybird Page Hit Options
export interface PageHitOptions {
    timestamp?: Date;
    session_id?: string;
    post_uuid?: string;
    member_uuid?: string;
    member_status?: 'free' | 'paid' | 'comped' | 'undefined';
    pathname?: string;
    referrer?: string;
    user_agent?: string;
    locale?: string;
    location?: string;
}

// Tinybird Page Hit Result
export interface PageHitResult {
    timestamp: string;
    action: 'page_hit';
    version: '1';
    session_id: string;
    payload: {
        site_uuid: string;
        member_uuid: string;
        member_status: string;
        post_uuid: string;
        pathname: string;
        referrer: string;
        'user-agent': string;
        locale: string;
        location: string;
        href: string;
        event_id: string;
        meta: {
            referrerSource?: string;
        };
    };
}