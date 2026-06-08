/* eslint-disable ghost/filenames/match-exported-class */

export interface EmailAddress {
    address: string;
    name?: string;
}

declare class EmailAddressParser {
    static parse(email: string): EmailAddress | null;
    static stringify(email: EmailAddress): string;
}

export default EmailAddressParser;
