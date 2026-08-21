import {
  type AutomatedEmailDesign,
  type EditAutomatedEmailDesign,
} from '@tryghost/admin-x-framework/api/automated-email-design';
import { DEFAULT_EMAIL_DESIGN, type EmailDesignSettings } from '@/settings/email-design/types';

export interface GeneralSettings {
  senderName: string;
  senderEmail: string;
  replyToEmail: string;
  headerImage: string;
  showPublicationIcon: boolean;
  showPublicationTitle: boolean;
  showBadge: boolean;
  emailFooter: string;
}

export interface WelcomeEmailCustomizeFormState {
  designSettings: EmailDesignSettings;
  generalSettings: GeneralSettings;
}

const WELCOME_EMAIL_DESIGN_FIELDS = new Set(Object.keys(DEFAULT_EMAIL_DESIGN));

const isWelcomeEmailDesignField = (key: string) => WELCOME_EMAIL_DESIGN_FIELDS.has(key);

/**
 * Maps API response fields to the frontend GeneralSettings shape.
 * Note: senderName, senderEmail and replyToEmail are not part of the design endpoint.
 *
 * @param {Pick<AutomatedEmailDesign, 'header_image' | 'show_header_icon' | 'show_header_title' | 'show_badge' | 'footer_content'>} apiData - Subset of design fields used for general settings
 * @param {GeneralSettings} defaults - Carries forward sender fields, which are not part of the design API
 * @returns {GeneralSettings} General settings populated from the API response
 */
export function mapApiToGeneralSettings(
  apiData: Pick<
    AutomatedEmailDesign,
    'header_image' | 'show_header_icon' | 'show_header_title' | 'show_badge' | 'footer_content'
  >,
  defaults: GeneralSettings,
): GeneralSettings {
  return {
    senderName: defaults.senderName,
    senderEmail: defaults.senderEmail,
    replyToEmail: defaults.replyToEmail,
    headerImage: apiData.header_image || '',
    showPublicationIcon: apiData.show_header_icon,
    showPublicationTitle: apiData.show_header_title,
    showBadge: apiData.show_badge,
    emailFooter: apiData.footer_content || '',
  };
}

/**
 * Maps API response fields to the frontend welcome-email design settings shape.
 *
 * @param {EmailDesignSettings} apiData - The persisted design fields from the API response
 * @returns {EmailDesignSettings} Design settings populated from the API response
 */
export function mapApiToDesignSettings(apiData: EmailDesignSettings): EmailDesignSettings {
  return Object.fromEntries(
    Object.entries(apiData).filter(([key]) => isWelcomeEmailDesignField(key)),
  ) as EmailDesignSettings;
}

export function buildAutomatedEmailDesignPayload(
  state: WelcomeEmailCustomizeFormState,
): EditAutomatedEmailDesign {
  const persistedDesign = Object.fromEntries(
    Object.entries(state.designSettings).filter(([key]) => isWelcomeEmailDesignField(key)),
  );

  return {
    ...persistedDesign,
    header_image: state.generalSettings.headerImage || null,
    show_header_icon: state.generalSettings.showPublicationIcon,
    show_header_title: state.generalSettings.showPublicationTitle,
    show_badge: state.generalSettings.showBadge,
    footer_content: state.generalSettings.emailFooter || null,
  };
}
