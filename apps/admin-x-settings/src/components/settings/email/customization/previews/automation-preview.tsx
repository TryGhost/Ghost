import HeaderBrandingBlock from './shared/header-branding-block';
import clsx from 'clsx';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {isManagedEmail} from '@tryghost/admin-x-framework/api/config';
import {resolveAutomationPreviewColors} from '../design/helpers';
import {resolveAutomationSenderInfo} from '../sender/helpers';
import {textColorForBackgroundColor} from '@tryghost/color-utils';
import {useActiveNewsletterSenderDefaults} from '@tryghost/admin-x-framework/api/newsletters';
import {useGlobalData} from '@src/components/providers/global-data-provider';
import type {AutomationEmailPreviewModel} from '../types';

type AutomationPreviewProps = {
    model: AutomationEmailPreviewModel;
};

const titleWeightClass = (weight: AutomationEmailPreviewModel['title_font_weight']) => {
    if (weight === 'normal') {
        return 'font-normal';
    }

    if (weight === 'medium') {
        return 'font-medium';
    }

    if (weight === 'semibold') {
        return 'font-semibold';
    }

    return 'font-bold';
};

const AutomationPreview: React.FC<AutomationPreviewProps> = ({model}) => {
    const {config, settings, siteData} = useGlobalData();
    const [title, defaultEmailAddress, supportEmailAddress] = getSettingValues<string>(settings, ['title', 'default_email_address', 'support_email_address']);
    const {data: fallbackNewsletter} = useActiveNewsletterSenderDefaults();
    const accentColor = siteData.accent_color;

    let emailHeader;
    const senderName = model.sender_name || title;
    const {renderedReplyTo, renderedSenderEmail} = resolveAutomationSenderInfo({
        sender: {
            sender_email: model.sender_email,
            sender_reply_to: model.sender_reply_to
        },
        fallbackNewsletter,
        context: {
            config,
            defaultEmailAddress,
            supportEmailAddress
        }
    });
    const colors = resolveAutomationPreviewColors({
        accentColor,
        backgroundColorValue: model.background_color,
        headerBackgroundColorValue: model.header_background_color,
        sectionTitleColorValue: model.section_title_color,
        buttonColorValue: model.button_color,
        linkColorValue: model.link_color,
        dividerColorValue: model.divider_color
    });
    const buttonTextColor = textColorForBackgroundColor(colors.buttonColor).hex();
    const titleFontClass = model.title_font_category === 'serif' ? 'font-serif' : 'font-sans';
    const bodyFontClass = model.body_font_category === 'serif' ? 'font-serif text-[1.8rem]' : 'text-[1.7rem] tracking-tight';
    const imageCornersClass = model.image_corners === 'rounded' ? 'rounded-md' : 'rounded-none';
    const processedFooterContent = model.footer_content ? model.footer_content.replace(/<a/g, '<a target="_blank" rel="noopener noreferrer"') : '';

    if (isManagedEmail(config)) {
        emailHeader = <><p className="leading-normal"><span className="text-grey-900 font-semibold">From: </span><span>{senderName} ({renderedSenderEmail})</span></p>
            <p className="leading-normal">
                <span className="text-grey-900 font-semibold">Reply-to: </span>{renderedReplyTo ? renderedReplyTo : renderedSenderEmail}
            </p>
        </>;
    } else {
        emailHeader = <><p className="leading-normal"><span className="text-grey-900 font-semibold">{senderName}</span><span> {renderedSenderEmail}</span></p>
            <p className="leading-normal"><span className="text-grey-900 font-semibold">To:</span> Jamie Larson jamie@example.com</p></>;
    }

    return (
        <div className="relative flex grow flex-col">
            <div className="absolute inset-0 m-5 flex items-center justify-center">
                <div className="mx-auto my-0 flex max-h-full w-full max-w-[700px] flex-col overflow-hidden rounded-[4px] text-black shadow-sm">
                    <div className="flex-column border-grey-200 text-grey-700 flex min-h-[77px] justify-center rounded-t-sm border-b bg-white px-6 text-sm">
                        {emailHeader}
                    </div>

                    <div className="overflow-y-auto text-sm" style={{backgroundColor: colors.backgroundColor}}>
                        <div className='px-[7rem]' data-testid='automation-preview-header-region' style={{backgroundColor: colors.headerBackgroundColor}}>
                            <HeaderBrandingBlock
                                alignment='center'
                                headerImage={model.header_image}
                                headerImageClassName={clsx('mb-4 block pt-6', imageCornersClass)}
                                headerTitle={model.show_header_title ? title : null}
                                subtitleColor={colors.secondaryHeaderTextColor}
                                testIds={{
                                    image: 'automation-preview-header-image',
                                    title: 'automation-preview-publication-title'
                                }}
                                titleColor={colors.headerTextColor}
                            />
                        </div>
                        <div className='px-[7rem] pt-8'>
                            <div
                                className={clsx(
                                    'max-w-[600px] border-b pb-[52px] pt-0 leading-[27.2px] text-black',
                                    bodyFontClass
                                )}
                                style={{borderColor: colors.dividerColor}}
                            >
                                <h1
                                    className={clsx('leading-supertight mb-6 text-4xl', titleFontClass, titleWeightClass(model.title_font_weight))}
                                    style={{color: colors.headingColor}}
                                >
                                    Welcome email
                                </h1>
                                <p className="mb-6" style={{color: colors.textColor}}>
                                    This is for welcome emails right now.
                                </p>
                                <p className="mb-6" style={{color: colors.textColor}}>
                                    These customizations will apply to both free and paid welcome emails, if paid welcome emails are enabled.
                                </p>
                                <p className="mb-[52px]" style={{color: colors.textColor}}>
                                    Edit the actual email content in the welcome email editor.
                                </p>
                                <hr className={clsx('my-[52px]')} style={{borderColor: colors.dividerColor}} />
                                <h2
                                    className={clsx('leading-supertight mb-[13px] text-[2.6rem]', titleFontClass, titleWeightClass(model.title_font_weight))}
                                    style={{color: colors.headingColor}}
                                >
                                    Need inspiration?
                                </h2>
                                <p className="mb-[27px]" style={{color: colors.textColor}}>
                                    We&apos;ve put together a{' '}
                                    <a
                                        className={clsx(
                                            model.link_style === 'underline' && 'underline',
                                            model.link_style === 'bold' && 'font-bold'
                                        )}
                                        href='https://ghost.org/help/email-design/'
                                        rel='noreferrer noopener'
                                        style={{color: colors.linkColor}}
                                        target='_blank'
                                    >
                                        quick guide
                                    </a>{' '}
                                    that walks through all of the available settings.
                                </p>
                                <a
                                    className={clsx(
                                        'inline-block border px-[18px] py-2 font-sans text-[15px]',
                                        model.button_corners === 'rounded' && 'rounded-[6px]',
                                        model.button_corners === 'pill' && 'rounded-full',
                                        model.button_corners === 'square' && 'rounded-none',
                                        model.button_style === 'outline' ? 'bg-transparent' : 'border-transparent',
                                        model.link_style === 'bold' ? 'font-bold' : 'font-semibold'
                                    )}
                                    href='https://ghost.org/help/email-design/'
                                    rel='noreferrer noopener'
                                    style={model.button_style === 'outline' ? {
                                        borderColor: colors.buttonColor,
                                        color: colors.buttonColor
                                    } : {
                                        backgroundColor: colors.buttonColor,
                                        color: buttonTextColor
                                    }}
                                    target='_blank'
                                >
                                    Learn more
                                </a>
                                {processedFooterContent && (
                                    <div
                                        className='mt-[52px] border-t pt-8 text-[1.4rem] leading-relaxed'
                                        data-testid='automation-preview-footer'
                                        style={{borderColor: colors.dividerColor, color: colors.secondaryTextColor}}
                                    >
                                        <div dangerouslySetInnerHTML={{__html: processedFooterContent}} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AutomationPreview;
