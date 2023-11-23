import addressparser from 'nodemailer/lib/addressparser';

export type EmailAddress = {
    address: string,
    name?: string
}

export class EmailAddressParser {
    static parse(email: string) : EmailAddress|null {
        if (!email || typeof email !== 'string' || !email.length) {
            return null;
        }

        const parsed = addressparser(email);

        if (parsed.length !== 1) {
            return null;
        }
        const first = parsed[0];

        // Check first has a group property
        if ('group' in first) {
            // Unsupported format
            return null;
        }

        return {
            address: first.address,
            name: first.name || undefined
        };
    }

    static stringify(email: EmailAddress) : string {
        if (!email.name) {
            return email.address;
        }

        const escapedName = email.name.replace(/"/g, '\\"');
        return `"${escapedName}" <${email.address}>`;
    }
}
