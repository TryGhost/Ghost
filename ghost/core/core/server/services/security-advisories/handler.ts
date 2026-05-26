import semver from 'semver';
import {AdvisoryEvent, type AdvisorySeverity} from './schema';

export interface NotificationInput {
    id: string;
    custom: boolean;
    type: 'alert' | 'info' | 'warn';
    dismissible: boolean;
    top: boolean;
    message: string;
}

export interface HandlerContext {
    ghostVersion: string;
    siteUrl: string;
}

// GitHub returns vulnerable-version ranges using `&&` between bounds and `,`
// for OR. node-semver expects whitespace AND and `||` OR.
function normaliseRange(range: string): string {
    return range.replace(/\s*&&\s*/g, ' ').replace(/\s*,\s*/g, ' || ');
}

function affectsThisInstall(event: AdvisoryEvent, currentVersion: string): boolean {
    return event.vulnerabilities.some((v) => {
        if (v.package.ecosystem.toLowerCase() !== 'npm') {
            return false;
        }
        if (v.package.name.toLowerCase() !== 'ghost') {
            return false;
        }
        try {
            return semver.satisfies(currentVersion, normaliseRange(v.vulnerable_version_range), {
                includePrerelease: true
            });
        } catch {
            return false;
        }
    });
}

function isActionableSeverity(severity: AdvisorySeverity): boolean {
    return severity === 'high' || severity === 'critical';
}

// John-approved copy. Site URL and advisory URL are interpolated locally so
// the resulting HTML is correct for the install that produced it.
function renderBody({siteUrl, ghsaUrl}: {siteUrl: string; ghsaUrl: string}): string {
    return [
        '<p>Hi there,</p>',
        `<p>A critical security update for Ghost has been released that patches recently reported vulnerabilities affecting your website: <strong>${siteUrl}</strong></p>`,
        '<p>Please update your Ghost install to the latest version as soon as possible, and consider resetting authentication credentials:</p>',
        '<p><a href="https://ghost.org/help/auth-reset">https://ghost.org/help/auth-reset</a></p>',
        '<p>Full security advisory details:</p>',
        `<p><a href="${ghsaUrl}">${ghsaUrl}</a></p>`,
        '<hr>',
        '<p>If you use Docker, documentation for updating is here:</p>',
        '<p><a href="https://docs.ghost.org/install/docker#updating-ghost">https://docs.ghost.org/install/docker#updating-ghost</a></p>',
        '<p>Otherwise, follow Ghost-CLI update docs, here:</p>',
        '<p><a href="https://docs.ghost.org/update">https://docs.ghost.org/update</a></p>'
    ].join('');
}

export function toNotificationInput(
    event: AdvisoryEvent,
    context: HandlerContext
): NotificationInput | null {
    if (event.state !== 'published') {
        return null;
    }
    if (!isActionableSeverity(event.severity)) {
        return null;
    }
    if (!affectsThisInstall(event, context.ghostVersion)) {
        return null;
    }

    return {
        id: `ghsa-${event.ghsa_id}`,
        custom: true,
        type: 'alert',
        dismissible: false,
        top: true,
        message: renderBody({siteUrl: context.siteUrl, ghsaUrl: event.html_url})
    };
}
