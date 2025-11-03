import baseDebug from '@tryghost/debug';
import {EmailMessageDetailed} from './MailPit';

const debug = baseDebug('e2e:helpers:utils:email');

// Look for magic link pattern in the email message body
// Ghost magic links typically look like: http://localhost:30000/members/?token=...&action=signup
export function extractMagicLink(emailMessageBody: string): string {
    const magicLinkRegex = /https?:\/\/[^\s]+\/members\/\?token=[^\s&]+(&action=\w+)?(&r=[^\s]+)?/gi;
    const matches = emailMessageBody.match(magicLinkRegex);

    if (matches && matches.length > 0) {
        const magicLink = matches[0];
        debug(`Found magic link: ${magicLink}`);

        // Validate that the link has required parameters
        if (!magicLink.includes('token=')) {
            throw new Error('Magic link missing token parameter');
        }

        if (!magicLink.includes('action=signup')) {
            throw new Error('Magic link missing action=signup parameter');
        }

        return magicLink;
    }

    throw new Error('No magic link found in email');
}

export function extractPasswordResetLink(message: EmailMessageDetailed): string {
    const html = message.HTML || '';
    const match = html.match(/href="([^"]*\/ghost\/reset\/[^"]+)"/);

    if (!match) {
        throw new Error(`No reset URL found in email HTML`);
    }

    return match[1];
}
