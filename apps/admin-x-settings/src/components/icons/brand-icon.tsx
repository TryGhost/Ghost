import Beehiiv from '../../assets/images/brand-icons/beehiiv.svg';
import Facebook from '../../assets/images/brand-icons/facebook.svg';
import FirstPromoter from '../../assets/images/brand-icons/firstpromoter.svg';
import Linkedin from '../../assets/images/brand-icons/linkedin.svg';
import Mailchimp from '../../assets/images/brand-icons/mailchimp.svg';
import Medium from '../../assets/images/brand-icons/medium.svg';
import Pintura from '../../assets/images/brand-icons/pintura.svg';
import PortalIcon1 from '../../assets/images/brand-icons/portal-icon-1.svg';
import PortalIcon2 from '../../assets/images/brand-icons/portal-icon-2.svg';
import PortalIcon3 from '../../assets/images/brand-icons/portal-icon-3.svg';
import PortalIcon4 from '../../assets/images/brand-icons/portal-icon-4.svg';
import PortalIcon5 from '../../assets/images/brand-icons/portal-icon-5.svg';
import React from 'react';
import Slack from '../../assets/images/brand-icons/slack.svg';
import Squarespace from '../../assets/images/brand-icons/squarespace.svg';
import Substack from '../../assets/images/brand-icons/substack.svg';
import Transistor from '../../assets/images/brand-icons/transistor.svg';
import TwitterX from '../../assets/images/brand-icons/twitter-x.svg';
import Unsplash from '../../assets/images/brand-icons/unsplash.svg';
import Wordpress from '../../assets/images/brand-icons/wordpress.svg';
import Zapier from '../../assets/images/brand-icons/zapier.svg';
import clsx from 'clsx';

const icons = {
    beehiiv: {src: Beehiiv},
    facebook: {src: Facebook, monochrome: true},
    firstpromoter: {src: FirstPromoter},
    linkedin: {src: Linkedin, monochrome: true},
    mailchimp: {src: Mailchimp},
    medium: {src: Medium},
    pintura: {src: Pintura},
    'portal-icon-1': {src: PortalIcon1, monochrome: true},
    'portal-icon-2': {src: PortalIcon2, monochrome: true},
    'portal-icon-3': {src: PortalIcon3, monochrome: true},
    'portal-icon-4': {src: PortalIcon4, monochrome: true},
    'portal-icon-5': {src: PortalIcon5, monochrome: true},
    slack: {src: Slack},
    squarespace: {src: Squarespace},
    substack: {src: Substack},
    transistor: {src: Transistor, monochrome: true},
    'twitter-x': {src: TwitterX, monochrome: true},
    unsplash: {src: Unsplash, monochrome: true},
    wordpress: {src: Wordpress},
    zapier: {src: Zapier}
} as const;

export type BrandIconName = keyof typeof icons;

export interface BrandIconProps {
    className?: string;
    name: BrandIconName;
    size?: number;
    style?: React.CSSProperties;
}

const BrandIcon: React.FC<BrandIconProps> = ({name, size, className, style}) => {
    const icon = icons[name];
    const sizeStyle = size ? {width: size, height: size, ...style} : style;

    if ('monochrome' in icon) {
        const mask = `url("${icon.src}") center / contain no-repeat`;

        return (
            <span
                aria-hidden='true'
                className={clsx('pointer-events-none inline-block shrink-0 bg-current', className)}
                style={{
                    WebkitMask: mask,
                    mask,
                    ...sizeStyle
                }}
            />
        );
    }

    return <img alt='' className={clsx('pointer-events-none', className)} src={icon.src} style={sizeStyle} />;
};

export default BrandIcon;
