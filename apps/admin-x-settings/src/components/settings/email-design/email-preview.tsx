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
    showPublicationIcon?: boolean;
    showPublicationTitle?: boolean;
    emailFooter?: string;
}

const EmailPreview: React.FC<EmailPreviewProps> = ({settings, senderName, senderEmail, subject, headerImage, showPublicationIcon = true, showPublicationTitle = true, emailFooter}) => {
    const {settings: globalSettings, siteData} = useGlobalData();
    const [siteTitle, siteIcon] = getSettingValues<string>(globalSettings, ['title', 'icon']);
    const accentColor = siteData.accent_color;

    const colors = resolveAllColors(settings, accentColor);
    const titleFont = settings.title_font_category === 'serif' ? 'Georgia, serif' : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const bodyFont = settings.body_font_category === 'serif' ? 'Georgia, serif' : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    const titleFontWeight = (() => {
        switch (settings.title_font_weight) {
        case 'normal': return 400;
        case 'medium': return 500;
        case 'semibold': return 600;
        case 'bold':
        default: return 700;
        }
    })();

    const buttonBorderRadius = (() => {
        switch (settings.button_corners) {
        case 'square': return '0px';
        case 'pill': return '9999px';
        case 'rounded':
        default: return '5px';
        }
    })();

    const linkTextDecoration = settings.link_style === 'underline' ? 'underline' : 'none';
    const linkFontWeight = settings.link_style === 'bold' ? 700 : 400;

    return (
        <div className="mx-auto w-full max-w-[600px]">
            {/* Email envelope header */}
            {(senderName || senderEmail || subject) && (
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
            )}

            {/* Email container */}
            <div
                className={cn('w-full overflow-hidden border border-gray-200 dark:border-gray-800', (senderName || senderEmail || subject) ? 'rounded-b-lg' : 'rounded-lg')}
                style={{backgroundColor: colors.backgroundColor}}
            >
                {/* Header image */}
                {headerImage && (
                    <div className="px-12 pt-8">
                        <img
                            alt="Header"
                            className="h-auto w-full"
                            src={headerImage}
                        />
                    </div>
                )}

                {/* Header */}
                {(showPublicationIcon || showPublicationTitle) && (
                    <div
                        className="px-12 pb-4 pt-10 text-center"
                        style={{backgroundColor: colors.headerBackgroundColor === 'transparent' ? undefined : colors.headerBackgroundColor}}
                    >
                        {showPublicationIcon && siteIcon && (
                            <img
                                alt=""
                                className="mx-auto mb-3 size-10 rounded-full"
                                src={siteIcon}
                            />
                        )}
                        {showPublicationTitle && siteTitle && (
                            <h4
                                className="text-sm font-semibold uppercase tracking-wide"
                                style={{
                                    color: colors.headerTextColor,
                                    fontFamily: titleFont
                                }}
                            >
                                {siteTitle}
                            </h4>
                        )}
                    </div>
                )}

                {/* Divider */}
                <div className="px-12 py-4">
                    <hr
                        style={{
                            border: 'none',
                            borderTop: `1px ${settings.divider_style || 'solid'} ${colors.dividerColor}`,
                            margin: 0
                        }}
                    />
                </div>

                {/* Body content */}
                <div
                    className="px-12 pb-4"
                    style={{
                        color: colors.textColor,
                        fontFamily: bodyFont,
                        fontSize: '16px',
                        lineHeight: '1.6'
                    }}
                >
                    <p style={{margin: '0 0 1.2em'}}>
                        Welcome to {siteTitle || 'our publication'}! We&#39;re glad you&#39;re here. This is a preview of how your welcome email will look with the current design settings.
                    </p>
                    <p style={{margin: '0 0 1.2em'}}>
                        You can customize the <a
                            href="#"
                            style={{
                                color: colors.linkColor,
                                textDecoration: linkTextDecoration,
                                fontWeight: linkFontWeight
                            }}
                            onClick={e => e.preventDefault()}
                        >
                            colors, fonts, and styles
                        </a> to match your brand.
                    </p>
                </div>

                {/* Button */}
                <div className="px-12 pb-6">
                    {settings.button_style === 'outline' ? (
                        <a
                            className={cn('inline-block px-5 py-2 text-center text-sm font-bold')}
                            href="#"
                            style={{
                                color: colors.buttonColor,
                                border: `1px solid ${colors.buttonColor}`,
                                borderRadius: buttonBorderRadius,
                                textDecoration: 'none'
                            }}
                            onClick={e => e.preventDefault()}
                        >
                            Subscribe
                        </a>
                    ) : (
                        <a
                            className={cn('inline-block px-5 py-2 text-center text-sm font-bold')}
                            href="#"
                            style={{
                                color: colors.buttonTextColor,
                                backgroundColor: colors.buttonColor,
                                borderRadius: buttonBorderRadius,
                                textDecoration: 'none'
                            }}
                            onClick={e => e.preventDefault()}
                        >
                            Subscribe
                        </a>
                    )}
                </div>

                {/* Footer divider */}
                <div className="px-12 pb-4">
                    <hr
                        style={{
                            border: 'none',
                            borderTop: `1px ${settings.divider_style || 'solid'} ${colors.dividerColor}`,
                            margin: 0
                        }}
                    />
                </div>

                {/* Footer */}
                <div
                    className="px-12 pb-10 text-center text-xs"
                    style={{color: colors.secondaryTextColor}}
                >
                    {emailFooter && (
                        <p style={{margin: '0 0 0.5em', whiteSpace: 'pre-line'}}>
                            {emailFooter}
                        </p>
                    )}
                    <p style={{margin: '0 0 0.5em'}}>
                        {siteTitle || 'Your publication'} &mdash; Unsubscribe
                    </p>
                </div>
            </div>
        </div>
    );
};

export default EmailPreview;
