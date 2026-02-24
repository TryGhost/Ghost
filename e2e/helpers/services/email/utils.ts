import baseDebug from '@tryghost/debug';
import {EmailMessageDetailed} from './mail-pit';

const debug = baseDebug('e2e:helpers:utils:email');

// Look for magic link pattern in the email message body
// Ghost magic links typically look like: http://localhost:30000/members/?token=...&action=signup
export function extractMagicLink(emailMessageBody: string, expectedActionInUrl: 'signup' | 'signin' = 'signup'): string {
    const magicLinkRegex = /https?:\/\/[^\s]+\/members\/\?token=[^\s&]+(&action=\w+)?(&r=[^\s]+)?/gi;
    const matches = emailMessageBody.match(magicLinkRegex);

    if (matches && matches.length > 0) {
        const magicLink = matches[0];
        debug(`Found magic link: ${magicLink}`);

        // Validate that the link has required parameters
        if (!magicLink.includes('token=')) {
            throw new Error('Magic link missing token parameter');
        }

        if (!magicLink.includes(`action=${expectedActionInUrl}`)) {
            throw new Error(`Magic link missing action=${expectedActionInUrl} parameter`);
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

export function extractInvitationLink(emailMessageBody: string): string {
    const htmlMatch = emailMessageBody.match(/href="([^"]*\/ghost\/(?:#\/)?signup\/[^"]+)"/i);
    if (htmlMatch && htmlMatch[1]) {
        const link = htmlMatch[1];
        debug(`Found invitation link in HTML: ${link}`);
        return link;
    }

    const textMatch = emailMessageBody.match(/(https?:\/\/[^\s]+\/ghost\/(?:#\/)?signup\/[^\s/]+)/i);
    if (textMatch && textMatch[1]) {
        const link = textMatch[1];
        debug(`Found invitation link in text: ${link}`);
        return link;
    }

    const relativeMatch = emailMessageBody.match(/(\/ghost\/(?:#\/)?signup\/[^\s/]+)/i);
    if (relativeMatch && relativeMatch[1]) {
        const link = relativeMatch[1];
        debug(`Found relative invitation link: ${link}`);
        return link;
    }

    throw new Error('No invitation link found in email');
}
