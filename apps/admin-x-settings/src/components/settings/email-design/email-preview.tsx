import React from 'react';
import {cn} from '@tryghost/shade';
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
    emailFooter?: string;
}

// --- Helper functions ---

function resolveFontFamily(category: string | undefined) {
    return category === 'serif' ? 'Georgia, serif' : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
}

function resolveButtonCorners(corners: string | undefined): string {
    switch (corners) {
    case 'square': return 'rounded-none';
    case 'pill': return 'rounded-full';
    case 'rounded':
    default: return 'rounded-[5px]';
    }
}

// --- Sub-components ---

const EnvelopeHeader: React.FC<{senderName?: string; senderEmail?: string; subject?: string}> = ({senderName, senderEmail, subject}) => {
    if (!senderName && !senderEmail && !subject) {
        return null;
    }

    return (
        <div className="rounded-t-lg border border-b-0 border-gray-200 bg-white px-6 py-4 text-sm dark:border-gray-800 dark:bg-gray-950">
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

const Divider: React.FC<{color: string; dividerStyle?: string}> = ({color, dividerStyle = 'solid'}) => (
    <div className="px-12 py-4">
        <hr
            className="m-0 border-0 border-t"
            style={{borderColor: color, borderStyle: dividerStyle}}
        />
    </div>
);

const BodyContent: React.FC<{
    siteTitle?: string;
    textColor: string;
    fontFamily: string;
    linkColor: string;
    linkUnderline: boolean;
    linkBold: boolean;
}> = ({siteTitle, textColor, fontFamily, linkColor, linkUnderline, linkBold}) => (
    <div
        className="px-12 pb-4 text-base leading-relaxed"
        style={{color: textColor, fontFamily}}
    >
        <p className="mb-[1.2em] mt-0">
            Welcome to {siteTitle || 'our publication'}! We&#39;re glad you&#39;re here. This is a preview of how your welcome email will look with the current design settings.
        </p>
        <p className="mb-[1.2em] mt-0">
            You can customize the <a
                className={cn('no-underline', linkUnderline && 'underline', linkBold && 'font-bold')}
                href="#"
                style={{color: linkColor}}
                onClick={e => e.preventDefault()}
            >
                colors, fonts, and styles
            </a> to match your brand.
        </p>
    </div>
);

const ActionButton: React.FC<{
    buttonStyle?: string;
    buttonColor: string;
    buttonTextColor: string;
    cornerClass: string;
}> = ({buttonStyle, buttonColor, buttonTextColor, cornerClass}) => {
    const isOutline = buttonStyle === 'outline';

    return (
        <div className="px-12 pb-6">
            <a
                className={cn('inline-block px-5 py-2 text-center text-sm font-bold no-underline', cornerClass, isOutline && 'border')}
                href="#"
                style={{
                    color: isOutline ? buttonColor : buttonTextColor,
                    backgroundColor: isOutline ? undefined : buttonColor,
                    borderColor: isOutline ? buttonColor : undefined
                }}
                onClick={e => e.preventDefault()}
            >
                Subscribe
            </a>
        </div>
    );
};

const Footer: React.FC<{siteTitle?: string; emailFooter?: string; color: string}> = ({siteTitle, emailFooter, color}) => (
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
            {siteTitle || 'Your publication'} &mdash; Unsubscribe
        </p>
    </div>
);

// --- Main component ---

const EmailPreview: React.FC<EmailPreviewProps> = ({settings, senderName, senderEmail, subject, headerImage, showPublicationTitle = true, emailFooter}) => {
    const {settings: globalSettings, siteData} = useGlobalData();
    const [siteTitle] = getSettingValues<string>(globalSettings, ['title']);
    const accentColor = siteData.accent_color;

    const colors = resolveAllColors(settings, accentColor);
    const titleFont = resolveFontFamily(settings.title_font_category);
    const bodyFont = resolveFontFamily(settings.body_font_category);
    const buttonCornerClass = resolveButtonCorners(settings.button_corners);

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
                        <img alt="Header" className="h-auto w-full" src={headerImage} />
                    </div>
                )}

                <PublicationHeader
                    backgroundColor={colors.headerBackgroundColor}
                    fontFamily={titleFont}
                    showTitle={showPublicationTitle}
                    siteTitle={siteTitle}
                    textColor={colors.headerTextColor}
                />

                <Divider color={colors.dividerColor} dividerStyle={settings.divider_style} />

                <BodyContent
                    fontFamily={bodyFont}
                    linkBold={settings.link_style === 'bold'}
                    linkColor={colors.linkColor}
                    linkUnderline={settings.link_style === 'underline'}
                    siteTitle={siteTitle}
                    textColor={colors.textColor}
                />

                <ActionButton
                    buttonColor={colors.buttonColor}
                    buttonStyle={settings.button_style}
                    buttonTextColor={colors.buttonTextColor}
                    cornerClass={buttonCornerClass}
                />

                <Divider color={colors.dividerColor} dividerStyle={settings.divider_style} />

                <Footer color={colors.secondaryTextColor} emailFooter={emailFooter} siteTitle={siteTitle} />
            </div>
        </div>
    );
};

export default EmailPreview;
