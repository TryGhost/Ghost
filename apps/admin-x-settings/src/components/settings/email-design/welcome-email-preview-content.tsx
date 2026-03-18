import React from 'react';
import {cn} from '@tryghost/shade';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {resolveAllColors} from './design-utils';
import {resolveButtonCorners, resolveFontFamily} from './email-preview';
import {useEmailDesign} from './email-design-context';
import {useGlobalData} from '../../providers/global-data-provider';

const WelcomeEmailPreviewContent: React.FC = () => {
    const {settings, accentColor} = useEmailDesign();
    const {settings: globalSettings} = useGlobalData();
    const [siteTitle] = getSettingValues<string>(globalSettings, ['title']);

    const colors = resolveAllColors(settings, accentColor);
    const bodyFont = resolveFontFamily(settings.body_font_category);
    const buttonCornerClass = resolveButtonCorners(settings.button_corners);
    const isOutline = settings.button_style === 'outline';

    const linkClasses = cn(
        'no-underline',
        settings.link_style === 'underline' && 'underline',
        settings.link_style === 'regular' && 'italic',
        settings.link_style === 'bold' && 'font-bold'
    );

    const bodyFontClasses = cn(
        settings.body_font_category === 'serif' ? 'font-serif text-[1.8rem]' : 'text-[1.7rem] tracking-tight'
    );

    return (
        <>
            {/* Divider */}
            <div className="px-[7rem] py-4">
                <hr className="m-0 border-0 border-t" style={{borderColor: colors.dividerColor}} />
            </div>

            {/* Body content */}
            <div
                className={cn('px-[7rem] pb-4 leading-[27.2px]', bodyFontClasses)}
                style={{color: colors.textColor, fontFamily: bodyFont}}
            >
                <p className="mb-6 mt-0">
                    Welcome to {siteTitle || 'our publication'}! We&#39;re glad you&#39;re here. This is a preview of how your welcome email will look with the current design settings.
                </p>
                <p className="mb-6 mt-0">
                    You can customize the{' '}
                    <a
                        className={linkClasses}
                        href="#"
                        style={{color: colors.linkColor}}
                        onClick={e => e.preventDefault()}
                    >
                        colors, fonts, and styles
                    </a>{' '}
                    to match your brand.
                </p>
            </div>

            {/* Button */}
            <div className="px-[7rem] pb-6">
                <a
                    className={cn(
                        'inline-block border px-[18px] py-2 font-sans text-[15px] no-underline',
                        buttonCornerClass,
                        isOutline ? 'bg-transparent' : 'border-transparent',
                        settings.link_style === 'bold' ? 'font-bold' : 'font-semibold'
                    )}
                    href="#"
                    style={
                        isOutline
                            ? {borderColor: colors.buttonColor, color: colors.buttonColor}
                            : {backgroundColor: colors.buttonColor, color: colors.buttonTextColor}
                    }
                    onClick={e => e.preventDefault()}
                >
                    Subscribe
                </a>
            </div>

            {/* Divider */}
            <div className="px-[7rem] py-4">
                <hr className="m-0 border-0 border-t" style={{borderColor: colors.dividerColor}} />
            </div>
        </>
    );
};

export default WelcomeEmailPreviewContent;
