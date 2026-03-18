import React from 'react';
import {GhostOrb, cn} from '@tryghost/shade';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {resolveAllColors} from './design-utils';
import {useGlobalData} from '../../providers/global-data-provider';
import type {EmailDesignSettings} from './types';

interface EmailPreviewProps {
    settings: EmailDesignSettings;
    senderName?: string;
    senderEmail?: string;
    subject?: string;
    headerImage?: string;
    showPublicationTitle?: boolean;
    showBadge?: boolean;
    emailFooter?: string;
    footerLinkText?: string;
    children?: React.ReactNode;
}

// --- Helper functions ---

export function resolveFontFamily(category: string | undefined) {
    return category === 'serif' ? 'Georgia, serif' : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
}

export function resolveButtonCorners(corners: string | undefined): string {
    switch (corners) {
    case 'square': return 'rounded-none';
    case 'pill': return 'rounded-full';
    case 'rounded':
    default: return 'rounded-[6px]';
    }
}

export function resolveImageCorners(corners: string | undefined): string {
    return corners === 'rounded' ? 'rounded-md' : '';
}

// --- Sub-components ---

const EnvelopeHeader: React.FC<{senderName?: string; senderEmail?: string; subject?: string}> = ({senderName, senderEmail, subject}) => {
    if (!senderName && !senderEmail && !subject) {
        return null;
    }

    return (
        <div className="border-gray-200 dark:border-gray-800 dark:bg-gray-950 rounded-t-lg border border-b-0 bg-white px-6 py-4 text-sm">
            {senderName && (
                <div className="flex gap-2">
                    <span className="font-semibold">{senderName}</span>
                    {senderEmail && <span className="text-gray-500">&lt;{senderEmail}&gt;</span>}
                </div>
            )}
            {senderEmail && (
                <div className="text-gray-500">
                    To: <span className="text-gray-700 dark:text-gray-300">subscriber@example.com</span>
                </div>
            )}
            {subject && (
                <div className="mt-1">{subject}</div>
            )}
        </div>
    );
};

const PublicationHeader: React.FC<{
    showTitle: boolean;
    siteTitle?: string;
    backgroundColor?: string;
    textColor: string;
    fontFamily: string;
}> = ({showTitle, siteTitle, backgroundColor, textColor, fontFamily}) => {
    if (!showTitle || !siteTitle) {
        return null;
    }

    return (
        <div
            className="px-12 pb-4 pt-10 text-center"
            style={{backgroundColor: backgroundColor === 'transparent' ? undefined : backgroundColor}}
        >
            <h4
                className="text-sm font-semibold uppercase tracking-wide"
                style={{color: textColor, fontFamily}}
            >
                {siteTitle}
            </h4>
        </div>
    );
};

const Footer: React.FC<{siteTitle?: string; footerLinkText?: string; emailFooter?: string; showBadge?: boolean; color: string; textColor: string}> = ({siteTitle, footerLinkText = 'Unsubscribe', emailFooter, showBadge, color, textColor}) => (
    <div
        className="px-12 pb-10 text-center text-xs"
        style={{color}}
    >
        {emailFooter && (
            <p className="mb-2 mt-0 whitespace-pre-line">
                {emailFooter}
            </p>
        )}
        <p className="mb-2 mt-0">
            {siteTitle || 'Your publication'} &copy; {new Date().getFullYear()} &mdash; <span className="underline">{footerLinkText}</span>
        </p>
        {showBadge && (
            <div className="flex items-center justify-center gap-1 pt-2 text-xs font-semibold" style={{color: textColor}}>
                <GhostOrb className="size-4" />
                <span>Powered by Ghost</span>
            </div>
        )}
    </div>
);

// --- Main component ---

const EmailPreview: React.FC<EmailPreviewProps> = ({settings, senderName, senderEmail, subject, headerImage, showPublicationTitle = true, showBadge = true, emailFooter, footerLinkText, children}) => {
    const {settings: globalSettings, siteData} = useGlobalData();
    const [siteTitle] = getSettingValues<string>(globalSettings, ['title']);
    const accentColor = siteData.accent_color;

    const colors = resolveAllColors(settings, accentColor);
    const titleFont = resolveFontFamily(settings.title_font_category);
    const imageCornerClass = resolveImageCorners(settings.image_corners);

    const hasEnvelope = !!(senderName || senderEmail || subject);

    return (
        <div className="mx-auto w-full max-w-[600px]">
            <EnvelopeHeader senderEmail={senderEmail} senderName={senderName} subject={subject} />

            <div
                className={cn('w-full overflow-hidden border border-gray-200 dark:border-gray-800', hasEnvelope ? 'rounded-b-lg' : 'rounded-lg')}
                style={{backgroundColor: colors.backgroundColor}}
            >
                {headerImage && (
                    <div className="px-12 pt-8">
                        <img alt="Header" className={cn('h-auto w-full', imageCornerClass)} src={headerImage} />
                    </div>
                )}

                <PublicationHeader
                    backgroundColor={colors.headerBackgroundColor}
                    fontFamily={titleFont}
                    showTitle={showPublicationTitle}
                    siteTitle={siteTitle}
                    textColor={colors.headerTextColor}
                />

                {children}

                <Footer color={colors.secondaryTextColor} emailFooter={emailFooter} footerLinkText={footerLinkText} showBadge={showBadge} siteTitle={siteTitle} textColor={colors.textColor} />
            </div>
        </div>
    );
};

export default EmailPreview;
