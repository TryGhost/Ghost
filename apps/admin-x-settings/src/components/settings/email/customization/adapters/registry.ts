import {type AnyEmailTypeAdapter, type EmailCustomizationType, type EmailTypeAdapterMap} from '../types';
import {automatedEmailAdapter} from './automated-email-adapter';
import {newsletterAdapter} from './newsletter-adapter';

const adaptersByType: EmailTypeAdapterMap = {
    newsletter: newsletterAdapter,
    automation: automatedEmailAdapter
};

export const isEmailCustomizationType = (type?: string): type is EmailCustomizationType => {
    return type === 'newsletter' || type === 'automation';
};

export function getEmailCustomizationAdapter(type: 'newsletter'): EmailTypeAdapterMap['newsletter'];
export function getEmailCustomizationAdapter(type: 'automation'): EmailTypeAdapterMap['automation'];
export function getEmailCustomizationAdapter(type?: string): AnyEmailTypeAdapter | undefined;
export function getEmailCustomizationAdapter(type?: string): AnyEmailTypeAdapter | undefined {
    if (!isEmailCustomizationType(type)) {
        return undefined;
    }

    return adaptersByType[type];
}
