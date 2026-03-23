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
        <div className="flex-column flex min-h-[77px] justify-center border-b border-grey-200 bg-white px-6 text-sm text-grey-700">
            {senderName && (
                <div className="flex gap-2">
                    <span className="font-semibold text-grey-900">{senderName}</span>
                    {senderEmail && <span>&lt;{senderEmail}&gt;</span>}
                </div>
            )}
            {senderEmail && (
                <div>
                    <span className="font-semibold text-grey-900">To:</span> subscriber@example.com
                </div>
            )}
            {subject && (
                <div className="mt-1 text-grey-900">{subject}</div>
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
            className="px-[7rem] py-3 text-center"
            style={{backgroundColor: backgroundColor === 'transparent' ? undefined : backgroundColor}}
        >
            <h4
                className="mb-1 text-[1.6rem] leading-tight font-bold tracking-tight uppercase"
                style={{color: textColor, fontFamily}}
            >
                {siteTitle}
            </h4>
        </div>
    );
};

const Footer: React.FC<{siteTitle?: string; footerLinkText?: string; emailFooter?: string; showBadge?: boolean; color: string; textColor: string}> = ({siteTitle, footerLinkText = 'Unsubscribe', emailFooter, showBadge, color, textColor}) => (
    <div className="flex flex-col items-center pt-10">
        {emailFooter && (
            <div
                className="px-8 py-3 text-center text-[1.3rem] leading-base break-words whitespace-pre-line"
                style={{color}}
            >
                {emailFooter}
            </div>
        )}
        <div className="px-8 pt-3 pb-14 text-center text-[1.3rem]">
            <span style={{color}}>{siteTitle || 'Your publication'} &copy; {new Date().getFullYear()} &mdash; </span>
            <span className="underline" style={{color}}>{footerLinkText}</span>
        </div>
        {showBadge && (
            <div className="flex flex-col items-center pt-[10px] pb-[40px]">
                <span className="inline-flex items-center px-2 py-1 text-[1.25rem] font-semibold tracking-tight" style={{color: textColor}}>
                    <GhostOrb className="mr-[6px] size-4" />
                    <span>Powered by Ghost</span>
                </span>
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

    return (
        <div className="mx-auto w-full max-w-[700px] overflow-hidden rounded-[4px] text-black shadow-sm">
            <EnvelopeHeader senderEmail={senderEmail} senderName={senderName} subject={subject} />

            <div
                className="w-full overflow-y-auto text-sm"
                style={{backgroundColor: colors.backgroundColor}}
            >
                <div className="px-[7rem]" style={{backgroundColor: colors.headerBackgroundColor === 'transparent' ? undefined : colors.headerBackgroundColor}}>
                    {headerImage && (
                        <div className="pt-8">
                            <img alt="Header" className={cn('h-auto w-full', imageCornerClass)} src={headerImage} />
                        </div>
                    )}

                    <PublicationHeader
                        backgroundColor="transparent"
                        fontFamily={titleFont}
                        showTitle={showPublicationTitle}
                        siteTitle={siteTitle}
                        textColor={colors.headerTextColor}
                    />
                </div>

                {children}

                <Footer color={colors.secondaryTextColor} emailFooter={emailFooter} footerLinkText={footerLinkText} showBadge={showBadge} siteTitle={siteTitle} textColor={colors.textColor} />
            </div>
        </div>
    );
};

export default EmailPreview;
