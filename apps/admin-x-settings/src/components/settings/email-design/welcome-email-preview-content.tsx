import CoverImage from '../../../assets/images/email-design-user-image.jpg';
import React from 'react';
import {cn} from '@tryghost/shade/utils';
import {resolveAllColors, resolveButtonCorners, resolveFontFamily, resolveImageCorners} from './design-utils';
import {useEmailDesign} from './email-design-context';

const WelcomeEmailPreviewContent: React.FC = () => {
    const {settings, accentColor} = useEmailDesign();

    const colors = resolveAllColors(settings, accentColor);
    const bodyFont = resolveFontFamily(settings.body_font_category);
    const buttonCornerClass = resolveButtonCorners(settings.button_corners);
    const isOutline = settings.button_style === 'outline';

    const linkClasses = cn(
        'no-underline',
        settings.link_style === 'underline' && 'underline',
        settings.link_style === 'bold' && 'font-bold'
    );

    const titleFontClasses = cn(
        'mb-5 text-[2.6rem] tracking-tighter',
        settings.title_font_category === 'serif' && 'font-serif',
        settings.title_font_category === 'sans_serif' && 'font-sans',
        settings.title_font_weight === 'normal' && 'font-normal',
        settings.title_font_weight === 'medium' && 'font-medium',
        settings.title_font_weight === 'semibold' && 'font-semibold',
        settings.title_font_weight === 'bold' && 'font-bold'
    );

    const bodyFontClasses = cn(
        settings.body_font_category === 'serif' ? 'font-serif text-[1.8rem]' : 'text-[1.7rem]'
    );

    return (
        <div className='mx-auto w-full max-w-[600px] px-10 pt-16'>
            <h3
                className={titleFontClasses}
                style={{color: colors.sectionTitleColor}}
            >
                Your welcome email
            </h3>

            {/* Body content */}
            <div
                className={cn(bodyFontClasses)}
                style={{color: colors.textColor, fontFamily: bodyFont}}
            >
                <p className="mt-0 mb-6">
                    This is what your welcome email will look like when someone signs up to your site.
                </p>
                <p className="mt-0 mb-8">
                    Use the settings on the right to shape the design — from colors and typography to layout and buttons — so it feels like a natural extension of your brand.
                </p>

                {/* Image */}
                <div className={cn(
                    'h-[unset] w-full max-w-[600px] bg-cover bg-no-repeat'
                )}>
                    <img alt="Example cover image" className={cn(
                        'min-h-full min-w-full shrink-0',
                        resolveImageCorners(settings.image_corners)
                    )} src={CoverImage} />
                </div>
                <div className="mt-1 w-full max-w-[600px] pb-8 text-center text-body-sm" style={{color: colors.secondaryTextColor}}>Image caption</div>

                <p className="mt-0 mb-6">
                    Welcome emails set the tone for your relationship with new members. We’ve optimized this template to look great across devices and inboxes, so your first impression lands exactly how you want it.
                </p>
            </div>

            {/* Divider */}
            <div className="my-5 py-4">
                <hr className="m-0 border-0 border-t" style={{borderColor: colors.dividerColor}} />
            </div>

            <h3
                className={titleFontClasses}
                style={{color: colors.sectionTitleColor}}
            >
                Need inspiration?
            </h3>

            <div
                className={cn(bodyFontClasses)}
                style={{color: colors.textColor, fontFamily: bodyFont}}
            >
                <p className="mt-0 mb-6">
                    We’ve put together a <a className={linkClasses} href="https://ghost.org/help/email-design/" rel="noopener noreferrer" style={{color: colors.linkColor}} target="_blank">quick guide</a> that walks through all the available settings, along with a few examples of what’s possible.
                </p>
            </div>

            {/* Button */}
            <div className="pb-6">
                <a
                    className={cn(
                        'inline-block border px-[18px] py-2.5 font-sans text-[15px] no-underline',
                        buttonCornerClass,
                        isOutline ? 'bg-transparent' : 'border-transparent',
                        settings.link_style === 'bold' ? 'font-bold' : 'font-semibold'
                    )}
                    href="https://ghost.org/help/email-design/"
                    rel="noopener noreferrer"
                    style={
                        isOutline
                            ? {borderColor: colors.buttonColor, color: colors.buttonColor}
                            : {backgroundColor: colors.buttonColor, color: colors.buttonTextColor}
                    }
                    target="_blank"
                >
                    Learn more
                </a>
            </div>

            {/* Divider */}
            <div className="py-4">
                <hr className="m-0 border-0 border-t" style={{borderColor: colors.dividerColor}} />
            </div>
        </div>
    );
};

export default WelcomeEmailPreviewContent;
