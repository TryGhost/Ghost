export type GiftLinkStatus = 'active' | 'inactive';

/**
 * Domain representation of a gift link, decoupled from the Bookshelf model.
 * Fields mirror the `gift_links` columns (snake_case) so the repository maps
 * rows straight onto this type and the API serialiser is a near pass-through.
 * There is intentionally no behaviour here: state transitions (deactivation,
 * read counting) are bulk SQL in the repository, not per-row domain methods.
 */
export interface GiftLink {
    id: string;
    post_id: string;
    token: string;
    status: GiftLinkStatus;
    redeemed_count: number;
    last_redeemed_at: Date | null;
    created_at: Date;
    updated_at: Date | null;
}
