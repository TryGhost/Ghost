export interface Label {
    name: string;
}

/**
 * Any column the parser does not special-case is coerced, so a cell reading
 * TRUE or FALSE arrives as a boolean and an empty one as null, whatever the
 * column means. A member genuinely named TRUE parses to `name: true`.
 */
export type ParsedValue = string | boolean | null;

/**
 * The member CSV column vocabulary as it currently stands. Several fields exist
 * on one side only: tiers and deleted_at are written on export and not accepted
 * on import, import_tier is accepted on import and never written, and the email
 * subscription state is called subscribed coming in and subscribed_to_emails
 * going out. The index signature carries custom field columns, which are not
 * known ahead of time.
 */
export interface MemberCsvRow {
    id?: ParsedValue;
    email?: ParsedValue;
    name?: ParsedValue;
    note?: ParsedValue;
    subscribed?: boolean;
    subscribed_to_emails?: boolean;
    comped?: boolean;
    complimentary_plan?: boolean;
    stripe_customer_id?: ParsedValue;
    subscriptions?: Array<{customer?: {id?: string}}>;
    created_at?: ParsedValue;
    deleted_at?: ParsedValue;
    labels?: string | Array<string | Label>;
    tiers?: Array<{name: string}>;
    import_tier?: ParsedValue;
    gift_id?: ParsedValue;
    error?: ParsedValue;
    [column: string]: unknown;
}
