import React from 'react';
import {cn} from '@tryghost/shade';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {resolveAllColors} from './design-utils';
import {useGlobalData} from '../../providers/global-data-provider';
import type {EmailDesignSettings} from './types';

interface EmailPreviewProps {
    settings: EmailDesignSettings;
}

const EmailPreview: React.FC<EmailPreviewProps> = ({settings}) => {
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
            {/* Email container */}
            <div
                className="w-full overflow-hidden rounded-lg shadow-sm"
                style={{backgroundColor: colors.backgroundColor}}
            >
                {/* Header */}
                <div
                    className="px-12 pb-4 pt-10 text-center"
                    style={{backgroundColor: colors.headerBackgroundColor === 'transparent' ? undefined : colors.headerBackgroundColor}}
                >
                    {siteIcon && (
                        <img
                            alt=""
                            className="mx-auto mb-3 size-10 rounded-full"
                            src={siteIcon}
                        />
                    )}
                    {siteTitle && (
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

                {/* Title */}
                <div className="px-12 pb-2 pt-4">
                    <h1
                        style={{
                            color: colors.postTitleColor,
                            fontFamily: titleFont,
                            fontWeight: titleFontWeight,
                            fontSize: '26px',
                            lineHeight: '1.3',
                            margin: 0
                        }}
                    >
                        Your welcome email title
                    </h1>
                </div>

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
                    <p style={{margin: '0 0 0.5em'}}>
                        {siteTitle || 'Your publication'} &mdash; Unsubscribe
                    </p>
                </div>
            </div>
        </div>
    );
};

export default EmailPreview;
