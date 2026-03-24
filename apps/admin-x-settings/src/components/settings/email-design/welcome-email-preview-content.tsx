import CoverImage from '../../../assets/images/user-cover.jpg';
import React from 'react';
import {cn} from '@tryghost/shade';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {resolveAllColors, resolveButtonCorners, resolveFontFamily, resolveImageCorners} from './design-utils';
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
            {/* Heading */}
            <div className="px-[7rem] pt-8">
                <h3
                    className={cn(
                        'mb-[13px] text-[2.6rem] leading-supertight',
                        settings.title_font_category === 'serif' && 'font-serif',
                        settings.title_font_category === 'sans_serif' && 'font-sans',
                        settings.title_font_weight === 'normal' && 'font-normal',
                        settings.title_font_weight === 'medium' && 'font-medium',
                        settings.title_font_weight === 'semibold' && 'font-semibold',
                        settings.title_font_weight === 'bold' && 'font-bold'
                    )}
                    style={{color: colors.textColor}}
                >
                    Thanks for subscribing
                </h3>
            </div>

            {/* Body content */}
            <div
                className={cn('px-[7rem] pb-4 leading-[27.2px]', bodyFontClasses)}
                style={{color: colors.textColor, fontFamily: bodyFont}}
            >
                <p className="mt-0 mb-6">
                    This is a preview of what your welcome email will look like when new members sign up to {siteTitle || 'your publication'}.
                </p>
                <p className="mt-0 mb-6">
                    You can customize the design using the settings on the right &ndash; from{' '}
                    <a
                        className={linkClasses}
                        href="#"
                        style={{color: colors.linkColor}}
                        onClick={e => e.preventDefault()}
                    >
                        colors and fonts
                    </a>{' '}
                    to buttons and images &ndash; to make it feel like part of your brand.
                </p>
                <hr className="my-[52px] border-0 border-t" style={{borderColor: colors.dividerColor}} />

                <p className="mt-0 mb-6">
                    The actual content of your welcome email can be edited separately. This preview is just here to help you get the design right.
                </p>

                {/* Image */}
                <div className="mb-6 h-[unset] w-full max-w-[600px] bg-cover bg-no-repeat">
                    <img alt="" className={cn('min-h-full min-w-full shrink-0', resolveImageCorners(settings.image_corners))} src={CoverImage} />
                </div>
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
                    Get started
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
