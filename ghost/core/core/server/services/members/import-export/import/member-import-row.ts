// A label to tag imported members with. Labels reach the import already normalised
// to objects, so a name is the only shape it handles.
export interface Label {
    name: string;
}

// A parsed member cell, coerced to a primitive: an empty cell reads as null, TRUE
// or FALSE as a boolean, anything else as a string.
export type MemberFieldValue = string | boolean | null;

// A member row ready to import, whatever its source. The named columns are the
// member fields an import can carry; the index signature holds custom-field columns
// and anything else the source preserves so a failed row can be reported back in
// full. Owned here rather than borrowed from the CSV module, so the import defines
// its own input vocabulary and a non-CSV source can satisfy it unchanged.
export interface MemberImportRow {
    id?: MemberFieldValue;
    email?: MemberFieldValue;
    name?: MemberFieldValue;
    note?: MemberFieldValue;
    subscribed?: boolean;
    complimentary_plan?: boolean;
    stripe_customer_id?: MemberFieldValue;
    created_at?: MemberFieldValue;
    labels: Label[];
    import_tier?: MemberFieldValue;
    gift_id?: MemberFieldValue;
    [column: string]: unknown;
}

// A row that failed to import, carrying the raw message that stopped it. The
// message is left raw here; turning it into human copy is a presentation concern.
export type ImportErrorRow = MemberImportRow & {error: string};

// The persisted import label as plain data -- taken off the Bookshelf model before
// it leaves the kernel, so the result and the email carry only what they show.
export interface ImportLabel {
    name: string;
    slug: string;
}
